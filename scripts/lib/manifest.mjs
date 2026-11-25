// vendor.json: one entry per vendored third-party skill, keyed by the folder
// name under skills/.
//
//   "<name>": {
//     "source": "owner/repo",          GitHub repository the copy comes from
//     "path": "skills/<name>",         skill folder inside that repository
//     "commit": "<40-hex sha>",        last upstream commit touching `path` that was copied
//     "license": "MIT",                SPDX id, one of ALLOWED_LICENSES
//     "licenseFrom": "LICENSE",        where the licence file was taken from, relative to the repo root
//     "hash": "<sha256>",              hashFolder() of skills/<name> as copied
//     "modified": false                true once the copy is edited by hand; updates then only notify
//   }
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALLOWED_LICENSES } from './license.mjs';

export const MANIFEST = 'vendor.json';

export const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SOURCE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SHA = /^[0-9a-f]{40}$/;
const HASH = /^[0-9a-f]{64}$/;

export function readManifest(rootDir) {
  const file = join(rootDir, MANIFEST);
  if (!existsSync(file)) return { skills: {} };
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (!data || typeof data.skills !== 'object' || Array.isArray(data.skills)) throw new Error(`${MANIFEST}: "skills" must be an object`);
  return data;
}

export function writeManifest(rootDir, data) {
  const sorted = Object.fromEntries(Object.entries(data.skills).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(join(rootDir, MANIFEST), `${JSON.stringify({ ...data, skills: sorted }, null, 2)}\n`);
}

// Returns a list of problems with one entry, empty when valid.
export function validateEntry(name, e) {
  const errors = [];
  if (!KEBAB.test(name)) errors.push('name must be kebab-case');
  if (!e || typeof e !== 'object') return ['entry must be an object'];
  if (typeof e.source !== 'string' || !SOURCE.test(e.source)) errors.push('source must be "owner/repo"');
  if (typeof e.path !== 'string' || !e.path || e.path.startsWith('/') || e.path.split('/').includes('..'))
    errors.push('path must be a relative path inside the source repo');
  if (typeof e.commit !== 'string' || !SHA.test(e.commit)) errors.push('commit must be a 40-character sha');
  if (!ALLOWED_LICENSES.includes(e.license)) errors.push(`license must be one of ${ALLOWED_LICENSES.join(', ')}`);
  if (typeof e.licenseFrom !== 'string' || !e.licenseFrom) errors.push('licenseFrom is missing');
  if (typeof e.hash !== 'string' || !HASH.test(e.hash)) errors.push('hash must be a sha256 hex digest');
  if (e.modified !== undefined && typeof e.modified !== 'boolean') errors.push('modified must be true or false');
  return errors;
}
