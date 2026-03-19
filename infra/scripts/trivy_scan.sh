#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TRIVY_TARGET_PATH="${TRIVY_TARGET_PATH:-${REPO_ROOT}}"
TRIVY_BACKEND_IMAGE_REF="${TRIVY_BACKEND_IMAGE_REF:-garmin-platform-backend:latest}"
TRIVY_FRONTEND_IMAGE_REF="${TRIVY_FRONTEND_IMAGE_REF:-garmin-platform-frontend:latest}"
TRIVY_SCANNERS="${TRIVY_SCANNERS:-vuln,secret,misconfig}"
TRIVY_IMAGE="${TRIVY_IMAGE:-aquasec/trivy:0.63.0}"
TRIVY_SEVERITIES="${TRIVY_SEVERITIES:-MEDIUM,HIGH,CRITICAL}"
TRIVY_SKIP_DIRS="${TRIVY_SKIP_DIRS:-${REPO_ROOT}/data/garth}"

TRIVY_COMMON_ARGS=(
  --quiet
  --severity "${TRIVY_SEVERITIES}"
)

run_trivy() {
  if command -v trivy >/dev/null 2>&1; then
    trivy "${TRIVY_COMMON_ARGS[@]}" "$@"
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    docker run --rm \
      -v "${REPO_ROOT}:${REPO_ROOT}" \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -w "${REPO_ROOT}" \
      "${TRIVY_IMAGE}" \
      "${TRIVY_COMMON_ARGS[@]}" \
      "$@"
    return
  fi

  echo "[trivy-scan] Neither 'trivy' nor Docker is available on PATH" >&2
  exit 1
}

echo "[trivy-scan] Scanning repository filesystem for vulnerabilities, secrets, and misconfiguration"
run_trivy fs --scanners "${TRIVY_SCANNERS}" --skip-dirs "${TRIVY_SKIP_DIRS}" "${TRIVY_TARGET_PATH}"

echo "[trivy-scan] Scanning backend image ${TRIVY_BACKEND_IMAGE_REF}"
run_trivy image --scanners "${TRIVY_SCANNERS}" "${TRIVY_BACKEND_IMAGE_REF}"

echo "[trivy-scan] Scanning frontend image ${TRIVY_FRONTEND_IMAGE_REF}"
run_trivy image --scanners "${TRIVY_SCANNERS}" "${TRIVY_FRONTEND_IMAGE_REF}"

echo "[trivy-scan] Trivy scans completed"
