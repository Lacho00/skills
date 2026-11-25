---
name: git-protect-main
description: Use when a repository must never receive a direct push to main (or another protected branch) and the hosting side cannot enforce it — a private repo on a free plan, a repo where you are not admin, or a clone other sessions run as a tool. Installs a local git pre-push hook that refuses any push creating, updating or deleting a protected branch, however the push is spelled, and covers every worktree of the repo.
---

# Protect main with a pre-push hook

Installs a git `pre-push` hook that refuses a direct push to `main` (or any
branch listed in `git config guardrails.protected`). Changes then reach the
protected branch only through a pull request. The hook is git's own mechanism,
so it stops a push from a person, an agent or a script alike.

Not for: server-side protection (use branch protection or rulesets when the host
offers them; this hook is the local fallback), or blocking other git commands
such as `reset --hard` or `clean`.

## When to use

- A repo whose `main` must only change through pull requests, and the host does
  not enforce it (private repo on a free plan, no admin rights).
- A clone that other sessions load as a tool, where a stray push to `main`
  changes what every session runs.
- Not for: a repo where you push to `main` on purpose as the normal flow.

## Why a pre-push hook and not a command filter

A filter on the command text (`grep "git push"`) misses `git -C dir push`,
`HEAD:main`, `+main`, `:main` (deletion), `--all` and `--mirror`, and a filter
that depends on `jq` lets everything through when `jq` is missing. Git hands the
pre-push hook the exact remote refs being written, so the check does not depend
on how the command was typed.

## Steps

1. Check the repo has no hooks directory of its own:
   `git -C <repo> config --get core.hooksPath` must print nothing. If it prints
   a path (husky, lefthook), add the contents of
   [scripts/pre-push](scripts/pre-push) to that tool's pre-push step instead
   and stop here.
2. Install: `skills/git-protect-main/scripts/install.sh <repo> [<repo>...]`.
   - It copies the hook into the common git dir (`git rev-parse --git-common-dir`),
     so worktrees share it.
   - It sets `guardrails.protected` to `main` when unset. To protect more
     branches: `git -C <repo> config guardrails.protected "main release"`.
   - It refuses to overwrite a pre-push hook it did not install. Read that hook
     first; if it only guards `main`, rerun with `--replace` (the old hook is
     kept as `pre-push.bak.<timestamp>`). If it does more, merge by hand.
3. Running the installer again updates the hook in place.

## Checks

- `git -C <repo> push --dry-run origin HEAD:main` fails with
  `pre-push: direct push to 'main' ... refused`.
- `git -C <repo> push --dry-run origin HEAD:refs/heads/some-branch` is not
  refused by the hook.
- From a worktree of the same repo, the first check fails the same way.

## Limits

- `git push --no-verify` skips every pre-push hook. That bypass is for a person
  acting on purpose; an agent must never use it. If the agent harness supports
  pre-tool hooks, deny `--no-verify` and `-c core.hooksPath=` on `git push` in
  protected repos (`git config --get guardrails.protected` is set).
- The hook lives in `.git/hooks`, which git does not version: a fresh clone
  needs the installer again.
