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

// A URL is vetted when it is already in normal form (no "..", ".", percent
// escapes or userinfo that could move it outside the prefix) and starts with
// one of the prefixes.
const vettedUrl = (u, allow) => {
  let n;
  try {
    n = new URL(u);
  } catch {
    return false;
  }
  if (n.href !== u || n.username || n.password || /%|\/\.{1,2}(?:\/|$)/.test(n.pathname)) return false;
  return allow.some((p) => u.startsWith(p));
};

// A match is allowed only in one exact shape: the vetted URL alone, or
// `curl|wget [-flags] <vetted URL> [\]| [sudo] sh|bash|zsh|dash`. Any other
// token (a second destination, a variable, `-o file; …`) makes it a refusal.
const FLAG = /^-{1,2}[A-Za-z][\w-]*$/;
const PIPE_TAIL = /\s*\\?\|\s*(?:sudo\s+)?(?:ba|z|da)?sh$/;
const isAllowed = (match, allow) => {
  const text = match.trim();
  if (!/\s/.test(text)) return vettedUrl(text, allow);
  if (!PIPE_TAIL.test(text)) return false;
  const [cmd, ...rest] = text.replace(PIPE_TAIL, '').split(/\s+/);
  if (!/^(?:curl|wget)$/.test(cmd)) return false;
  const args = rest.filter((t) => !FLAG.test(t));
  return args.length === 1 && vettedUrl(args[0], allow);
};

// Install commands found in `text`, as [{ line, why, match }]. `allow` lists
// URL prefixes of installers vetted for this skill.
export function findInstallCommands(text, allow = []) {
  const hits = [];
  for (const { re, why } of RULES) {
    for (const m of text.matchAll(re)) {
      if (allow.length && isAllowed(m[0], allow)) continue;
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
