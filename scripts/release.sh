#!/usr/bin/env bash
set -euo pipefail

VERSION=${1:-}

if [[ -z "$VERSION" ]]; then
  echo "Usage: pnpm release <version>"
  echo "Example: pnpm release 0.0.4"
  exit 1
fi

# ── guards ────────────────────────────────────────────────────────────────────

if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI is not installed."
  echo "Install it with: sudo dnf install gh"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: releases must be cut from main (currently on '$BRANCH')"
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: working tree has uncommitted changes — commit or stash first"
  exit 1
fi

# ── CI check ──────────────────────────────────────────────────────────────────

echo "Checking CI status on main..."
RUN_JSON=$(gh run list --branch main --limit 1 --json status,conclusion,displayTitle 2>/dev/null)
STATUS=$(echo "$RUN_JSON" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
CONCLUSION=$(echo "$RUN_JSON" | grep -o '"conclusion":"[^"]*"' | cut -d'"' -f4)
TITLE=$(echo "$RUN_JSON" | grep -o '"displayTitle":"[^"]*"' | cut -d'"' -f4)

echo "  Run   : $TITLE"
echo "  Status: $STATUS"
echo "  Result: $CONCLUSION"

if [[ "$STATUS" != "completed" ]]; then
  echo ""
  echo "Error: CI run is still '$STATUS' — wait for it to finish before releasing."
  echo "Track it at: https://github.com/krjani-dev/cellforge/actions"
  exit 1
fi

if [[ "$CONCLUSION" != "success" ]]; then
  echo ""
  echo "Error: CI completed with '$CONCLUSION' — fix the failure before releasing."
  echo "Track it at: https://github.com/krjani-dev/cellforge/actions"
  exit 1
fi

echo "  ✓ CI is green"

# ── version bump + lockfile sync ──────────────────────────────────────────────

echo ""
echo "Bumping version to $VERSION..."
pnpm version "$VERSION" --no-git-tag-version

echo "Syncing lockfile..."
pnpm install

# ── commit, tag, push ─────────────────────────────────────────────────────────

git add package.json pnpm-lock.yaml
git commit -m "chore: release $VERSION"
git tag "v$VERSION"

echo "Pushing main and tag v$VERSION..."
git push origin main
git push origin "v$VERSION"

echo ""
echo "Released v$VERSION. Run 'npm publish' to push to npm."
