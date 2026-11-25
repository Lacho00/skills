// Nothing in this repository may tell an agent to install skills, plugins or
// scripts from outside it. The only allowed install source is Lacho00/skills.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { readManifest } from './manifest.mjs';

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

// Allowed installers are checked against the whole line, never against the
// regex match alone: whatever follows or precedes the match on that line runs
// in the same shell. A vetted URL uses only unreserved characters (no shell
// metacharacters, query, percent escapes, userinfo or "."/".." segments) and
// starts with one of the skill's prefixes.
const SAFE_URL = /^https:\/\/[a-z0-9.-]+\/(?:[A-Za-z0-9_~-][A-Za-z0-9._~-]*\/?)*$/;
const vettedUrl = (u, allow) =>
  SAFE_URL.test(u) && !/\/\.{1,2}(?:\/|$)/.test(u) && allow.some((p) => u.startsWith(p));

// The one shape of an allowed command line: an optional Markdown bullet and
// plain-text label, then `curl|wget [-flags] <url> [\]| [sudo] sh|bash|zsh|dash`
// and nothing else up to the end of the line.
const ALLOWED_LINE =
  /^\s*(?:[-*]\s+)?(?:[A-Za-z0-9][A-Za-z0-9 .,/-]*:\s+)?`?(?:curl|wget)(?:\s+-{1,2}[A-Za-z][\w-]*)*\s+(\S+)\s+\\?\|\s*(?:sudo\s+)?(?:ba|z|da)?sh`?\s*$/;
// A bare installer URL mentioned in prose, with only quotes, brackets or a
// final full stop or comma around it.
const bareToken = (line, index, match) => {
  const before = line.slice(0, index).match(/\S*$/)[0];
  const after = line.slice(index + match.length).match(/^\S*/)[0];
  return /^[`'"(<]*$/.test(before) && /^[`'")>]*[.,]?$/.test(after);
};

const isAllowed = (line, col, match, allow) => {
  const cmd = line.match(ALLOWED_LINE);
  if (cmd) return vettedUrl(cmd[1], allow);
  return !/\s/.test(match) && vettedUrl(match, allow) && bareToken(line, col, match) && !/\b(?:curl|wget)\b/.test(line);
};

// Install commands found in `text`, as [{ line, why, match }]. `allow` lists
// URL prefixes of installers vetted for this skill.
export function findInstallCommands(text, allow = []) {
  const lines = text.split('\n');
  const hits = [];
  for (const { re, why } of RULES) {
    for (const m of text.matchAll(re)) {
      const before = text.slice(0, m.index);
      const line = before.split('\n').length;
      const col = m.index - (before.lastIndexOf('\n') + 1);
      if (allow.length && isAllowed(lines[line - 1], col, m[0], allow)) continue;
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
  const { skills } = readManifest(rootDir);
  for (const file of SCANNED.flatMap((p) => walk(join(rootDir, p), []))) {
    const buf = readFileSync(file);
    if (buf.includes(0)) continue; // binary
    const [top, skill] = relative(rootDir, file).split(sep);
    const allow = top === 'skills' && Array.isArray(skills[skill]?.allowInstall) ? skills[skill].allowInstall : [];
    for (const hit of findInstallCommands(buf.toString('utf8'), allow))
      errors.push(`${relative(rootDir, file)}:${hit.line}: ${hit.why}: ${hit.match}`);
  }
  return errors;
}
