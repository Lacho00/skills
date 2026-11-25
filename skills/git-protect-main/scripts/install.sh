#!/usr/bin/env bash
# Installs the git-protect-main pre-push hook into one or more git repositories.
# Usage: install.sh [--replace] <repo>...
#   --replace  back up a pre-push hook this skill did not install, then replace it.
# The hook goes into the common git dir, so every worktree of the repo is covered.
# Exit status: 0 when every repo is protected, 1 when any repo was skipped.
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
source_hook="$here/pre-push"
marker='^# git-protect-main pre-push hook'

replace=0
if [ "${1:-}" = "--replace" ]; then
  replace=1
  shift
fi
if [ "$#" -eq 0 ]; then
  echo "usage: install.sh [--replace] <repo>..." >&2
  exit 64
fi

failed=0
for repo in "$@"; do
  if ! git -C "$repo" rev-parse --git-dir >/dev/null 2>&1; then
    echo "$repo: not a git repository; skipped" >&2
    failed=1
    continue
  fi
  if [ -n "$(git -C "$repo" config --get core.hooksPath || true)" ]; then
    echo "$repo: core.hooksPath is set; install the hook in that directory by hand; skipped" >&2
    failed=1
    continue
  fi

  hooks="$(git -C "$repo" rev-parse --path-format=absolute --git-common-dir)/hooks"
  target="$hooks/pre-push"
  if [ -e "$target" ] && ! grep -q "$marker" "$target"; then
    if [ "$replace" -eq 0 ]; then
      echo "$repo: has its own pre-push hook; rerun with --replace to back it up and replace it; skipped" >&2
      failed=1
      continue
    fi
    backup="$target.bak.$(date +%Y%m%d%H%M%S)"
    cp -p "$target" "$backup"
    echo "$repo: previous hook saved as $backup"
  fi

  # Copy then rename: replaces a symlinked hook with a file instead of writing
  # through the link into a hook other repos share, and never leaves a half-written hook.
  mkdir -p "$hooks"
  cp "$source_hook" "$target.tmp.$$"
  chmod +x "$target.tmp.$$"
  mv -f "$target.tmp.$$" "$target"
  if [ -z "$(git -C "$repo" config --get guardrails.protected || true)" ]; then
    git -C "$repo" config guardrails.protected main
  fi
  echo "$repo: protected ($(git -C "$repo" config --get guardrails.protected)); hook at $target"
done

exit "$failed"
