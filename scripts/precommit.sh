#!/usr/bin/env bash
# Quality gate run by .githooks/pre-commit and by `npm run precommit`.
# Keep it fast, deterministic and safe to run on any machine with `npm ci` installed.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

echo "== precommit: contracts =="
npx hardhat compile
npx hardhat test

if [ -f frontend/package.json ]; then
  echo "== precommit: frontend build =="
  (cd frontend && npm run build)

  if node -e "process.exit(require('./frontend/package.json').scripts?.test ? 0 : 1)"; then
    echo "== precommit: frontend tests =="
    (cd frontend && npm test)
  fi
else
  echo "== precommit: frontend not initialized — skipped =="
fi

echo "== precommit: guard rails =="

STAGED="$(git diff --cached --name-only --diff-filter=ACM || true)"

if echo "$STAGED" | grep -qE '^private/'; then
  echo "ERROR: private/ is not tracked by Git. Unstage it." >&2
  exit 1
fi

if echo "$STAGED" | grep -E '(^|/)\.env($|\.)' | grep -vE '\.env\.example$' | grep -q .; then
  echo "ERROR: a .env file is staged. Remove it from the index." >&2
  exit 1
fi

if echo "$STAGED" | grep -qE '\.(pem|key|p12|keystore)$|(^|/)wallet.*\.json$|(^|/)secrets.*\.json$'; then
  echo "ERROR: a key or wallet file is staged. Remove it from the index." >&2
  exit 1
fi

if grep -RInE '\b(it|describe|context)\.only\s*\(' test frontend/src 2>/dev/null | grep -q .; then
  echo "ERROR: a focused test (.only) is present. Remove it." >&2
  exit 1
fi

if git diff --cached -U0 | grep -qE '^\+(<{7}|={7}|>{7})'; then
  echo "ERROR: conflict markers are staged." >&2
  exit 1
fi

echo "precommit: OK"
