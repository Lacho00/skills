#!/usr/bin/env node
// Validates every skills/<name>/SKILL.md: folder is kebab-case, frontmatter
// `name` equals the folder, `description` is present and at most 1024 chars.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_DESCRIPTION = 1024;

// Returns { fields } on success, { error } when the frontmatter is missing or not valid YAML.
function frontmatter(text) {
  const match = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) return { error: 'SKILL.md has no frontmatter' };
  const doc = parseDocument(match[1], { uniqueKeys: true });
  if (doc.errors.length) return { error: `invalid YAML frontmatter: ${doc.errors[0].message.split('\n')[0]}` };
  const fields = doc.toJS();
  if (!fields || typeof fields !== 'object' || Array.isArray(fields))
    return { error: 'frontmatter must be a YAML mapping' };
  return { fields };
}

export function checkSkills(rootDir) {
  const dir = join(rootDir, 'skills');
  const errors = [];
  if (!existsSync(dir)) return { count: 0, errors };
  const folders = readdirSync(dir).filter((f) => statSync(join(dir, f)).isDirectory());
  for (const folder of folders) {
    if (!KEBAB.test(folder)) errors.push(`${folder}: folder name must be kebab-case`);
    const file = join(dir, folder, 'SKILL.md');
    if (!existsSync(file)) {
      errors.push(`${folder}: missing SKILL.md`);
      continue;
    }
    const { fields: fm, error } = frontmatter(readFileSync(file, 'utf8'));
    if (error) {
      errors.push(`${folder}: ${error}`);
      continue;
    }
    if (fm.name !== folder) errors.push(`${folder}: frontmatter name "${fm.name ?? ''}" must equal folder name`);
    if (typeof fm.description !== 'string' || !fm.description.trim()) errors.push(`${folder}: description is missing or empty`);
    else if (fm.description.length > MAX_DESCRIPTION)
      errors.push(`${folder}: description is ${fm.description.length} chars, max ${MAX_DESCRIPTION}`);
  }
  return { count: folders.length, errors };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { count, errors } = checkSkills(resolve(process.argv[2] ?? '.'));
  for (const e of errors) console.error(`error: ${e}`);
  console.log(`${count} skills, ${errors.length ? `${errors.length} errors` : 'ok'}`);
  process.exit(errors.length ? 1 : 0);
}
