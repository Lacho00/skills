#!/usr/bin/env node
// Copies third-party skills into skills/<name>/ and keeps vendor.json in step.
// Run by hand or by the weekly workflow, never at install time: projects only
// ever install from Lacho00/skills.
//
//   node scripts/vendor.mjs --add <owner/repo> <path-in-repo> [--name <name>]
//   node scripts/vendor.mjs --check [--json] [--source <owner/repo>] [name...]
//   node scripts/vendor.mjs --update [--source <owner/repo>] [name...]
//   node scripts/vendor.mjs --notice
//
// --check compares each vendored commit with the last upstream commit that
// touched the skill's path. --update copies that commit, refusing sources whose
// licence is missing or not redistributable (the old copy is kept). Entries
// marked "modified": true are reported but never overwritten.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFolder } from './lib/hash.mjs';
import { ALLOWED_LICENSES, LICENSE_FILES, identifyLicense } from './lib/license.mjs';
import { KEBAB, readManifest, validateEntry, writeManifest } from './lib/manifest.mjs';
import { renderNotice } from './lib/notice.mjs';
import { findInstallCommands } from './lib/policy.mjs';

const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// One partial clone per source per run. VENDOR_GIT_BASE lets tests point at local repos.
export class Upstream {
  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), 'vendor-'));
    this.clones = new Map();
  }
  repo(source) {
    if (!this.clones.has(source)) {
      const base = process.env.VENDOR_GIT_BASE ?? 'https://github.com';
      const dest = join(this.dir, source.replace('/', '__'));
      execFileSync('git', ['clone', '--quiet', '--filter=blob:none', '--no-checkout', `${base}/${source}.git`, dest], {
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      this.clones.set(source, dest);
    }
    return this.clones.get(source);
  }
  latest(source, path) {
    const repo = this.repo(source);
    const sha = git(repo, 'ls-tree', 'HEAD', '--', path).trim() && git(repo, 'log', '-1', '--format=%H', 'HEAD', '--', path).trim();
    if (!sha) throw new Error(`${source}: path "${path}" not found on the default branch`);
    return sha;
  }
  close() {
    rmSync(this.dir, { recursive: true, force: true });
  }
}

function lsTree(repo, commit, path) {
  const out = git(repo, 'ls-tree', '-r', '-z', commit, '--', path);
  return out.split('\0').filter(Boolean).map((line) => {
    const [meta, file] = line.split('\t');
    return { mode: meta.split(' ')[0], file };
  });
}

// Licence for a skill: a licence file inside the skill folder wins, else the repo root's.
function findUpstreamLicense(repo, commit, path) {
  for (const dir of [path, '']) {
    for (const name of LICENSE_FILES) {
      const file = dir ? `${dir}/${name}` : name;
      try {
        return { file, name, text: git(repo, 'show', `${commit}:${file}`) };
      } catch {
        // not there, try the next name
      }
    }
  }
  return null;
}

// Builds the copy in a staging folder, checks it, then swaps it into skills/<name>.
function copySkill(rootDir, up, name, entry, commit) {
  const repo = up.repo(entry.source);
  const files = lsTree(repo, commit, entry.path);
  if (!files.length) throw new Error(`${name}: ${entry.source}@${commit.slice(0, 7)} has no files under ${entry.path}`);
  const links = files.filter((f) => f.mode === '120000' || f.mode === '160000');
  if (links.length) throw new Error(`${name}: upstream contains symlinks or submodules (${links[0].file}); refusing to vendor`);
  if (!files.some((f) => f.file === `${entry.path}/SKILL.md`)) throw new Error(`${name}: ${entry.path}/SKILL.md not found upstream`);

  const lic = findUpstreamLicense(repo, commit, entry.path);
  if (!lic) throw new Error(`${name}: ${entry.source}@${commit.slice(0, 7)} has no licence file; not vendoring`);
  const spdx = identifyLicense(lic.text);
  if (!spdx)
    throw new Error(`${name}: licence ${lic.file} of ${entry.source}@${commit.slice(0, 7)} is not one of ${ALLOWED_LICENSES.join(', ')}; old copy kept`);

  git(repo, 'checkout', '--quiet', commit, '--', entry.path);
  const stage = join(up.dir, `stage-${name}`);
  rmSync(stage, { recursive: true, force: true });
  cpSync(join(repo, entry.path), stage, { recursive: true });
  if (!existsSync(join(stage, lic.name))) writeFileSync(join(stage, lic.name), lic.text);

  for (const f of files) {
    const rel = f.file.slice(entry.path.length + 1);
    const text = readFileSync(join(stage, rel));
    if (text.includes(0)) continue;
    const hits = findInstallCommands(text.toString('utf8'));
    if (hits.length) throw new Error(`${name}: upstream ${rel}:${hits[0].line} contains an install command (${hits[0].why}): ${hits[0].match}`);
  }

  const dest = join(rootDir, 'skills', name);
  rmSync(dest, { recursive: true, force: true });
  cpSync(stage, dest, { recursive: true });
  return { ...entry, commit, license: spdx, licenseFrom: lic.file, hash: hashFolder(dest), modified: false };
}

function select(manifest, { names, source }) {
  const all = Object.keys(manifest.skills);
  for (const n of names) if (!manifest.skills[n]) throw new Error(`${n}: not in vendor.json`);
  return (names.length ? names : all).filter((n) => !source || manifest.skills[n].source === source);
}

function saveNotice(rootDir, manifest) {
  const file = join(rootDir, 'NOTICE');
  const current = existsSync(file) ? readFileSync(file, 'utf8') : '';
  writeFileSync(file, renderNotice(current, manifest));
}

export function check(rootDir, up, opts) {
  const manifest = readManifest(rootDir);
  return select(manifest, opts).map((name) => {
    const e = manifest.skills[name];
    const row = { name, source: e.source, path: e.path, commit: e.commit, latest: null };
    try {
      row.latest = up.latest(e.source, e.path);
    } catch (err) {
      return { ...row, status: 'error', error: err.message };
    }
    const behind = row.latest !== e.commit;
    if (e.modified) return { ...row, status: behind ? 'modified-behind' : 'modified' };
    return { ...row, status: behind ? 'behind' : 'current' };
  });
}

export function update(rootDir, up, opts) {
  const manifest = readManifest(rootDir);
  const results = [];
  for (const name of select(manifest, opts)) {
    const e = manifest.skills[name];
    if (e.modified) {
      results.push({ name, status: 'skipped-modified' });
      continue;
    }
    // One refused skill (licence change, install command, path gone) must not stop the others.
    try {
      const latest = up.latest(e.source, e.path);
      if (latest === e.commit && existsSync(join(rootDir, 'skills', name))) {
        results.push({ name, status: 'current' });
        continue;
      }
      manifest.skills[name] = copySkill(rootDir, up, name, e, latest);
      writeManifest(rootDir, manifest);
      saveNotice(rootDir, manifest);
      results.push({ name, status: 'updated', from: e.commit, to: latest });
    } catch (err) {
      results.push({ name, status: 'refused', error: err.message });
    }
  }
  return results;
}

export function add(rootDir, up, { source, path, name }) {
  const cleanPath = path.replace(/^\/+|\/+$/g, '');
  const skill = name ?? basename(cleanPath);
  if (!KEBAB.test(skill)) throw new Error(`${skill}: name must be kebab-case (use --name)`);
  const manifest = readManifest(rootDir);
  if (manifest.skills[skill]) throw new Error(`${skill}: already in vendor.json; use --update`);
  if (existsSync(join(rootDir, 'skills', skill))) throw new Error(`${skill}: skills/${skill} already exists`);
  const entry = { source, path: cleanPath };
  const draftErrors = validateEntry(skill, { ...entry, commit: '0'.repeat(40), license: 'MIT', licenseFrom: 'x', hash: '0'.repeat(64) });
  if (draftErrors.length) throw new Error(`${skill}: ${draftErrors.join('; ')}`);
  manifest.skills[skill] = copySkill(rootDir, up, skill, entry, up.latest(source, cleanPath));
  writeManifest(rootDir, manifest);
  saveNotice(rootDir, manifest);
  return { name: skill, ...manifest.skills[skill] };
}

function parseArgs(argv) {
  const opts = { mode: null, names: [], source: null, json: false, name: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--add', '--check', '--update', '--notice'].includes(a)) {
      if (opts.mode) throw new Error('use one of --add, --check, --update, --notice');
      opts.mode = a.slice(2);
    } else if (a === '--json') opts.json = true;
    else if (a === '--source' || a === '--name') {
      const value = argv[++i];
      if (!value || value.startsWith('-')) throw new Error(`${a} needs a value`);
      opts[a.slice(2)] = value;
    }
    else if (a.startsWith('-')) throw new Error(`unknown option ${a}`);
    else opts.names.push(a);
  }
  if (!opts.mode) throw new Error('usage: vendor.mjs --add <owner/repo> <path> [--name n] | --check [--json] | --update | --notice');
  return opts;
}

