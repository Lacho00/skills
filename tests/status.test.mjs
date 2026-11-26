import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashFolder } from '../scripts/lib/hash.mjs';
import { catalogDecisions, findProjects, isOwnSource, projectStatus, repoHashesAt } from '../scripts/status.mjs';
import { branchFor, noticeBody, plan, prBody, prTitle } from '../scripts/vendor-prs.mjs';

const tmp = (p) => mkdtempSync(join(tmpdir(), p));
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { stdio: 'pipe', encoding: 'utf8' });

test('isOwnSource accepts only Lacho00/skills spellings', () => {
  for (const s of ['Lacho00/skills', 'lacho00/skills', 'https://github.com/Lacho00/skills', 'https://github.com/Lacho00/skills.git'])
    assert.ok(isOwnSource(s), s);
  for (const s of ['Lacho00/skills-fork', 'other/skills', 'vercel-labs/skills', '', undefined]) assert.ok(!isOwnSource(s), String(s));
});

test('projectStatus classifies each locked skill', () => {
  const lock = {
    version: 2,
    skills: {
      fresh: { source: 'Lacho00/skills', computedHash: 'a' },
      stale: { source: 'Lacho00/skills', computedHash: 'old' },
      gone: { source: 'Lacho00/skills', computedHash: 'x' },
      theirs: { source: 'vercel-labs/agent-skills', computedHash: 'y' },
    },
  };
  assert.deepEqual(projectStatus(lock, { fresh: 'a', stale: 'b' }), [
    { skill: 'fresh', state: 'current' },
    { skill: 'stale', state: 'behind' },
    { skill: 'gone', state: 'not-in-repo' },
    { skill: 'theirs', state: 'external', source: 'vercel-labs/agent-skills' },
  ]);
  assert.deepEqual(projectStatus({}, {}), []);
});

test('projectStatus splits other sources by CATALOG.md decisions', () => {
  const lock = {
    skills: {
      allowed: { source: 'vercel-labs/agent-skills' },
      banned: { source: 'other/repo' },
      unknown: { source: 'other/repo' },
      toString: { source: 'other/repo' },
    },
  };
  assert.deepEqual(projectStatus(lock, {}, { allowed: 'exception', banned: 'refused' }).map((s) => s.state),
    ['exception', 'refused', 'external', 'external']);
});

test('catalogDecisions reads the Exceptions and Refused tables only', () => {
  const md = [
    '## Recommended',
    '| Skill | Source |',
    '|---|---|',
    '| `kept` | a/b |',
    '## Exceptions: installed from their source',
    '| Skill | Source | Status |',
    '|---|---|---|',
    '| `one` | a/b | No licence file |',
    '| `two`, `three` | c/d | Uses `npx skills add` |',
    '## Refused',
    '| Skill | Source | Reason |',
    '|---|---|---|',
    '| `gone` | e/f | Replaced by `kept` |',
    '## Later',
    '| `after` | g/h |',
  ].join('\n');
  assert.deepEqual(catalogDecisions(md), { one: 'exception', two: 'exception', three: 'exception', gone: 'refused' });
  assert.deepEqual(catalogDecisions(''), {});
});

test('repoHashesAt reads skills at a ref, ignoring later working-tree edits', () => {
  const root = tmp('repo-');
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 't@example.com');
  git(root, 'config', 'user.name', 't');
  mkdirSync(join(root, 'skills', 'one'), { recursive: true });
  writeFileSync(join(root, 'skills', 'one', 'SKILL.md'), 'v1\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'c');
  const expected = hashFolder(join(root, 'skills', 'one'));
  writeFileSync(join(root, 'skills', 'one', 'SKILL.md'), 'v2\n');
  assert.deepEqual(repoHashesAt(root, 'main'), { one: expected });
});

test('findProjects lists direct subfolders with a skills-lock.json, skipping this repo', () => {
  const dir = tmp('projects-');
  for (const p of ['a', 'b', 'skills']) mkdirSync(join(dir, p));
  writeFileSync(join(dir, 'a', 'skills-lock.json'), '{}');
  writeFileSync(join(dir, 'skills', 'skills-lock.json'), '{}');
  assert.deepEqual(findProjects(dir, join(dir, 'skills')), [join(dir, 'a')]);
});

test('plan opens one PR per source and a notice per modified copy', () => {
  const row = (name, source, status) => ({ name, source, status, commit: '1'.repeat(40), latest: '2'.repeat(40), path: name });
  const { prs, notices } = plan([
    row('a', 'acme/kit', 'behind'),
    row('b', 'acme/kit', 'behind'),
    row('c', 'other/Repo', 'behind'),
    row('d', 'acme/kit', 'current'),
    row('e', 'acme/kit', 'modified-behind'),
    row('f', 'acme/kit', 'modified'),
    row('g', 'acme/kit', 'error'),
  ]);
  assert.deepEqual(prs.map((p) => [p.source, p.branch, p.skills.map((s) => s.name)]), [
    ['acme/kit', 'vendor/acme-kit', ['a', 'b']],
    ['other/Repo', 'vendor/other-repo', ['c']],
  ]);
  assert.deepEqual(notices.map((n) => n.name), ['e']);
  assert.equal(prTitle(prs[0]), 'chore(vendor): update acme/kit (a, b)');
  assert.match(prBody(prs[0]), /compare\/1{40}\.\.\.2{40}/);
  assert.match(prBody(prs[0]), /never merges/);
  assert.match(noticeBody(notices[0]), /"modified": true/);
});

test('branchFor keeps branch names safe', () => {
  assert.equal(branchFor('Some.Org/my_repo'), 'vendor/some.org-my_repo');
});
