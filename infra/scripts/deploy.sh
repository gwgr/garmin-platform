#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

APP_BASE_DIR="${APP_BASE_DIR:-/opt/garmin-platform}"
APP_ENV_FILE="${APP_ENV_FILE:-${APP_BASE_DIR}/.env}"
APP_DATA_DIR="${APP_DATA_DIR:-${APP_BASE_DIR}/data}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
COMPOSE_PROJECT_DIR="${COMPOSE_PROJECT_DIR:-${REPO_ROOT}}"
SKIP_GARMIN_BOOTSTRAP="${SKIP_GARMIN_BOOTSTRAP:-0}"

log() {
  printf '[deploy] %s\n' "$*"
}

check_backend_health() {
  run_compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=5)"
}

has_saved_garmin_session() {
  [[ -f "${APP_DATA_DIR}/garth/oauth1_token.json" && -f "${APP_DATA_DIR}/garth/oauth2_token.json" ]]
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

normalize_env_value() {
  local value="${1:-}"
  printf '%s' "${value//\$\$/\$}"
}

sync_database_env() {
  local raw_postgres_user raw_postgres_password raw_postgres_db
  local postgres_user postgres_password postgres_db database_url

  raw_postgres_user="$(read_env_file_value POSTGRES_USER || true)"
  raw_postgres_password="$(read_env_file_value POSTGRES_PASSWORD || true)"
  raw_postgres_db="$(read_env_file_value POSTGRES_DB || true)"

  postgres_user="$(normalize_env_value "${raw_postgres_user}")"
  postgres_password="$(normalize_env_value "${raw_postgres_password}")"
  postgres_db="$(normalize_env_value "${raw_postgres_db}")"

  if [[ -z "${postgres_user}" || -z "${postgres_password}" || -z "${postgres_db}" ]]; then
    cat >&2 <<EOF
POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB must all be set in ${APP_ENV_FILE}.
EOF
    exit 1
  fi

  database_url="$(
    python3 - "${postgres_user}" "${postgres_password}" "${postgres_db}" <<'PY'
from urllib.parse import quote
import sys

postgres_user, postgres_password, postgres_db = sys.argv[1:4]

print(
    "postgresql+psycopg://"
    f"{quote(postgres_user, safe='')}:{quote(postgres_password, safe='')}"
    f"@postgres:5432/{quote(postgres_db, safe='')}"
)
PY
  )"

  write_env_file_value DATABASE_URL "${database_url}"
  chmod 600 "${APP_ENV_FILE}"
}

