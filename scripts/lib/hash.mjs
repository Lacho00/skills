// Folder hash compatible with the `computedHash` that the skills CLI
// (skills.sh) writes into a project's skills-lock.json: sha256 over every file,
// sorted by relative path, each as `path \0 length \0 content`, with CRLF
// normalised to LF in text files. metadata.json and .git/__pycache__/
// __pypackages__ folders are skipped, as the CLI does.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXCLUDE_FILES = new Set(['metadata.json']);
const EXCLUDE_DIRS = new Set(['.git', '__pycache__', '__pypackages__']);

function collect(dir, prefix, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_FILES.has(entry.name) && !entry.isDirectory()) continue;
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) collect(join(dir, entry.name), `${prefix}${entry.name}/`, out);
    } else if (entry.isFile()) {
      out.push({ path: prefix + entry.name, content: readFileSync(join(dir, entry.name)) });
    }
  }
  return out;
}

function normalizeLineEndings(content) {
  if (content.includes(0) || !content.includes('\r\n')) return content;
  return Buffer.from(content.toString('latin1').replaceAll('\r\n', '\n'), 'latin1');
}

export function hashFolder(dir) {
  const entries = collect(dir, '', []).map((f) => ({
    path: Buffer.from(f.path, 'utf-8'),
    content: normalizeLineEndings(f.content),
  }));
  entries.sort((a, b) => Buffer.compare(a.path, b.path));
  const hash = createHash('sha256');
  for (const { path, content } of entries) {
    hash.update(path);
    hash.update('\0');
    hash.update(String(content.length));
    hash.update('\0');
    hash.update(content);
  }
  return hash.digest('hex');
}
