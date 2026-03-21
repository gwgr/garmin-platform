#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_BASE_DIR="${APP_BASE_DIR:-${REPO_ROOT}}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_BASE_DIR}/.env}"
APP_DATA_DIR="${APP_DATA_DIR:-${APP_BASE_DIR}/data}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-${REPO_ROOT}}"
BACKUP_ROOT="${BACKUP_ROOT:-${APP_BASE_DIR}/backups}"
BACKUP_LABEL="${BACKUP_LABEL:-$(date -u +"%Y%m%dT%H%M%SZ")}"

log() {
  printf '[backup] %s\n' "$*"
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
require_command git
require_command python3
require_command tar

if [[ ! -f "${APP_ENV_FILE}" ]]; then
  printf 'Expected env file not found: %s\n' "${APP_ENV_FILE}" >&2
  exit 1
fi

if [[ ! -d "${APP_DATA_DIR}" ]]; then
  printf 'Expected data directory not found: %s\n' "${APP_DATA_DIR}" >&2
  exit 1
fi

POSTGRES_USER="$(read_env_file_value POSTGRES_USER || true)"
POSTGRES_DB="$(read_env_file_value POSTGRES_DB || true)"

if [[ -z "${POSTGRES_USER}" || -z "${POSTGRES_DB}" ]]; then
  printf 'POSTGRES_USER and POSTGRES_DB must be set in %s\n' "${APP_ENV_FILE}" >&2
  exit 1
fi

SNAPSHOT_DIR="${BACKUP_ROOT}/${BACKUP_LABEL}"
mkdir -p "${SNAPSHOT_DIR}"

log "Checking postgres service availability"
run_compose ps postgres >/dev/null

log "Creating PostgreSQL dump"
run_compose exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' > "${SNAPSHOT_DIR}/postgres.dump"

if [[ -d "${APP_DATA_DIR}/raw" ]]; then
  log "Archiving raw FIT storage"
  tar -C "${APP_DATA_DIR}" -czf "${SNAPSHOT_DIR}/raw-data.tar.gz" raw
fi

if [[ -d "${APP_DATA_DIR}/garth" ]]; then
  log "Archiving Garmin session storage"
  tar -C "${APP_DATA_DIR}" -czf "${SNAPSHOT_DIR}/garth-data.tar.gz" garth
fi

log "Writing backup metadata"
python3 - "${SNAPSHOT_DIR}" "${APP_DATA_DIR}" "${COMPOSE_FILE}" "${APP_ENV_FILE}" "${POSTGRES_DB}" "${POSTGRES_USER}" "${REPO_ROOT}" <<'PY'
from __future__ import annotations

from pathlib import Path
import json
import subprocess
import sys
from datetime import datetime, UTC

snapshot_dir = Path(sys.argv[1])
app_data_dir = Path(sys.argv[2])
compose_file = sys.argv[3]
app_env_file = sys.argv[4]
postgres_db = sys.argv[5]
postgres_user = sys.argv[6]
repo_root = Path(sys.argv[7])

def count_matching_files(root: Path, pattern: str) -> int:
    if not root.exists():
        return 0
    return sum(1 for _ in root.rglob(pattern))

git_commit = subprocess.check_output(
    ["git", "-C", str(repo_root), "rev-parse", "HEAD"],
    text=True,
).strip()

metadata = {
    "created_at_utc": datetime.now(UTC).isoformat(),
    "postgres_db": postgres_db,
    "postgres_user": postgres_user,
    "compose_file": compose_file,
    "app_env_file": app_env_file,
    "app_data_dir": str(app_data_dir),
    "git_commit": git_commit,
    "raw_fit_file_count": count_matching_files(app_data_dir / "raw", "*.fit"),
    "garth_file_count": count_matching_files(app_data_dir / "garth", "*"),
    "artifacts": sorted([*(path.name for path in snapshot_dir.iterdir()), "metadata.json"]),
}

(snapshot_dir / "metadata.json").write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n")
PY

log "Updating latest backup pointer"
ln -sfn "${SNAPSHOT_DIR}" "${BACKUP_ROOT}/latest"

log "Backup complete: ${SNAPSHOT_DIR}"