prompt_for_garmin_password() {
  if [[ ! -t 0 ]]; then
    printf 'Garmin password is required for first-time auth bootstrap, but stdin is not interactive.\n' >&2
    exit 1
  fi

  read -rsp "Garmin password (used once, not saved): " GARMIN_PASSWORD_VALUE
  printf '\n'

  if [[ -z "${GARMIN_PASSWORD_VALUE}" ]]; then
    printf 'Garmin password cannot be empty for first-time auth bootstrap.\n' >&2
    exit 1
  fi
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

run_compose() {
  APP_ENV_FILE="${APP_ENV_FILE}" APP_DATA_DIR="${APP_DATA_DIR}" APP_UID="$(id -u)" APP_GID="$(id -g)" docker compose \
    --project-directory "${COMPOSE_PROJECT_DIR}" \
    -f "${COMPOSE_PROJECT_DIR}/${COMPOSE_FILE}" \
    --env-file "${APP_ENV_FILE}" \
    "$@"
}

run_garmin_bootstrap() {
  local password_value="${1:-}"

  if [[ -n "${password_value}" ]]; then
    GARMIN_PASSWORD="${password_value}" run_compose run --rm -e GARMIN_PASSWORD backend python -m app.bootstrap_garmin_auth
    return
  fi

  run_compose run --rm backend python -m app.bootstrap_garmin_auth
}

require_command git
require_command docker
require_command python3

if [[ ! -f "${APP_ENV_FILE}" ]]; then
  printf 'Expected env file not found: %s\n' "${APP_ENV_FILE}" >&2
  exit 1
fi

if ! git -C "${REPO_ROOT}" diff --quiet || ! git -C "${REPO_ROOT}" diff --cached --quiet; then
  printf 'Refusing to deploy with uncommitted changes in %s\n' "${REPO_ROOT}" >&2
  exit 1
fi

CURRENT_BRANCH="$(git -C "${REPO_ROOT}" rev-parse --abbrev-ref HEAD)"
if [[ "${CURRENT_BRANCH}" != "main" ]]; then
  printf 'Deploy script must be run from the main branch. Current branch: %s\n' "${CURRENT_BRANCH}" >&2
  exit 1
fi

log "Preparing persistent directories in ${APP_DATA_DIR}"
mkdir -p \
  "${APP_DATA_DIR}/postgres" \
  "${APP_DATA_DIR}/raw" \
  "${APP_DATA_DIR}/garth"
find "${APP_DATA_DIR}/raw" "${APP_DATA_DIR}/garth" -type d -exec chmod a+rwx {} +

log "Syncing production database configuration"
sync_database_env

log "Refreshing git checkout"
git -C "${REPO_ROOT}" fetch origin main
git -C "${REPO_ROOT}" pull --ff-only origin main

log "Validating Docker Compose configuration"
run_compose config >/dev/null

log "Building application images"
run_compose build backend frontend

log "Starting PostgreSQL"
run_compose up -d postgres

if [[ "${SKIP_GARMIN_BOOTSTRAP}" == "1" ]]; then
  log "Skipping Garmin auth bootstrap because SKIP_GARMIN_BOOTSTRAP=1"
else
  log "Running Garmin auth bootstrap"
  GARMIN_EMAIL_VALUE="$(read_env_file_value GARMIN_EMAIL || true)"
  GARMIN_PASSWORD_VALUE="${GARMIN_PASSWORD:-}"

  if [[ -z "${GARMIN_EMAIL_VALUE}" ]] && ! has_saved_garmin_session; then
    cat >&2 <<EOF
GARMIN_EMAIL is not set in ${APP_ENV_FILE}.

Set GARMIN_EMAIL in ${APP_ENV_FILE} first, or rerun the fresh VPS bootstrap and enter it when prompted.
EOF
    exit 1
  fi

  if [[ -z "${GARMIN_PASSWORD_VALUE}" ]] && ! has_saved_garmin_session; then
    prompt_for_garmin_password
  fi

  if ! run_garmin_bootstrap "${GARMIN_PASSWORD_VALUE}"; then
    cat >&2 <<EOF
Garmin auth bootstrap failed.

If this VPS already has valid session files under ${APP_DATA_DIR}/garth, rerun with:
  SKIP_GARMIN_BOOTSTRAP=1 APP_BASE_DIR=${APP_BASE_DIR} APP_ENV_FILE=${APP_ENV_FILE} APP_DATA_DIR=${APP_DATA_DIR} ./infra/scripts/deploy.sh

If this is a first-time login, Garmin may have rate-limited or challenged the MFA flow. Wait a bit and try again, or seed ${APP_DATA_DIR}/garth from a machine with a valid session.
EOF
    exit 1
  fi
fi

log "Starting application services"
run_compose up -d backend frontend

log "Applying database migrations"
run_compose exec -T backend alembic -c alembic.ini upgrade head

log "Current service status"
run_compose ps

log "Checking backend health endpoint"
for attempt in {1..15}; do
  if check_backend_health >/dev/null 2>&1; then
    log "Backend health check passed"
    break
  fi

  if [[ "${attempt}" -eq 15 ]]; then
    log "Backend health check did not pass in time"
    run_compose logs --tail=50 backend
    exit 1
  fi

  log "Backend not ready yet; retrying (${attempt}/15)"
  sleep 2
done

log "Recent backend logs"
run_compose logs --tail=50 backend

log "Deploy complete"
