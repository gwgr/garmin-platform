#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "[dependency-audit] Running backend Python dependency audit"
(
  cd "${REPO_ROOT}"
  requirements_file="$(mktemp)"
  trap 'rm -f "${requirements_file}"' EXIT
  uv export --frozen --no-dev --format requirements-txt > "${requirements_file}"
  uv run pip-audit -r "${requirements_file}"
)

echo "[dependency-audit] Running frontend npm dependency audit"
(
  cd "${REPO_ROOT}/frontend"
  npm run audit
)

echo "[dependency-audit] Dependency audits completed"
