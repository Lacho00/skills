import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const INSTALL = resolve('skills/git-protect-main/scripts/install.sh');

// Isolated from the user's git config: no global hooks path, no signing, fixed identity.
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@example.invalid',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@example.invalid',
};

function run(cmd, args, cwd) {
  return spawnSync(cmd, args, { cwd, env: ENV, encoding: 'utf8' });
}

function git(cwd, ...args) {
  const r = run('git', args, cwd);
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

// A clone with one commit on main, pushed to a bare remote, plus a feature branch.
function setup() {
  const root = mkdtempSync(join(tmpdir(), 'protect-main-'));
  const remote = join(root, 'remote.git');
  const work = join(root, 'work');
  git(root, 'init', '-q', '--bare', '-b', 'main', remote);
  git(root, 'init', '-q', '-b', 'main', work);
  writeFileSync(join(work, 'a.txt'), 'a\n');
  git(work, 'add', 'a.txt');
  git(work, 'commit', '-q', '-m', 'init');
  git(work, 'remote', 'add', 'origin', remote);
  git(work, 'push', '-q', 'origin', 'main');
  git(work, 'checkout', '-q', '-b', 'feature');
  writeFileSync(join(work, 'b.txt'), 'b\n');
  git(work, 'add', 'b.txt');
  git(work, 'commit', '-q', '-m', 'feature');
  return { root, remote, work };
}

const install = (...args) => run('bash', [INSTALL, ...args]);
const push = (cwd, ...args) => run('git', ['push', ...args], cwd);
const refused = (r) => r.status !== 0 && /direct push to 'main'.*refused/.test(r.stderr);

test('installer protects main and every spelling of a push to main is refused', () => {
  const { work } = setup();
  const r = install(work);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(work, 'config', '--get', 'guardrails.protected'), 'main');

  assert.ok(refused(push(work, 'origin', 'HEAD:main')), 'HEAD:main');
  assert.ok(refused(push(work, 'origin', '+HEAD:main')), '+HEAD:main');
  assert.ok(refused(push(work, 'origin', 'HEAD:refs/heads/main')), 'full ref');
  assert.ok(refused(push(work, 'origin', ':main')), 'deletion');
  assert.ok(refused(push(work, '--dry-run', 'origin', 'HEAD:main')), '--dry-run');
  // --all and --mirror only send refs that differ, so give local main a new commit first.
  git(work, 'checkout', '-q', 'main');
  git(work, 'merge', '-q', 'feature');
  assert.ok(refused(push(work, '--all', 'origin')), '--all');
  assert.ok(refused(push(work, '--mirror', 'origin')), '--mirror');
  assert.ok(refused(push(work, 'origin', 'main')), 'plain main');
  assert.ok(refused(run('git', ['-C', work, 'push', 'origin', 'main'], tmpdir())), 'git -C');
});

test('a push to another branch passes', () => {
  const { work, remote } = setup();
  install(work);
  const r = push(work, 'origin', 'feature');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(git(remote, 'rev-parse', 'feature'), git(work, 'rev-parse', 'feature'));
});

test('a worktree shares the hook', () => {
  const { root, work } = setup();
  install(work);
  const wt = join(root, 'wt');
  git(work, 'worktree', 'add', '-q', '-b', 'other', wt);
  assert.ok(refused(push(wt, 'origin', 'HEAD:main')));
});

test('extra protected branches come from guardrails.protected', () => {
  const { work } = setup();
  install(work);
  git(work, 'config', 'guardrails.protected', 'main,release');
  const r = push(work, 'origin', 'HEAD:release');
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /direct push to 'release'.*refused/);
  assert.equal(push(work, 'origin', 'feature').status, 0);
});

test('a preset guardrails.protected is kept', () => {
  const { work } = setup();
  git(work, 'config', 'guardrails.protected', 'trunk');
  install(work);
  assert.equal(git(work, 'config', '--get', 'guardrails.protected'), 'trunk');
});

test('a foreign pre-push hook is kept unless --replace, then backed up', () => {
  const { work } = setup();
  const hook = join(work, '.git', 'hooks', 'pre-push');
  writeFileSync(hook, '#!/bin/sh\nexit 0\n');
  chmodSync(hook, 0o755);

  const kept = install(work);
  assert.equal(kept.status, 1);
  assert.match(kept.stderr, /--replace/);
  assert.equal(readFileSync(hook, 'utf8'), '#!/bin/sh\nexit 0\n');

  const replaced = install('--replace', work);
  assert.equal(replaced.status, 0, replaced.stderr);
  assert.ok(readdirSync(join(work, '.git', 'hooks')).some((f) => f.startsWith('pre-push.bak.')));
  assert.ok(refused(push(work, 'origin', 'HEAD:main')));
});

test('reinstalling over its own hook needs no --replace', () => {
  const { work } = setup();
  install(work);
  const again = install(work);
  assert.equal(again.status, 0, again.stderr);
  assert.ok(!readdirSync(join(work, '.git', 'hooks')).some((f) => f.startsWith('pre-push.bak.')));
});

test('a repo with core.hooksPath is skipped', () => {
  const { work } = setup();
  git(work, 'config', 'core.hooksPath', '.husky');
  const r = install(work);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /core\.hooksPath/);
  assert.ok(!existsSync(join(work, '.git', 'hooks', 'pre-push')));
});

test('no arguments and a non-repo path fail', () => {
  assert.equal(install().status, 64);
  const r = install(mkdtempSync(join(tmpdir(), 'not-a-repo-')));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not a git repository/);
});
