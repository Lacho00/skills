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

const raw = (folder, frontmatterBody) => ({ [folder]: `---\n${frontmatterBody}\n---\n\n# Body\n` });

test('folded block description over 1024 chars fails', () => {
  const r = checkSkills(repo(raw('kotlin-example', `name: kotlin-example\ndescription: >\n  ${'x'.repeat(1500)}`)));
  assert.ok(r.errors.some((e) => /1024/.test(e)), r.errors.join('\n'));
});

test('plain scalar continued on next line is measured whole', () => {
  const r = checkSkills(repo(raw('kotlin-example', `name: kotlin-example\ndescription: first\n  ${'x'.repeat(1500)}`)));
  assert.ok(r.errors.some((e) => /1024/.test(e)), r.errors.join('\n'));
});

test('invalid YAML (colon-space in plain scalar) fails', () => {
  const r = checkSkills(repo(raw('kotlin-example', 'name: kotlin-example\ndescription: Use when: testing')));
  assert.ok(r.errors.some((e) => /YAML/.test(e)), r.errors.join('\n'));
});

test('duplicate keys fail', () => {
  const r = checkSkills(repo(raw('kotlin-example', 'name: kotlin-example\ndescription: a\ndescription: b')));
  assert.ok(r.errors.some((e) => /YAML/.test(e)), r.errors.join('\n'));
});

test('missing name fails', () => {
  const r = checkSkills(repo(raw('kotlin-example', 'description: Use when testing.')));
  assert.ok(r.errors.some((e) => /name/.test(e)), r.errors.join('\n'));
});

test('inline comment and quoted values are read as YAML', () => {
  const r = checkSkills(repo(raw('kotlin-example', "name: kotlin-example # note\ndescription: 'Use when: testing.'")));
  assert.deepEqual(r.errors, []);
});

test('BOM and CRLF frontmatter is accepted', () => {
  const r = checkSkills(repo({ 'kotlin-example': '﻿---\r\nname: kotlin-example\r\ndescription: Use when testing.\r\n---\r\n' }));
  assert.deepEqual(r.errors, []);
});

test('a line starting with ---- inside a block does not close frontmatter', () => {
  const r = checkSkills(repo(raw('kotlin-example', `name: kotlin-example\ndescription: |\n  a\n----\n  ${'x'.repeat(1500)}`)));
  assert.ok(r.errors.length > 0);
});
