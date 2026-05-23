#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if ! command -v python3 >/dev/null 2>&1; then
  echo "pre-commit blocked: python3 is not installed." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "pre-commit blocked: npm is not installed." >&2
  echo "Install Node.js and npm before committing." >&2
  exit 1
fi

echo "Running backend checks..."
python3 -m ruff check backend
python3 -m ruff format --check backend
python3 -m pytest

echo "Running mobile checks..."
npm run mobile:lint
npm run mobile:format:check
npm run mobile:typecheck
npm run mobile:test