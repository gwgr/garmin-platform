#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_BASE_DIR="${APP_BASE_DIR:-${REPO_ROOT}}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_BASE_DIR}/.env}"
APP_DATA_DIR="${APP_DATA_DIR:-${APP_BASE_DIR}/data}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-${REPO_ROOT}}"
BACKUP_SOURCE="${BACKUP_SOURCE:-}"
FORCE_RESTORE="${FORCE_RESTORE:-0}"
VERIFY_RESTORE="${VERIFY_RESTORE:-1}"

log() {
  printf '[restore] %s\n' "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
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

run_compose() {
  APP_ENV_FILE="${APP_ENV_FILE}" APP_DATA_DIR="${APP_DATA_DIR}" APP_UID="$(id -u)" APP_GID="$(id -g)" docker compose \
    --project-directory "${COMPOSE_PROJECT_DIR}" \
    -f "${COMPOSE_PROJECT_DIR}/${COMPOSE_FILE}" \
    --env-file "${APP_ENV_FILE}" \
    "$@"
}

require_command docker
require_command python3
require_command tar

if [[ -z "${BACKUP_SOURCE}" ]]; then
  printf 'Set BACKUP_SOURCE to the backup snapshot directory you want to restore.\n' >&2
  exit 1
fi

if [[ ! -d "${BACKUP_SOURCE}" ]]; then
  printf 'Backup snapshot directory not found: %s\n' "${BACKUP_SOURCE}" >&2
  exit 1
fi

if [[ ! -f "${APP_ENV_FILE}" ]]; then
  printf 'Expected env file not found: %s\n' "${APP_ENV_FILE}" >&2
  exit 1
fi

POSTGRES_USER="$(read_env_file_value POSTGRES_USER || true)"
POSTGRES_DB="$(read_env_file_value POSTGRES_DB || true)"

if [[ -z "${POSTGRES_USER}" || -z "${POSTGRES_DB}" ]]; then
  printf 'POSTGRES_USER and POSTGRES_DB must be set in %s\n' "${APP_ENV_FILE}" >&2
  exit 1
fi

if [[ "${FORCE_RESTORE}" != "1" ]]; then
  if [[ -d "${APP_DATA_DIR}/postgres" ]] && find "${APP_DATA_DIR}/postgres" -mindepth 1 -print -quit | grep -q .; then
    printf 'Target postgres data directory is not empty: %s\n' "${APP_DATA_DIR}/postgres" >&2
    printf 'Re-run with FORCE_RESTORE=1 if you want to replace the existing restore target.\n' >&2
    exit 1
  fi

  if [[ -d "${APP_DATA_DIR}/raw" ]] && find "${APP_DATA_DIR}/raw" -mindepth 1 -print -quit | grep -q .; then
    printf 'Target raw data directory is not empty: %s\n' "${APP_DATA_DIR}/raw" >&2
    printf 'Re-run with FORCE_RESTORE=1 if you want to replace the existing restore target.\n' >&2
    exit 1
  fi

  if [[ -d "${APP_DATA_DIR}/garth" ]] && find "${APP_DATA_DIR}/garth" -mindepth 1 -print -quit | grep -q .; then
    printf 'Target garth data directory is not empty: %s\n' "${APP_DATA_DIR}/garth" >&2
    printf 'Re-run with FORCE_RESTORE=1 if you want to replace the existing restore target.\n' >&2
    exit 1
  fi
fi

log "Stopping current compose services"
run_compose down

log "Preparing restore target directories"
mkdir -p "${APP_DATA_DIR}"
rm -rf "${APP_DATA_DIR}/postgres"
mkdir -p "${APP_DATA_DIR}/postgres"

if [[ -f "${BACKUP_SOURCE}/raw-data.tar.gz" ]]; then
  rm -rf "${APP_DATA_DIR}/raw"
  log "Restoring raw FIT storage"
  tar -C "${APP_DATA_DIR}" -xzf "${BACKUP_SOURCE}/raw-data.tar.gz"
fi

if [[ -f "${BACKUP_SOURCE}/garth-data.tar.gz" ]]; then
  rm -rf "${APP_DATA_DIR}/garth"
  log "Restoring Garmin session storage"
  tar -C "${APP_DATA_DIR}" -xzf "${BACKUP_SOURCE}/garth-data.tar.gz"
fi

log "Starting PostgreSQL"
run_compose up -d postgres

log "Waiting for PostgreSQL health"
for attempt in {1..15}; do
  if run_compose exec -T postgres sh -lc 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
    break
  fi

  if [[ "${attempt}" -eq 15 ]]; then
    log "PostgreSQL did not become healthy in time"
    run_compose logs --tail=50 postgres
    exit 1
  fi

  sleep 2
done

log "Restoring PostgreSQL dump"
cat "${BACKUP_SOURCE}/postgres.dump" | run_compose exec -T postgres sh -lc 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges'

if [[ "${VERIFY_RESTORE}" == "1" ]]; then
  log "Starting backend for restore verification"
  run_compose up -d backend

  log "Waiting for backend health"
  for attempt in {1..15}; do
    if run_compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=5)" >/dev/null 2>&1; then
      break
    fi

    if [[ "${attempt}" -eq 15 ]]; then
      log "Backend did not become healthy in time"
      run_compose logs --tail=50 backend
      exit 1
    fi

    sleep 2
  done

  log "Capturing restore verification summary"
  run_compose exec -T backend python - <<'PY'
from sqlalchemy import func, select

from app.db import get_session_factory
from app.models import Activity

session = get_session_factory()()
try:
    activity_count = session.scalar(select(func.count(Activity.id))) or 0
    latest_source_id = session.scalar(
        select(Activity.source_activity_id).order_by(Activity.start_time.desc(), Activity.id.desc()).limit(1)
    )
    print(f"Restored activities: {activity_count}")
    print(f"Latest source activity id: {latest_source_id or '--'}")
finally:
    session.close()
PY
fi

log "Restore complete from ${BACKUP_SOURCE}"
