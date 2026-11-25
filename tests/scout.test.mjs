import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classify, isRepoSource, licenceVerdict, parseArgs, parseCatalog } from '../scripts/scout.mjs';

const CATALOG = `# Catalog

## Next.js / React

| Skill | Source | What it does |
|---|---|---|
| \`aceternity-ui\` | [secondsky/claude-skills](https://github.com/secondsky/claude-skills) | Aceternity |

## Exceptions: installed from their source

| Skill | Source | Status |
|---|---|---|
| \`deploy-to-vercel\` | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | No licence file |

## Refused

| Skill | Source | Reason |
|---|---|---|
| \`find-skills\` | [vercel-labs/skills](https://github.com/vercel-labs/skills) | Installs from any source |
`;

const ctx = {
  manifest: { skills: { 'gsap-core': { source: 'greensock/gsap-skills', path: 'skills/gsap-core' } } },
  catalog: parseCatalog(CATALOG),
  localSkills: ['gsap-core', 'git-protect-main'],
};

test('parseCatalog reads name, source and section of each row', () => {
  assert.deepEqual(parseCatalog(CATALOG), [
    { name: 'aceternity-ui', source: 'secondsky/claude-skills', section: 'Next.js / React' },
    { name: 'deploy-to-vercel', source: 'vercel-labs/agent-skills', section: 'Exceptions: installed from their source' },
    { name: 'find-skills', source: 'vercel-labs/skills', section: 'Refused' },
  ]);
});

test('classify tells each hit apart', () => {
  const c = (source, skillId) => classify({ source, skillId }, ctx).state;
  assert.equal(c('GreenSock/gsap-skills', 'gsap-core'), 'vendored');
  assert.equal(c('secondsky/claude-skills', 'aceternity-ui'), 'catalogued');
  assert.equal(c('vercel-labs/agent-skills', 'deploy-to-vercel'), 'exception');
  assert.equal(c('vercel-labs/skills', 'find-skills'), 'refused');
  assert.equal(c('someone/else', 'git-protect-main'), 'name-taken');
  assert.equal(c('someone/else', 'gsap-core'), 'name-taken');
  assert.equal(c('terminalskills/skills', 'aceternity-ui'), 'new');
});

test('licenceVerdict blocks missing and disallowed licences, flags unrecognised ones', () => {
  assert.deepEqual(licenceVerdict('MIT'), { licence: 'MIT', ok: true });
  assert.deepEqual(licenceVerdict('GPL-3.0'), { licence: 'GPL-3.0', ok: false });
  assert.deepEqual(licenceVerdict(null), { licence: 'none', ok: false });
  assert.deepEqual(licenceVerdict('NOASSERTION'), { licence: 'unrecognised', ok: null });
});

test('parseArgs keeps every query word and reads --limit and --json anywhere', () => {
  assert.deepEqual(parseArgs(['gsap']), { query: 'gsap', limit: 10, json: false });
  assert.deepEqual(parseArgs(['gsap', 'scroll', 'trigger']), { query: 'gsap scroll trigger', limit: 10, json: false });
  assert.deepEqual(parseArgs(['--limit', '3', 'react', 'bits', '--json']), { query: 'react bits', limit: 3, json: true });
  assert.deepEqual(parseArgs(['react', '--limit', '5']), { query: 'react', limit: 5, json: false });
});

test('isRepoSource accepts owner/repo only', () => {
  for (const s of ['greensock/gsap-skills', 'Motionsites-AI/claude-skill', 'a.b/c_d']) assert.ok(isRepoSource(s), s);
  for (const s of ['smithery.ai', 'a/b/c', 'a/b?x=1', '../user', 'a/..', '', undefined]) assert.ok(!isRepoSource(s), String(s));
});
