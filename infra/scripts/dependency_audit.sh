#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "[dependency-audit] Running backend Python dependency audit"
(
  cd "${REPO_ROOT}"
  uv run pip-audit
)

echo "[dependency-audit] Running frontend npm dependency audit"
(
  cd "${REPO_ROOT}/frontend"
  npm run audit
)

echo "[dependency-audit] Dependency audits completed"
