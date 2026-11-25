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

### Weekly upstream updates

`.github/workflows/vendor-update.yml` runs every Monday (or by hand from the
Actions tab). It runs `scripts/vendor-prs.mjs`, which:

- compares every vendored skill with the last upstream commit touching its path;
- for each source that changed, copies the new commit on a `vendor/<owner>-<repo>`
  branch, runs `npm test` and `npm run check`, and opens or refreshes one PR per
  source with links to the upstream diff;
- for a copy marked `"modified": true`, opens an issue instead of a PR;
- fails the job (GitHub emails it) when a source is refused, for example because
  its licence is no longer redistributable. The old copy stays.

It never merges: read the diff, run the OCR review, and merge by hand.

The workflow needs "Allow GitHub Actions to create and approve pull requests"
enabled in the repository settings. PRs opened with the default token do not
trigger the `check` workflow. To run `check` on them too, add a fine-grained PAT
as the `VENDOR_TOKEN` secret.

## Which projects are behind

```bash
npm run status                 # every project next to this repo
npm run status -- <dir> --json
```

Reads each project's `skills-lock.json` and compares the hash of every skill
installed from Lacho00/skills with `skills/<name>` on `origin/main`. It lists the
skills that are behind (run `npx skills update` in that project), the ones no
longer in this repository, and how many skills still come from other sources.

## License

[MIT](LICENSE).
