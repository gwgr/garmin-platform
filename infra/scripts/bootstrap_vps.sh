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

require_root
require_command apt-get
require_command git

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
