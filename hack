#!/bin/sh
# vit hack — bootstrap vit from source
# Usage:
#   curl -sL https://raw.githubusercontent.com/solpbc/vit/main/hack | sh
#   curl -sL https://raw.githubusercontent.com/YOURUSERNAME/vit/main/hack | sh
#   sh hack [repo] [dir]
#
# SPDX-License-Identifier: AGPL-3.0-only
# Copyright (c) 2026 sol pbc

set -e

UPSTREAM="solpbc/vit"
SELF="evotao/vit"
REPO="${1:-$SELF}"
DIR="${2:-vit}"

echo "vit hack"
echo ""

# check for git
if ! command -v git >/dev/null 2>&1; then
  echo "error: git is required" >&2
  exit 1
fi

# clone
if [ -d "$DIR" ]; then
  echo "v $DIR/ already exists, skipping clone"
else
  if command -v gh >/dev/null 2>&1; then
    if [ "$REPO" = "$UPSTREAM" ]; then
      echo "v forking $UPSTREAM via gh..."
      gh repo fork "https://github.com/$UPSTREAM.git" --clone -- "$DIR" 2>/dev/null \
        || gh repo clone "$UPSTREAM" "$DIR"
    else
      echo "v cloning $REPO via gh..."
      gh repo clone "$REPO" "$DIR"
      # ensure upstream points to solpbc/vit
      if ! git -C "$DIR" remote get-url upstream >/dev/null 2>&1; then
        git -C "$DIR" remote add upstream "https://github.com/$UPSTREAM.git"
      fi
    fi
  else
    echo "v cloning $REPO..."
    git clone "https://github.com/$REPO.git" "$DIR"
    if [ "$REPO" != "$UPSTREAM" ]; then
      if ! git -C "$DIR" remote get-url upstream >/dev/null 2>&1; then
        git -C "$DIR" remote add upstream "https://github.com/$UPSTREAM.git"
      fi
    fi
  fi
  echo "v cloned to $DIR/"
fi

# install deps
cd "$DIR"
if command -v bun >/dev/null 2>&1; then
  echo "v installing deps with bun..."
  bun install
elif command -v npm >/dev/null 2>&1; then
  echo "v installing deps with npm..."
  npm install
else
  echo "error: bun or npm is required" >&2
  exit 1
fi
echo "v deps installed"

# link
node bin/vit.js link

echo ""
echo "you're now running vit from source."
echo "your repo is at $(pwd)"
echo ""
echo "next:"
echo "  cd $DIR"
echo "  vit setup"
echo "  vit login <your-handle>"
echo "  vit init"
echo ""
echo "hack on vit, ship caps, and push upstream."
