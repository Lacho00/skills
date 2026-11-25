# Skills Repo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish an empty-but-valid public skills repo that skills.sh can install from.

**Architecture:** Plain markdown repo. Skills live in `skills/<name>/SKILL.md`. A small
Node script validates every skill's frontmatter and runs in CI, so later skill PRs
are checked automatically. The template lives outside `skills/` so skills.sh never
offers it for install.

**Tech Stack:** Markdown, Node 24 (one dev dependency: yaml), GitHub Actions, `gh`.

**Spec:** `docs/superpowers/specs/2026-11-25-skills-repo-design.md`

## Global Constraints

- Repo `Lacho00/skills`, public, branch `main`, MIT licence, copyright "Lacho00".
- Skill path: `skills/<name>/SKILL.md`; `name` in frontmatter equals folder name.
- Folder names: lowercase kebab-case, stack prefix (`kotlin-`, `next-`, `react-`, ...).
- No client, project, host or path names anywhere. No Claude attribution lines.
- `.codebase-memory/` never committed.

## Review Focus

- Skill folder whose `name` differs from folder name: validator must fail (Task 1 test).
- SKILL.md missing `description` or with empty description: validator must fail (Task 1 test).
- `skills/` empty (initial state): validator passes with "0 skills" (Task 1 test).
- Template accidentally under `skills/`: not possible by layout; validator ignores `templates/`.
- Description over 1024 chars (Claude Code limit): validator must fail (Task 1 test).

---

### Task 1: Skill validator + CI

**Files:**
- Create: `scripts/check-skills.mjs`
- Create: `tests/check-skills.test.mjs` (uses `node:test`, temp dirs as fixtures)
- Create: `.github/workflows/check.yml`
- Create: `package.json` (`"type": "module"`, scripts `check`, `test`; no deps)

**Interfaces:**
- Produces: `checkSkills(rootDir: string) -> { count: number, errors: string[] }` exported
  from `scripts/check-skills.mjs`; CLI `node scripts/check-skills.mjs [root]` exits 1 on errors.

- [ ] Step 1: tests — `empty skills dir -> count 0, errors []`; `valid skill -> count 1`;
  `name != folder -> error mentions folder`; `missing description -> error`;
  `description > 1024 chars -> error`; `folder not kebab-case -> error`.
- [ ] Step 2: `node --test tests/` fails (module missing).
- [ ] Step 3: implement; frontmatter parsed by regex between leading `---` lines, keys `name`, `description`.
- [ ] Step 4: `node --test tests/` passes; `node scripts/check-skills.mjs` prints `0 skills, ok`.
- [ ] Step 5: workflow runs `node --test tests/ && node scripts/check-skills.mjs` on push and PR (Node 24).
- [ ] Step 6: commit `feat: add skill frontmatter validator and CI`.

### Task 2: Docs, licence, template

**Files:**
- Create: `README.md` — purpose, install command
  `npx skills add Lacho00/skills --skill <name>`, update command `npx skills update`,
  empty table `| Skill | Stack | What it does |`, naming rules, "how to add a skill".
- Create: `LICENSE` (MIT, 2026, Lacho00)
- Create: `NOTICE` — header only, "Adapted sources" list (first entry added with first adapted skill).
- Create: `templates/SKILL.md` — frontmatter `name`, `description` ("Use when ...") and sections
  When to use / Steps / Checks.
- Create: `.gitignore` (`.codebase-memory/`, `node_modules/`)
- Create: `CATALOG.md` — recommended third-party skills by stack (General, Next/React, Kotlin/Android),
  each row `| Skill | Source | Install |`, install via `npx skills add <owner/repo> --skill <name>`.
  Sources: mattpocock/skills, affaan-m/ecc, and the sources already pinned in local `skills-lock.json` files.
  Links to sources only; nothing vendored.

- [ ] Step 1: copy template to a temp `skills/<x>/` and run validator: passes. Remove it.
- [ ] Step 1b: every `--skill` name in CATALOG.md exists at its source (`gh api` tree check).
- [ ] Step 2: grep the tree for client/company names, local hosts and attribution lines (`co-authored`, `generated with`); expect no hits.
- [ ] Step 3: commit `docs: add readme, licence, notice, catalog and skill template`.

### Task 3: Publish

- [ ] Step 1: OCR review of the whole tree (skill `ocr-review`); fix findings.
- [ ] Step 2: `gh repo create Lacho00/skills --public --source . --push --description "Personal Claude Code skills, installed per project"`.
- [ ] Step 3: CI green: `gh run watch` exits 0.
- [ ] Step 4: index in codebase-memory as `srv-http-skills` (`mode="full"`).
