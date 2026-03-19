#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROFILE_FILE="${PROFILE_FILE:-${HOME}/.zshrc}"

BEGIN_MARKER="# >>> garmin-platform local helpers >>>"
END_MARKER="# <<< garmin-platform local helpers <<<"

HELPER_BLOCK=$(cat <<EOF
${BEGIN_MARKER}

# Change into the local garmin-platform repo root.
gp-local-root() {
  cd "${REPO_ROOT}"
}

# Pull the latest changes for the local garmin-platform repo.
gp-local-git-pull() {
  gp-local-root
  git pull origin main
}

# Load the local .env file into the current shell.
gp-local-env() {
  gp-local-root
  set -a
  source .env
  set +a
}

# Start the local app stack in the foreground: postgres, backend, frontend.
gp-local-up() {
  gp-local-root
  docker compose up --build
}

# Start the local app stack in the background.
gp-local-up-bg() {
  gp-local-root
  docker compose up -d --build
}

# Stop and remove the local app containers.
gp-local-down() {
  gp-local-root
  docker compose down
}

# Show current local container status.
gp-local-ps() {
  gp-local-root
  docker compose ps
}

# Show recent logs for the main local services.
gp-local-logs() {
  gp-local-root
  docker compose logs --tail=100 backend frontend postgres
}

# Show recent backend logs only.
gp-local-logs-backend() {
  gp-local-root
  docker compose logs --tail=100 backend
}

# Show recent frontend logs only.
gp-local-logs-frontend() {
  gp-local-root
  docker compose logs --tail=100 frontend
}

# Show recent Postgres logs only.
gp-local-logs-postgres() {
  gp-local-root
  docker compose logs --tail=100 postgres
}

# Start the local stack including the opt-in Garmin sync worker.
gp-local-worker-up() {
  gp-local-root
  docker compose --profile sync up --build
}

# Run one manual local sync worker pass outside Compose.
gp-local-worker-once() {
  gp-local-root
  gp-local-env
  PYTHONPATH=backend ./.venv/bin/python -m app.workers
}

# Apply the latest Alembic migrations to the local database.
gp-local-alembic-upgrade() {
  gp-local-root
  gp-local-env
  PYTHONPATH=backend ./.venv/bin/alembic -c alembic.ini upgrade head
}

# Check the local backend health endpoint.
gp-local-health() {
  curl -sf http://localhost:8000/api/v1/health
}

# Run the same required checks as GitHub CI: backend tests and frontend build.
gp-local-ci-check() {
  gp-local-root
  uv sync --frozen --dev
  PYTHONPATH=backend uv run pytest backend/tests
  (
    cd frontend
    npm ci
    NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000/api/v1" \
    INTERNAL_API_BASE_URL="http://127.0.0.1:8000/api/v1" \
    npm run build
  )
}

# Run backend and frontend dependency vulnerability checks for the local repo.
gp-local-audit() {
  gp-local-root
  ./infra/scripts/dependency_audit.sh
}

# Run Trivy scans for the local repo, display output live, and save a copy to trivy.log.
gp-local-trivy() {
  gp-local-root
  ./infra/scripts/trivy_scan.sh | tee trivy.log
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

echo "[local-helpers] Installed Garmin Platform helpers into ${PROFILE_FILE}"

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  # When sourced, reload the updated profile into the current shell context.
  # shellcheck disable=SC1090
  source "${PROFILE_FILE}"
  echo "[local-helpers] Reloaded ${PROFILE_FILE}"
else
  echo "[local-helpers] Reload with: source ${PROFILE_FILE}"
fi
