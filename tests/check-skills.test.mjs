import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkSkills } from '../scripts/check-skills.mjs';

function repo(skills = {}) {
  const root = mkdtempSync(join(tmpdir(), 'skills-test-'));
  mkdirSync(join(root, 'skills'));
  for (const [folder, body] of Object.entries(skills)) {
    mkdirSync(join(root, 'skills', folder));
    writeFileSync(join(root, 'skills', folder, 'SKILL.md'), body);
  }
  return root;
}

const skill = (name, description) =>
  `---\nname: ${name}\n${description === undefined ? '' : `description: ${description}\n`}---\n\n# Body\n`;

test('empty skills dir passes with zero skills', () => {
  assert.deepEqual(checkSkills(repo()), { count: 0, errors: [] });
});

test('valid skill passes', () => {
  const r = checkSkills(repo({ 'kotlin-example': skill('kotlin-example', 'Use when testing.') }));
  assert.deepEqual(r, { count: 1, errors: [] });
});

test('name different from folder fails', () => {
  const r = checkSkills(repo({ 'kotlin-example': skill('other-name', 'Use when testing.') }));
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /kotlin-example/);
});

test('missing description fails', () => {
  const r = checkSkills(repo({ 'kotlin-example': skill('kotlin-example') }));
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /description/);
});

test('empty description fails', () => {
  const r = checkSkills(repo({ 'kotlin-example': skill('kotlin-example', '""') }));
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /description/);
});

test('description over 1024 chars fails', () => {
  const r = checkSkills(repo({ 'kotlin-example': skill('kotlin-example', 'x'.repeat(1025)) }));
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /1024/);
});

test('folder not kebab-case fails', () => {
  const r = checkSkills(repo({ Kotlin_Example: skill('Kotlin_Example', 'Use when testing.') }));
  assert.ok(r.errors.some((e) => /kebab-case/.test(e)));
});

test('folder without SKILL.md fails', () => {
  const root = repo();
  mkdirSync(join(root, 'skills', 'react-empty'));
  const r = checkSkills(root);
  assert.equal(r.errors.length, 1);
  assert.match(r.errors[0], /SKILL\.md/);
});