function main(argv) {
  const opts = parseArgs(argv);
  const rootDir = resolve(process.env.VENDOR_ROOT ?? '.');
  if (opts.mode === 'notice') {
    saveNotice(rootDir, readManifest(rootDir));
    return 0;
  }
  const up = new Upstream();
  try {
    if (opts.mode === 'add') {
      const [source, path] = opts.names;
      if (!source || !path) throw new Error('--add needs <owner/repo> <path-in-repo>');
      const r = add(rootDir, up, { source, path, name: opts.name });
      console.log(`added ${r.name} from ${r.source}@${r.commit.slice(0, 7)} (${r.license})`);
      return 0;
    }
    if (opts.mode === 'check') {
      const rows = check(rootDir, up, opts);
      if (opts.json) console.log(JSON.stringify(rows, null, 2));
      else
        for (const r of rows)
          console.log(`${r.status.padEnd(16)} ${r.name} ${r.source} ${r.commit.slice(0, 7)} -> ${r.latest ? r.latest.slice(0, 7) : r.error}`);
      return rows.some((r) => r.status === 'error') ? 1 : 0;
    }
    const results = update(rootDir, up, opts);
    for (const r of results) {
      if (r.status === 'updated') console.log(`updated ${r.name} ${r.from.slice(0, 7)} -> ${r.to.slice(0, 7)}`);
      else if (r.status === 'refused') console.error(`refused ${r.name}: ${r.error}`);
      else console.log(`${r.status} ${r.name}`);
    }
    return results.some((r) => r.status === 'refused') ? 1 : 0;
  } finally {
    up.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
}
