#!/usr/bin/env bash

set -euo pipefail

APP_BASE_DIR="${APP_BASE_DIR:-/opt/garmin-platform}"
APP_DIR="${APP_DIR:-${APP_BASE_DIR}/app}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_BASE_DIR}/.env}"
APP_DATA_DIR="${APP_DATA_DIR:-${APP_BASE_DIR}/data}"
PROFILE_FILE="${PROFILE_FILE:-${HOME}/.bashrc}"

BEGIN_MARKER="# >>> garmin-platform vps helpers >>>"
END_MARKER="# <<< garmin-platform vps helpers <<<"

HELPER_BLOCK=$(cat <<EOF
${BEGIN_MARKER}

# Export the standard Garmin Platform VPS environment variables.
gp-env() {
  export APP_BASE_DIR="${APP_BASE_DIR}"
  export APP_ENV_FILE="${APP_ENV_FILE}"
  export APP_DATA_DIR="${APP_DATA_DIR}"
}

# Change into the Garmin Platform app checkout on the VPS.
gp-app() {
  cd "${APP_DIR}"
}

# Pull latest main and run the standard steady-state deploy flow.
gp-deploy() {
  gp-env
  cd "${APP_DIR}" && SKIP_GARMIN_BOOTSTRAP=1 ./infra/scripts/deploy.sh
}

# Run one manual one-shot sync worker pass on the VPS.
gp-sync-once() {
  gp-env
  cd "${APP_DIR}" && SKIP_GARMIN_BOOTSTRAP=1 docker compose -f docker-compose.prod.yml --env-file "${APP_ENV_FILE}" run --rm backend python -m app.workers
}

# Show current production container status on the VPS.
gp-ps() {
  gp-env
  cd "${APP_DIR}" && docker compose -f docker-compose.prod.yml --env-file "${APP_ENV_FILE}" ps
}

# Show recent backend logs from the production Compose stack.
gp-logs() {
  gp-env
  cd "${APP_DIR}" && docker compose -f docker-compose.prod.yml --env-file "${APP_ENV_FILE}" logs --tail=100 backend
}

# Show the current Garmin sync timer status.
gp-timer-status() {
  systemctl status garmin-sync.timer --no-pager
}

${END_MARKER}
EOF
)

mkdir -p "$(dirname "${PROFILE_FILE}")"
touch "${PROFILE_FILE}"

TMP_FILE="$(mktemp)"
awk -v begin="${BEGIN_MARKER}" -v end="${END_MARKER}" '
  $0 == begin { skip=1; next }
  $0 == end { skip=0; next }
  !skip { print }
' "${PROFILE_FILE}" > "${TMP_FILE}"

{
  cat "${TMP_FILE}"
  printf '\n%s\n' "${HELPER_BLOCK}"
} > "${PROFILE_FILE}"

rm -f "${TMP_FILE}"

echo "[vps-helpers] Installed Garmin Platform helpers into ${PROFILE_FILE}"

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  # When sourced, reload the updated profile into the current shell context.
  # shellcheck disable=SC1090
  source "${PROFILE_FILE}"
  echo "[vps-helpers] Reloaded ${PROFILE_FILE}"
else
  echo "[vps-helpers] Reload with: source ${PROFILE_FILE}"
fi
