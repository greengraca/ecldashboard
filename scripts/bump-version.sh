#!/usr/bin/env bash
# Auto-bump version in package.json on every commit.
# Called by .git/hooks/commit-msg with the commit message file as $1.
# Keywords: [major] bumps major, [minor] bumps minor, default bumps patch.

set -e

COMMIT_MSG_FILE="$1"
if [ -z "$COMMIT_MSG_FILE" ] || [ ! -f "$COMMIT_MSG_FILE" ]; then
  echo "bump-version: no commit message file provided, skipping"
  exit 0
fi

COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")
REPO_ROOT=$(git rev-parse --show-toplevel)
PKG="$REPO_ROOT/package.json"

CURRENT=$(node -p "require('$PKG').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

if echo "$COMMIT_MSG" | grep -qi '\[major\]'; then
  MAJOR=$((MAJOR + 1))
  MINOR=0
  PATCH=0
elif echo "$COMMIT_MSG" | grep -qi '\[minor\]'; then
  MINOR=$((MINOR + 1))
  PATCH=0
else
  PATCH=$((PATCH + 1))
fi

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PKG', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('$PKG', JSON.stringify(pkg, null, 2) + '\n');
"

git add "$PKG"
echo "bump-version: $CURRENT → $NEW_VERSION"
