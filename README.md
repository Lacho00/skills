# skills

My own Claude Code skills, grouped by stack and installed per project with
[skills.sh](https://skills.sh) instead of globally.

This repository is the only install source for my projects. Third-party skills
are vendored: copied here unmodified, with their licence, by
`scripts/vendor.mjs`, and recorded in [vendor.json](vendor.json). Nothing is ever
installed from upstream. [CATALOG.md](CATALOG.md) lists third-party skills that
are candidates for vendoring.

## Install a skill into a project

```bash
cd <project>
npx skills add Lacho00/skills --skill <name>
```

The install is recorded in the project's `skills-lock.json`. To pick up later
changes, run `npx skills update` in the project.

## Skills

| Skill | Stack | What it does |
|---|---|---|
| `security-audit` | General (vendored from [cloudflare/security-audit-skill](https://github.com/cloudflare/security-audit-skill), MIT) | Security guidance and source-first vulnerability review |

## Adding a skill

1. Copy `templates/SKILL.md` to `skills/<name>/SKILL.md`.
2. Name it in kebab-case with a stack prefix: `kotlin-…`, `next-…`, `react-…`,
   `general-…`. The frontmatter `name` must equal the folder name.
3. Write the `description` as "Use when …" (max 1024 characters). It is what
   decides when the skill loads.
4. Keep skills generic: no client, project, host or path names.
5. If the skill adapts someone else's work, add the source to [NOTICE](NOTICE).
6. Run `npm ci && npm test && npm run check`, then open a PR. CI runs the same checks.

## Vendoring a third-party skill

```bash
node scripts/vendor.mjs --add <owner/repo> <path-to-skill-folder>   # first copy
node scripts/vendor.mjs --check                                     # compare with upstream
node scripts/vendor.mjs --update [name...]                          # copy the latest upstream commit
```

- Only MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause and ISC sources are copied.
  A source without a licence file, or whose licence changes to anything else,
  is refused and the old copy is kept.
- The licence file goes into the skill folder; NOTICE is regenerated from
  vendor.json.
- Copies stay unmodified: CI compares each one with the hash in vendor.json.
  To adapt a skill, write a new own skill instead. If a copy really has to be
  edited, set `"modified": true` in its vendor.json entry; updates then only
  report upstream changes.
- CI fails if any file asks an agent to install skills, plugins or scripts from
  outside this repository.

## License

[MIT](LICENSE).
