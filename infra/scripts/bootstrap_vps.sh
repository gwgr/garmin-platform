#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_BASE_DIR="${APP_BASE_DIR:-/opt/garmin-platform}"
APP_DIR="${APP_DIR:-${APP_BASE_DIR}/app}"
APP_DATA_DIR="${APP_DATA_DIR:-${APP_BASE_DIR}/data}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_BASE_DIR}/.env}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"
TARGET_USER="${TARGET_USER:-${SUDO_USER:-}}"

log() {
  printf '[bootstrap] %s\n' "$*"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    printf 'This script must be run with sudo/root privileges.\n' >&2
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

run_as_target_user() {
  runuser -u "${TARGET_USER}" -- "$@"
}

read_env_file_value() {
  local key="$1"
  python3 - "$APP_ENV_FILE" "$key" <<'PY'
from pathlib import Path
import sys

env_path = Path(sys.argv[1])
key = sys.argv[2]

if not env_path.exists():
    raise SystemExit(0)

for line in env_path.read_text().splitlines():
    if line.startswith(f"{key}="):
        print(line.split("=", 1)[1].strip())
        break
PY
}

write_env_file_value() {
  local key="$1"
  local value="$2"
  python3 - "$APP_ENV_FILE" "$key" "$value" <<'PY'
from pathlib import Path
import sys

env_path = Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]

lines = []
if env_path.exists():
    lines = env_path.read_text().splitlines()

prefix = f"{key}="
replaced = False
for index, line in enumerate(lines):
    if line.startswith(prefix):
        lines[index] = f"{key}={value}"
        replaced = True
        break

if not replaced:
    lines.append(f"{key}={value}")

env_path.write_text("\n".join(lines) + "\n")
PY
}

prompt_for_garmin_email() {
  local existing_email entered_email

  if [[ ! -t 0 ]]; then
    log "Skipping Garmin email prompt because stdin is not interactive"
    return
  fi

  existing_email="$(read_env_file_value GARMIN_EMAIL || true)"
  if [[ -n "${existing_email}" ]]; then
    read -rp "Garmin email [${existing_email}]: " entered_email
    entered_email="${entered_email:-${existing_email}}"
  else
    read -rp "Garmin email (saved to ${APP_ENV_FILE}; leave blank to skip for now): " entered_email
  fi

  if [[ -z "${entered_email}" ]]; then
    log "Leaving GARMIN_EMAIL unchanged in ${APP_ENV_FILE}"
    return
  fi

  write_env_file_value GARMIN_EMAIL "${entered_email}"
  chown "${TARGET_USER}:${TARGET_USER}" "${APP_ENV_FILE}"
  chmod 600 "${APP_ENV_FILE}"
  log "Saved GARMIN_EMAIL to ${APP_ENV_FILE}"
}

require_root
require_command apt-get
require_command git
require_command python3

if [[ -z "${TARGET_USER}" ]]; then
  printf 'Unable to determine target user. Set TARGET_USER when running the script.\n' >&2
  exit 1
fi

if ! id "${TARGET_USER}" >/dev/null 2>&1; then
  printf 'Target user does not exist: %s\n' "${TARGET_USER}" >&2
  exit 1
fi

REMOTE_URL="$(git -C "${SOURCE_REPO_ROOT}" config --get remote.origin.url || true)"
if [[ -z "${REMOTE_URL}" ]]; then
  printf 'Unable to determine git remote origin from %s\n' "${SOURCE_REPO_ROOT}" >&2
  exit 1
fi

log "Installing Docker and Compose packages"
apt-get update
apt-get install -y docker.io docker-compose-v2

log "Preparing application directories under ${APP_BASE_DIR}"
mkdir -p \
  "${APP_BASE_DIR}" \
  "${APP_DATA_DIR}/postgres" \
  "${APP_DATA_DIR}/raw" \
  "${APP_DATA_DIR}/garth"

touch "${APP_ENV_FILE}"

log "Ensuring docker group access for ${TARGET_USER}"
groupadd -f docker
usermod -aG docker "${TARGET_USER}"

log "Setting ownership for application directories"
chown -R "${TARGET_USER}:${TARGET_USER}" "${APP_BASE_DIR}"
chmod 600 "${APP_ENV_FILE}"
find "${APP_DATA_DIR}/raw" "${APP_DATA_DIR}/garth" -type d -exec chmod a+rwx {} +

prompt_for_garmin_email

if [[ -d "${APP_DIR}/.git" ]]; then
  log "Updating existing repository checkout in ${APP_DIR}"
  run_as_target_user git -C "${APP_DIR}" fetch origin "${TARGET_BRANCH}"
  run_as_target_user git -C "${APP_DIR}" checkout "${TARGET_BRANCH}"
  run_as_target_user git -C "${APP_DIR}" pull --ff-only origin "${TARGET_BRANCH}"
else
  log "Cloning repository into ${APP_DIR}"
  rm -rf "${APP_DIR}"
  run_as_target_user git clone --branch "${TARGET_BRANCH}" "${REMOTE_URL}" "${APP_DIR}"
fi

log "Bootstrap complete"
log "Protected env file: ${APP_ENV_FILE}"
log "App checkout: ${APP_DIR}"
log "Persistent data: ${APP_DATA_DIR}"
log "Next step: log out and back in so docker group membership applies for ${TARGET_USER}"
log "Then run: cd ${APP_DIR} && APP_BASE_DIR=${APP_BASE_DIR} APP_ENV_FILE=${APP_ENV_FILE} APP_DATA_DIR=${APP_DATA_DIR} ./infra/scripts/deploy.sh"
log "The deploy script will prompt for Garmin password only if it needs to create a fresh GARTH_HOME session, and it will not save that password."
log "Later, install the production sync timer with: sudo APP_USER=${TARGET_USER} APP_BASE_DIR=${APP_BASE_DIR} APP_ENV_FILE=${APP_ENV_FILE} APP_DATA_DIR=${APP_DATA_DIR} ${APP_DIR}/infra/scripts/install_sync_timer.sh"
