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

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$1" >&2
    exit 1
  fi
}

run_compose() {
  docker compose \
    --project-directory "${COMPOSE_PROJECT_DIR}" \
    -f "${COMPOSE_PROJECT_DIR}/${COMPOSE_FILE}" \
    --env-file "${APP_ENV_FILE}" \
    "$@"
}

require_command git
require_command docker

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
  if ! run_compose run --rm backend python -m app.bootstrap_garmin_auth; then
    cat >&2 <<EOF
Garmin auth bootstrap failed.

If this VPS already has valid session files under ${APP_DATA_DIR}/garth, rerun with:
  SKIP_GARMIN_BOOTSTRAP=1 APP_BASE_DIR=${APP_BASE_DIR} APP_ENV_FILE=${APP_ENV_FILE} APP_DATA_DIR=${APP_DATA_DIR} ./infra/scripts/deploy.sh

If this is a first-time login, Garmin may have rate-limited or challenged the MFA flow. Wait a bit and try again, or seed ${APP_DATA_DIR}/garth from a machine with a valid session.
EOF
    exit 1
  fi
fi

log "Applying database migrations"
run_compose run --rm backend alembic -c alembic.ini upgrade head

log "Starting application services"
run_compose up -d frontend backend

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
