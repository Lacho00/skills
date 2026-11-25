# Personal skills repo — design

Date: 2026-11-25. Size: small change.

## Intent

One source for my own Claude Code skills, grouped by stack (Kotlin, Next.js,
React, and others later), installed per project instead of globally. Skills
installed per project today are copies made by skills.sh; this repo becomes the
upstream for the skills I write or adapt myself.

## Goals

- Public GitHub repo `Lacho00/skills`, branch `main`, MIT licence.
- Install per project with the existing skills.sh flow:
  `npx skills add Lacho00/skills --skill <name>`, recorded in the project's
  `skills-lock.json`.
- Layout: `skills/<name>/SKILL.md`, flat folders, stack prefix in the name
  (`kotlin-…`, `next-…`, `react-…`).
- `README.md` with a table: skill, stack, what it does, install command.
- `NOTICE` crediting adapted sources (first one: affaan-m/ecc, MIT).

## Non-goals

- Third-party skills. `skills-lock.json` already pins their commit per project;
  divergent copies are fixed with `npx skills update` in that project.
- WordPress skills: they belong in `claude-wp-builder`.
- Any change to `~/.claude` or global skills.

## Anti-goals

- Nothing gets installed into a project unless asked; adding this repo changes
  no existing project's workflow.
- No client, project, host or path names in any skill.

## Approaches considered

1. Own skills only (picked): light, reuses skills.sh pinning for third parties.
2. Own + vendored third-party skills: single source for everything, but
   duplicates what skills-lock already does and needs manual upstream syncing.

## Process

- PR per change from `main`; OCR review before each PR; no Claude attribution.
- Initial content: README, LICENSE, NOTICE, a skill template. Skills arrive one
  by one, each approved separately.
