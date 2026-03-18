#!/usr/bin/env bash
# Auto-bump patch version in package.json on every commit.
# Called by .git/hooks/pre-commit — runs before the commit is created,
# so `git add package.json` includes the bump in the same commit.
#
# For minor/major bumps, run manually before committing:
#   npm version minor --no-git-tag-version
#   npm version major --no-git-tag-version

set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
PKG="$REPO_ROOT/package.json"

CURRENT=$(node -p "require('$PKG').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

PATCH=$((PATCH + 1))
NEW_VERSION="$MAJOR.$MINOR.$PATCH"

node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('$PKG', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('$PKG', JSON.stringify(pkg, null, 2) + '\n');
"

git add "$PKG"
echo "bump-version: $CURRENT → $NEW_VERSION"
