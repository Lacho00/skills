#!/usr/bin/env node
// Searches the skills.sh registry and says, for each hit, whether this
// repository already has it and whether its licence lets it be vendored.
// It never installs anything: the output is a shortlist to vendor with
// scripts/vendor.mjs --add or to add to CATALOG.md, after review.
//
//   node scripts/scout.mjs <query...> [--limit <n>] [--json]
//
// Needs network access to skills.sh and an authenticated `gh` for licences.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALLOWED_LICENSES } from './lib/license.mjs';
import { readManifest } from './lib/manifest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://skills.sh/api/search';
const TIMEOUT_MS = 15000;
// owner/repo as GitHub allows them, so a registry value cannot point gh api elsewhere.
const SOURCE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const isRepoSource = (s) => typeof s === 'string' && SOURCE.test(s) && !s.split('/').some((p) => p === '.' || p === '..');

// argv without the node and script paths. Returns { query, limit, json }.
export function parseArgs(argv) {
  const li = argv.indexOf('--limit');
  const limit = li >= 0 ? Number(argv[li + 1]) : 10;
  const skip = new Set(li >= 0 ? [li, li + 1] : []);
  const query = argv.filter((a, i) => a !== '--json' && !skip.has(i)).join(' ').trim();
  return { query, limit, json: argv.includes('--json') };
}

const lower = (s) => String(s ?? '').toLowerCase();

// Rows of CATALOG.md tables: [{ name, source, section }]. section is the
// nearest "## " heading, so callers can tell refused and exception rows apart.
export function parseCatalog(text) {
  const rows = [];
  let section = '';
  for (const line of text.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { section = h[1]; continue; }
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*\[([^\]]+)\]/);
    if (m) rows.push({ name: m[1], source: m[2], section });
  }
  return rows;
}

// state: vendored | catalogued | exception | refused | name-taken | new
export function classify(hit, { manifest, catalog, localSkills }) {
  const source = lower(hit.source);
  const name = lower(hit.skillId ?? hit.name);
  for (const [local, e] of Object.entries(manifest.skills ?? {})) {
    if (lower(e.source) === source && (lower(basename(e.path ?? '')) === name || lower(local) === name)) return { state: 'vendored', as: local };
  }
  const row = catalog.find((r) => lower(r.name) === name && lower(r.source) === source);
  if (row) {
    if (/^refused/i.test(row.section)) return { state: 'refused' };
    if (/^exceptions/i.test(row.section)) return { state: 'exception' };
    return { state: 'catalogued', section: row.section };
  }
  if (localSkills.some((s) => lower(s) === name)) return { state: 'name-taken' };
  return { state: 'new' };
}

// spdx: the id GitHub reports, null when it finds no licence file.
// ok: true allowed, false not allowed, null unknown (read the file).
export function licenceVerdict(spdx) {
  if (!spdx) return { licence: 'none', ok: false };
  if (spdx === 'NOASSERTION' || spdx === 'other') return { licence: 'unrecognised', ok: null };
  return { licence: spdx, ok: ALLOWED_LICENSES.includes(spdx) };
}

function repoInfo(source) {
  try {
    const out = execFileSync('gh', ['api', `repos/${source}`, '--jq', '{l: .license.spdx_id, s: .stargazers_count, p: .pushed_at}'], { stdio: 'pipe', encoding: 'utf8', timeout: TIMEOUT_MS });
    const { l, s, p } = JSON.parse(out);
    return { ...licenceVerdict(l), stars: s, pushed: String(p ?? '').slice(0, 10) };
  } catch {
    return { licence: 'unreachable', ok: null, stars: null, pushed: '' };
  }
}

export async function search(query, limit) {
  const res = await fetch(`${API}?q=${encodeURIComponent(query)}&limit=${limit}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`skills.sh answered ${res.status}`);
  const data = await res.json();
  // Ids without owner/repo (registry mirrors) cannot be vendored.
  return (data.skills ?? []).filter((h) => isRepoSource(h.source));
}

export function context(rootDir) {
  const catalogFile = join(rootDir, 'CATALOG.md');
  const skillsDir = join(rootDir, 'skills');
  return {
    manifest: readManifest(rootDir),
    catalog: existsSync(catalogFile) ? parseCatalog(readFileSync(catalogFile, 'utf8')) : [],
    localSkills: existsSync(skillsDir) ? readdirSync(skillsDir) : [],
  };
}

async function main(argv) {
  const { query, limit, json } = parseArgs(argv);
  if (!query || !Number.isInteger(limit) || limit < 1) {
    console.error('usage: node scripts/scout.mjs <query...> [--limit <n>] [--json]');
    process.exit(2);
  }
  const ctx = context(ROOT);
  const hits = await search(query, limit);
  const repos = new Map();
  const rows = hits.map((h) => {
    if (!repos.has(h.source)) repos.set(h.source, repoInfo(h.source));
    return { id: h.id, source: h.source, skill: h.skillId ?? h.name, installs: h.installs, ...classify(h, ctx), ...repos.get(h.source) };
  });
  if (json) return console.log(JSON.stringify(rows, null, 2));
  if (!rows.length) return console.log(`no hits for "${query}"`);
  for (const r of rows) {
    const lic = r.ok === true ? r.licence : r.ok === false ? `${r.licence} (blocked)` : `${r.licence} (check)`;
    console.log([r.state.padEnd(10), r.id, `installs=${r.installs}`, `stars=${r.stars ?? '?'}`, `pushed=${r.pushed || '?'}`, lic].join('  '));
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
}
