#!/usr/bin/env node
// Weekly upstream sync, run by .github/workflows/vendor-update.yml on a
// checkout of main. For every source with vendored skills behind upstream it
// copies the new commit on its own branch (vendor/<owner>-<repo>), runs the
// tests and checks, and opens or refreshes ONE pull request per source. It never
// merges: vendored skills are instructions an agent obeys, so a person reads
// the diff first. Copies marked "modified" only get an issue as a notice.
// A source whose update fails (licence no longer redistributable, install
// command, broken checks) is skipped, the old copy stays, and the job fails.
//
//   node scripts/vendor-prs.mjs [--dry-run]
//
// Needs git push access and GH_TOKEN for the gh CLI.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Upstream, check, update } from './vendor.mjs';

export const branchFor = (source) => `vendor/${source.toLowerCase().replace(/[^a-z0-9._-]+/g, '-')}`;

// Groups check() rows into one PR per source and one notice per modified copy.
export function plan(rows) {
  const prs = new Map();
  const notices = [];
  for (const r of rows) {
    if (r.status === 'behind') {
      if (!prs.has(r.source)) prs.set(r.source, []);
      prs.get(r.source).push(r);
    } else if (r.status === 'modified-behind') notices.push(r);
  }
  return {
    prs: [...prs].map(([source, skills]) => ({ source, branch: branchFor(source), skills })),
    notices,
  };
}

const compare = (r) => `https://github.com/${r.source}/compare/${r.commit}...${r.latest}`;

export function prTitle(pr) {
  return `chore(vendor): update ${pr.source} (${pr.skills.map((s) => s.name).join(', ')})`;
}

export function prBody(pr) {
  const rows = pr.skills.map((s) => `| \`${s.name}\` | \`${s.commit.slice(0, 7)}\` | \`${s.latest.slice(0, 7)}\` | [upstream diff](${compare(s)}) |`);
  return [
    `Upstream \`${pr.source}\` changed the vendored skills below. Opened by the weekly vendor-update workflow.`,
    '',
    '| Skill | From | To | Changes |',
    '|---|---|---|---|',
    ...rows,
    '',
    'Before merging:',
    '- Read the whole diff: these files are instructions an agent will follow.',
    '- Licence and install-command checks already passed in the workflow (`npm test`, `npm run check`).',
    '- Run the OCR review, then merge by hand. This workflow never merges.',
  ].join('\n');
}

export const noticeTitle = (r) => `vendor: upstream changed modified copy ${r.name}`;

export function noticeBody(r) {
  return [
    `\`skills/${r.name}\` is marked \`"modified": true\` in vendor.json, so the weekly workflow does not overwrite it.`,
    '',
    `Upstream \`${r.source}\` moved from \`${r.commit.slice(0, 7)}\` to \`${r.latest.slice(0, 7)}\`: ${compare(r)}`,
    '',
    'Port the changes by hand if they matter, then update `commit` and `hash` in vendor.json.',
  ].join('\n');
}

const run = (cmd, args, opts = {}) => (execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts }) ?? '').trim();
const git = (...args) => run('git', args);
const gh = (...args) => run('gh', args);

function openPr(pr, dryRun) {
  git('checkout', '--quiet', '-B', pr.branch, 'origin/main');
  const up = new Upstream();
  let results;
  try {
    results = update(process.cwd(), up, { names: [], source: pr.source });
  } finally {
    up.close();
  }
  // Any refused skill fails the whole source: a PR must not ship half an update.
  const refused = results.filter((r) => r.status === 'refused');
  if (refused.length) throw new Error(refused.map((r) => `${r.name}: ${r.error}`).join('; '));
  if (!results.some((r) => r.status === 'updated')) return 'nothing to update';
  run('npm', ['test', '--silent'], { stdio: ['ignore', 'inherit', 'inherit'] });
  run('npm', ['run', 'check', '--silent'], { stdio: ['ignore', 'inherit', 'inherit'] });
  git('add', '-A');
  git('commit', '--quiet', '-m', prTitle(pr));

  let remoteTree = null;
  try {
    git('fetch', '--quiet', 'origin', pr.branch);
    remoteTree = git('rev-parse', 'FETCH_HEAD^{tree}');
  } catch {
    // branch not on the remote yet
  }
  const open = JSON.parse(gh('pr', 'list', '--head', pr.branch, '--state', 'open', '--json', 'number'));
  if (remoteTree === git('rev-parse', 'HEAD^{tree}') && open.length) return `PR #${open[0].number} already up to date`;
  if (dryRun) return `would push ${pr.branch} and ${open.length ? `refresh PR #${open[0].number}` : 'open a PR'}`;

  git('push', '--quiet', '--force', 'origin', `HEAD:refs/heads/${pr.branch}`);
  if (open.length) {
    gh('pr', 'edit', String(open[0].number), '--title', prTitle(pr), '--body', prBody(pr));
    return `refreshed PR #${open[0].number}`;
  }
  return `opened ${gh('pr', 'create', '--base', 'main', '--head', pr.branch, '--title', prTitle(pr), '--body', prBody(pr))}`;
}

function openNotice(r, dryRun) {
  const title = noticeTitle(r);
  const existing = JSON.parse(gh('issue', 'list', '--state', 'open', '--search', `"${title}" in:title`, '--json', 'title'));
  if (existing.some((i) => i.title === title)) return 'notice already open';
  if (dryRun) return 'would open a notice issue';
  return `opened ${gh('issue', 'create', '--title', title, '--body', noticeBody(r))}`;
}

function main(argv) {
  const dryRun = argv.includes('--dry-run');
  const up = new Upstream();
  let rows;
  try {
    rows = check(process.cwd(), up, { names: [], source: null });
  } finally {
    up.close();
  }
  const { prs, notices } = plan(rows);
  const failures = rows.filter((r) => r.status === 'error').map((r) => r.source);
  for (const r of rows) if (r.status === 'error') console.error(`${r.name}: FAILED to read upstream: ${r.error}`);
  for (const pr of prs) {
    try {
      console.log(`${pr.source}: ${openPr(pr, dryRun)}`);
    } catch (err) {
      failures.push(pr.source);
      console.error(`${pr.source}: FAILED, old copy kept: ${err.message}`);
    } finally {
      git('reset', '--quiet', '--hard');
      git('clean', '--quiet', '-fd');
      git('checkout', '--quiet', 'main');
    }
  }
  for (const r of notices) console.log(`${r.name}: ${openNotice(r, dryRun)}`);
  if (!prs.length && !notices.length) console.log('all vendored skills are current');
  return failures.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exit(1);
  }
}
