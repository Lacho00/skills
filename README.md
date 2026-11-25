# skills

My own Claude Code skills, grouped by stack and installed per project with
[skills.sh](https://skills.sh) instead of globally.

Third-party skills are not copied here. [CATALOG.md](CATALOG.md) lists the ones
worth installing, with their source.

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
| _none yet_ | | |

## Adding a skill

1. Copy `templates/SKILL.md` to `skills/<name>/SKILL.md`.
2. Name it in kebab-case with a stack prefix: `kotlin-…`, `next-…`, `react-…`,
   `general-…`. The frontmatter `name` must equal the folder name.
3. Write the `description` as "Use when …" (max 1024 characters). It is what
   decides when the skill loads.
4. Keep skills generic: no client, project, host or path names.
5. If the skill adapts someone else's work, add the source to [NOTICE](NOTICE).
6. Run `npm ci && npm test && npm run check`, then open a PR. CI runs the same checks.

## License

[MIT](LICENSE).
