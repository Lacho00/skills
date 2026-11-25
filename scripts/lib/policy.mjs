// Nothing in this repository may tell an agent to install skills, plugins or
// scripts from outside it. The only allowed install source is Lacho00/skills.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RULES = [
  {
    re: /\b(?:npx|bunx|pnpm\s+dlx|yarn\s+dlx)\s+(?:-{1,2}\S+\s+)*skills(?:@\S+)?\s+(?:add|install)\s+(?!Lacho00\/skills(?![\w.-]))/gi,
    why: 'skills CLI install from a source other than Lacho00/skills',
  },
  { re: /(?:\bclaude\s+plugins?|\/plugins?)\s+(?:install|marketplace\s+add)\b/gi, why: 'plugin or marketplace install' },
  { re: /\b(?:curl|wget)\b[^\n|]*\|\s*(?:sudo\s+)?(?:ba|z|da)?sh\b/gi, why: 'download piped to a shell' },
  { re: /\b(?:irm|iwr|Invoke-RestMethod|Invoke-WebRequest)\b[^\n|]*\|\s*iex\b/gi, why: 'download piped to PowerShell' },
  { re: /https?:\/\/\S+\/install(?:er)?\.(?:sh|ps1)\b/gi, why: 'install script URL' },
];

// Install commands found in `text`, as [{ line, why, match }].
export function findInstallCommands(text) {
  const hits = [];
  for (const { re, why } of RULES) {
    for (const m of text.matchAll(re)) {
      const line = text.slice(0, m.index).split('\n').length;
      hits.push({ line, why, match: m[0].trim() });
    }
  }
  return hits.sort((a, b) => a.line - b.line);
}

function walk(path, out) {
  if (!existsSync(path)) return out;
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) if (name !== '.git' && name !== 'node_modules') walk(join(path, name), out);
  } else out.push(path);
  return out;
}

// Paths scanned: every file under skills/ and templates/, plus the top-level docs.
export const SCANNED = ['skills', 'templates', 'README.md', 'CATALOG.md'];

export function checkInstallCommands(rootDir) {
  const errors = [];
  for (const file of SCANNED.flatMap((p) => walk(join(rootDir, p), []))) {
    const buf = readFileSync(file);
    if (buf.includes(0)) continue; // binary
    for (const hit of findInstallCommands(buf.toString('utf8')))
      errors.push(`${relative(rootDir, file)}:${hit.line}: ${hit.why}: ${hit.match}`);
  }
  return errors;
}
