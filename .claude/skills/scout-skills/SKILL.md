---
name: scout-skills
description: Use when looking for a third-party skill to vendor into this repository or add to CATALOG.md — "is there a skill for X", "find a skill for React Bits", "busca skills de X". Searches the skills.sh registry, checks each hit against vendor.json, CATALOG.md and skills/, and reports licence, stars and last push. Never installs anything.
---

# Scout skills

Find candidates for this repository. The only way a third-party skill reaches a
project is through this repository (see `CATALOG.md`), so this skill stops at
a shortlist and a proposal. It never runs `npx skills add`, `npx skills find`
or any other installer.

## Steps

1. Search, one query per idea the user named (product name, library, task):

   ```bash
   node scripts/scout.mjs <query...> [--limit 10]
   ```

   Each line gives the state, the registry id (`owner/repo/skill`), installs,
   stars, last push and licence. Use `--json` to read the rows in full.

2. Read the state column:
   - `vendored`: already here. Point to `skills/<name>`; suggest
     `node scripts/vendor.mjs --check <name>` if it may be stale.
   - `catalogued`, `exception`, `refused`: already decided. Quote the
     `CATALOG.md` row; do not propose it again unless the user asks to revisit.
   - `name-taken`: another skill already uses that name here. Vendoring would
     need `--name`; say which one it would clash with.
   - `new`: a candidate.

3. For each `new` candidate worth keeping (prefer high installs, recent push,
   a known owner), check the licence:
   - `(blocked)`: no licence or not in the allowed list. It can only go to the
     catalog's Exceptions or Refused section, and only if the user wants it.
   - `(check)`: GitHub did not recognise it. Read the file:
     `gh api repos/<owner/repo>/license --jq .content | base64 -d | head -20`.
     Mixed licences (for example, examples or media under other terms) mean
     vendoring must leave those folders out; record that in the row.
   - Find the skill's path in the repository before proposing a vendor command:
     `gh api "repos/<owner/repo>/git/trees/HEAD?recursive=1" --jq '.tree[].path' | grep -i '<skill>/SKILL.md'`.

4. If a hit only matters for a stack the user does not use yet, propose a
   `CATALOG.md` row in the right section instead of vendoring now.

5. Report a short table: skill, registry id, licence, verdict (vendor now,
   catalog, refuse, already here) and the exact next command or row. Wait for
   the user's OK before editing `CATALOG.md` or running `vendor.mjs --add`.

## When the registry has nothing

Say so plainly and ask the user for the repository link. Do not guess
repositories by name.

## Privacy

`CATALOG.md`, commits and PRs here are public. Never name the client project a
skill is wanted for; describe the stack instead ("a React/Next project").
