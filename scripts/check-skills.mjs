#!/usr/bin/env node
// Repository checks, run by `npm run check` and CI:
// - every skills/<name>/SKILL.md: folder is kebab-case, frontmatter `name`
//   equals the folder, `description` is present and at most 1024 chars;
// - every vendored skill has a valid vendor.json entry, its licence file, an
//   unchanged copy (unless marked modified) and its NOTICE credit;
// - no file tells an agent to install anything from outside this repository.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { hashFolder } from './lib/hash.mjs';
import { findLicenseFile, identifyLicense } from './lib/license.mjs';
import { MANIFEST, readManifest, validateEntry } from './lib/manifest.mjs';
import { renderNotice } from './lib/notice.mjs';
import { checkInstallCommands } from './lib/policy.mjs';

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

const skillFolders = (rootDir) => {
  const dir = join(rootDir, 'skills');
  return existsSync(dir) ? readdirSync(dir).filter((f) => statSync(join(dir, f)).isDirectory()) : [];
};

export function checkVendor(rootDir) {
  const errors = [];
  let manifest;
  try {
    manifest = readManifest(rootDir);
  } catch (err) {
    return [`${MANIFEST}: ${err.message}`];
  }
  for (const [name, entry] of Object.entries(manifest.skills)) {
    const problems = validateEntry(name, entry);
    if (problems.length) {
      errors.push(...problems.map((p) => `${MANIFEST} ${name}: ${p}`));
      continue;
    }
    const dir = join(rootDir, 'skills', name);
    if (!existsSync(dir)) {
      errors.push(`${name}: listed in ${MANIFEST} but skills/${name} is missing`);
      continue;
    }
    const lic = findLicenseFile(dir);
    if (!lic) errors.push(`${name}: vendored skill has no licence file`);
    else if (identifyLicense(lic.text) !== entry.license)
      errors.push(`${name}: ${lic.file} is not ${entry.license} as ${MANIFEST} says`);
    if (!entry.modified && hashFolder(dir) !== entry.hash)
      errors.push(`${name}: copy differs from upstream ${entry.commit.slice(0, 7)}; revert it, or set "modified": true in ${MANIFEST}`);
  }
  for (const folder of skillFolders(rootDir)) {
    if (!manifest.skills[folder] && findLicenseFile(join(rootDir, 'skills', folder)))
      errors.push(`${folder}: has its own licence file but no ${MANIFEST} entry; vendor it with scripts/vendor.mjs`);
  }
  const noticeFile = join(rootDir, 'NOTICE');
  const notice = existsSync(noticeFile) ? readFileSync(noticeFile, 'utf8') : '';
  if (notice !== renderNotice(notice, manifest)) errors.push('NOTICE: vendored skills section is out of date; run node scripts/vendor.mjs --notice');
  return errors;
}

export function checkRepo(rootDir) {
  const { count, errors } = checkSkills(rootDir);
  return { count, errors: [...errors, ...checkVendor(rootDir), ...checkInstallCommands(rootDir)] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { count, errors } = checkRepo(resolve(process.argv[2] ?? '.'));
  for (const e of errors) console.error(`error: ${e}`);
  console.log(`${count} skills, ${errors.length ? `${errors.length} errors` : 'ok'}`);
  process.exit(errors.length ? 1 : 0);
}
