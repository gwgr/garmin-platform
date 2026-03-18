#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SYSTEMD_DIR="${REPO_ROOT}/infra/systemd"

APP_BASE_DIR="${APP_BASE_DIR:-/opt/garmin-platform}"
APP_DIR="${APP_DIR:-${APP_BASE_DIR}/app}"
APP_DATA_DIR="${APP_DATA_DIR:-${APP_BASE_DIR}/data}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_BASE_DIR}/.env}"
APP_USER="${APP_USER:-${SUDO_USER:-}}"
ENABLE_SYNC_TIMER="${ENABLE_SYNC_TIMER:-0}"

SERVICE_NAME="garmin-sync.service"
TIMER_NAME="garmin-sync.timer"
SERVICE_DEST="/etc/systemd/system/${SERVICE_NAME}"
TIMER_DEST="/etc/systemd/system/${TIMER_NAME}"

log() {
  printf '[sync-timer] %s\n' "$*"
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

render_template() {
  local template_path="$1"
  sed \
    -e "s|__APP_USER__|${APP_USER}|g" \
    -e "s|__APP_BASE_DIR__|${APP_BASE_DIR}|g" \
    -e "s|__APP_DIR__|${APP_DIR}|g" \
    -e "s|__APP_DATA_DIR__|${APP_DATA_DIR}|g" \
    -e "s|__APP_ENV_FILE__|${APP_ENV_FILE}|g" \
    "${template_path}"
}

require_root
require_command systemctl

if [[ -z "${APP_USER}" ]]; then
  printf 'Unable to determine APP_USER. Set APP_USER when running the script.\n' >&2
  exit 1
fi

if ! id "${APP_USER}" >/dev/null 2>&1; then
  printf 'App user does not exist: %s\n' "${APP_USER}" >&2
  exit 1
fi

if [[ ! -d "${APP_DIR}" ]]; then
  printf 'Expected app directory not found: %s\n' "${APP_DIR}" >&2
  exit 1
fi

if [[ ! -f "${APP_ENV_FILE}" ]]; then
  printf 'Expected env file not found: %s\n' "${APP_ENV_FILE}" >&2
  exit 1
fi

log "Installing ${SERVICE_NAME} and ${TIMER_NAME}"
render_template "${SYSTEMD_DIR}/${SERVICE_NAME}" > "${SERVICE_DEST}"
render_template "${SYSTEMD_DIR}/${TIMER_NAME}" > "${TIMER_DEST}"

log "Reloading systemd"
systemctl daemon-reload

if [[ "${ENABLE_SYNC_TIMER}" == "1" ]]; then
  log "Enabling timer"
  systemctl enable "${TIMER_NAME}"

  log "Starting timer"
  systemctl restart "${TIMER_NAME}"
else
  log "Timer installed but not enabled"
  log "Enable it later with: sudo systemctl enable --now ${TIMER_NAME}"
  log "Or rerun this script with ENABLE_SYNC_TIMER=1"
fi

log "Timer status"
systemctl status "${TIMER_NAME}" --no-pager || true

log "Next trigger"
systemctl list-timers "${TIMER_NAME}" --no-pager || true
