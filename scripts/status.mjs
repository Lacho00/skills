#!/usr/bin/env node
// Lists which local projects have skills from this repository that are behind
// main, and which still carry skills installed from other sources. Skills from
// other sources are split by CATALOG.md: an allowed exception, a refused skill
// to remove, or one still to migrate here.
//
//   npm run status [-- <projects-dir>] [--ref <git-ref>] [--json]
//
// <projects-dir> defaults to the folder that contains this repository's main
// clone; every
// direct subfolder with a skills-lock.json is a project. Skills are compared by
// the `computedHash` that the skills CLI writes into skills-lock.json against
// the same hash of skills/<name> at <ref> (default origin/main). A project
// catches up with `npx skills update` run inside it.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFolder } from './lib/hash.mjs';

const OWN_SOURCE = /^(?:https:\/\/github\.com\/)?lacho00\/skills(?:\.git)?\/?$/i;

export const isOwnSource = (source) => typeof source === 'string' && OWN_SOURCE.test(source.trim());

// Skill names in the first column of the tables under CATALOG.md's
// "## Exceptions" and "## Refused" headings. Returns { <skill>: 'exception' | 'refused' }.
export function catalogDecisions(text) {
  const decisions = {};
  let kind = null;
  for (const line of String(text ?? '').split('\n')) {
    const heading = /^##\s+(.*)$/.exec(line);
    if (heading) {
      kind = /^exceptions\b/i.test(heading[1]) ? 'exception' : /^refused\b/i.test(heading[1]) ? 'refused' : null;
      continue;
    }
    if (!kind || !line.startsWith('|')) continue;
    const first = line.split('|')[1] ?? '';
    for (const [, name] of first.matchAll(/`([^`]+)`/g)) decisions[name] = kind;
  }
  return decisions;
}

// lock: parsed skills-lock.json. repoHashes: { <skill>: hash } at the reference ref.
// decisions: catalogDecisions() of CATALOG.md at that ref.
// Returns [{ skill, state }] with state current | behind | not-in-repo |
// exception | refused | external.
export function projectStatus(lock, repoHashes, decisions = {}) {
  const skills = lock && typeof lock.skills === 'object' && lock.skills ? lock.skills : {};
  return Object.entries(skills).map(([skill, entry]) => {
    if (!isOwnSource(entry?.source)) {
      const state = Object.hasOwn(decisions, skill) ? decisions[skill] : 'external';
      return { skill, state, source: entry?.source ?? '' };
    }
    if (!(skill in repoHashes)) return { skill, state: 'not-in-repo' };
    return { skill, state: entry.computedHash === repoHashes[skill] ? 'current' : 'behind' };
  });
}

// Hashes of every skills/<name> folder at `ref`, read with git archive so the
// working tree and its branch do not matter.
export function repoHashesAt(rootDir, ref) {
  const dir = mkdtempSync(join(tmpdir(), 'skills-status-'));
  try {
    const tar = execFileSync('git', ['-C', rootDir, 'archive', '--format=tar', ref, '--', 'skills'], { maxBuffer: 1 << 28 });
    execFileSync('tar', ['-x', '-C', dir], { input: tar });
    const skillsDir = join(dir, 'skills');
    if (!existsSync(skillsDir)) return {};
    const names = readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory());
    return Object.fromEntries(names.map((n) => [n, hashFolder(join(skillsDir, n))]));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function catalogAt(rootDir, ref) {
  try {
    return execFileSync('git', ['-C', rootDir, 'show', `${ref}:CATALOG.md`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    console.error(`warning: no CATALOG.md at ${ref}; every skill from another source counts as to migrate`);
    return '';
  }
}

export function findProjects(projectsDir, skip) {
  return readdirSync(projectsDir)
    .map((name) => join(projectsDir, name))
    .filter((dir) => resolve(dir) !== resolve(skip) && existsSync(join(dir, 'skills-lock.json')))
    .sort();
}

function parseArgs(argv) {
  const opts = { dir: null, ref: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--ref') {
      opts.ref = argv[++i];
      if (!opts.ref || opts.ref.startsWith('-')) throw new Error('--ref needs a value');
    }
    else if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
    else opts.dir = a;
  }
  return opts;
}

function defaultRef(rootDir) {
  try {
    execFileSync('git', ['-C', rootDir, 'fetch', '--quiet', 'origin', 'main'], { stdio: 'ignore', timeout: 30_000 });
  } catch {
    console.error('warning: could not fetch origin/main; comparing with the last fetched copy');
  }
  try {
    execFileSync('git', ['-C', rootDir, 'rev-parse', '--verify', '--quiet', 'origin/main'], { stdio: 'ignore' });
    return 'origin/main';
  } catch {
    return 'main';
  }
}

function main(argv) {
  const opts = parseArgs(argv);
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  // The main clone's parent, also when run from a linked worktree.
  const mainClone = dirname(execFileSync('git', ['-C', rootDir, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim());
  const projectsDir = resolve(opts.dir ?? dirname(mainClone));
  const ref = opts.ref ?? defaultRef(rootDir);
  const hashes = repoHashesAt(rootDir, ref);
  const decisions = catalogDecisions(catalogAt(rootDir, ref));

  const report = findProjects(projectsDir, mainClone).map((dir) => {
    let lock;
    try {
      lock = JSON.parse(readFileSync(join(dir, 'skills-lock.json'), 'utf8'));
    } catch (err) {
      return { project: basename(dir), error: `unreadable skills-lock.json: ${err.message}`, skills: [] };
    }
    return { project: basename(dir), skills: projectStatus(lock, hashes, decisions) };
  });

  if (opts.json) {
    console.log(JSON.stringify({ ref, projects: report }, null, 2));
    return 0;
  }
  const count = (state) => report.reduce((n, p) => n + p.skills.filter((s) => s.state === state).length, 0);
  console.log(`Compared with Lacho00/skills ${ref}, ${report.length} projects in ${projectsDir}\n`);
  for (const p of report) {
    if (p.error) {
      console.log(`${p.project}: ${p.error}`);
      continue;
    }
    const by = (state) => p.skills.filter((s) => s.state === state).map((s) => s.skill);
    const behind = by('behind');
    const missing = by('not-in-repo');
    const external = by('external');
    const refused = by('refused');
    const exceptions = by('exception');
    if (!behind.length && !missing.length && !external.length && !refused.length && !exceptions.length) continue;
    console.log(p.project);
    if (behind.length) console.log(`  behind main (run npx skills update): ${behind.join(', ')}`);
    if (missing.length) console.log(`  no longer in Lacho00/skills: ${missing.join(', ')}`);
    if (refused.length) console.log(`  refused in CATALOG.md (remove): ${refused.join(', ')}`);
    if (external.length) console.log(`  installed from other sources (migrate): ${external.join(', ')}`);
    if (exceptions.length) console.log(`  CATALOG.md exceptions (read the upstream diff before updating): ${exceptions.length}`);
  }
  console.log(`\n${count('current')} current, ${count('behind')} behind, ${count('not-in-repo')} not in repo, ` +
    `${count('refused')} refused, ${count('external')} to migrate, ${count('exception')} exceptions`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
}
