# Garmin Platform

Local-first Garmin data platform for syncing activity data, storing raw files, and building custom analytics and visualizations.

## Current Status

This repository is in early setup. The current local foundation includes:
- Python project setup with `uv`, `.venv`, `pyproject.toml`, and `uv.lock`
- Dockerfiles for backend and frontend container scaffolding
- local development and production Compose files
- setup and planning docs in `docs/`

The backend FastAPI project structure is now scaffolded, including environment-based settings management and SQLAlchemy session setup, and the backend Docker container now runs the real FastAPI app. The frontend now has an initial Next.js scaffold and landing page, with the dashboard and data pages still to come.

The first API endpoint is now available at `GET /api/v1/health`.

The first data API endpoints are now available at `GET /api/v1/activities`, `GET /api/v1/activities/{id}`, `GET /api/v1/metrics/daily`, and `GET /api/v1/analytics/trends`, covering activity list/detail views plus daily metrics and basic trend analytics.

The frontend now also includes shared typed API utilities for those endpoints, ready for the dashboard and activity pages.

The initial dashboard page is now wired to live backend data for trends, recent activities, and light health summaries.

The frontend also now has a dedicated activity list page that mirrors the backend list endpoint with filtering and pagination.

The activity detail page is now in place as well, showing summary data, lap breakdown, and record stream samples from the backend detail endpoint.

The activity detail view now also includes pace, heart rate, and elevation charts derived from the stored record stream.

The activity detail page now also includes a Leaflet-based route map when usable GPS samples are available.

The backend now also has a real sync worker entrypoint that can run the Garmin fetch/download/ingest pipeline outside the API server.

The backend also now includes a scheduled sync loop that can rerun that worker every 6 hours.

The Docker setup now also models that separation directly: `backend` and `worker` share the same backend image, environment, and `/app/data` mount, with the worker only overriding the container command.

The backend and frontend Docker images now also run as non-root users and include image-level `HEALTHCHECK` instructions as part of the MVP hardening pass.

The initial database schema now includes `activities`, `activity_laps`, `activity_records`, `daily_metrics`, `sleep_sessions`, and `devices`, with Alembic migrations applied to the local development database. Query indexes are in place for activity start time, sport, distance, and activity record timestamp.

The backend now also includes a typed Garmin client abstraction with a placeholder implementation, ready for the upcoming sync tasks.

Sync checkpoint storage is now scaffolded in the database and service layer so future Garmin syncs can resume from a durable checkpoint.

Garmin activity list fetching is now wired through a checkpoint-aware backend service, ready for the real Garmin adapter and deduplication steps.

New activity detection is now implemented by checking fetched `source_activity_id` values against the local `activities` table and filtering duplicates within a fetch batch.

FIT download and raw file storage now use `garth` plus repo-local session storage in `GARTH_HOME`, with raw FIT files saved under `data/raw/activities/YYYY/MM/<activity_id>.fit`. This path has been validated locally, including idempotent re-runs. After the Garmin session has been bootstrapped, steady-state syncs can resume from `GARTH_HOME` without requiring `GARMIN_PASSWORD`.

FIT summary parsing and activity persistence are now wired into backend services so downloaded FIT files can populate the `activities` table.

Lap parsing and `activity_laps` persistence are now wired into the backend as the next step in the FIT ingestion pipeline.

Per-record FIT stream parsing and `activity_records` persistence are now wired into the backend for time-series activity data.

Structured JSON logging is now in place for Garmin sync runs, FIT downloads, and parser failures, with log verbosity controlled by `LOG_LEVEL`.

Backend startup now also validates database connectivity and required runtime directories before the API reports itself initialized.

## Key Documents

- Product requirements: `docs/prd.md`
- Implementation notes: `docs/implementation.md`
- Development and deployment workflow: `docs/dev_deployment.md`
- Task list and current progress: `docs/tasks.md`
- Local machine setup notes: `docs/imac_setup.md`

## Production Direction

The current planned MVP VPS shape is:
- Ubuntu VPS with Docker Compose
- app checkout under `/opt/garmin-platform/app`
- protected env file at `/opt/garmin-platform/.env`
- persistent runtime data under `/opt/garmin-platform/data`
- long-running `frontend`, `backend`, and `postgres` services
- Garmin sync triggered from the host with the one-shot worker command via `systemd` timer or cron

## VPS Bootstrap

For a fresh VPS, clone the repo anywhere under your home directory and run the bootstrap script with `sudo`:

```bash
git clone <your-repo-url> ~/garmin-platform-bootstrap
cd ~/garmin-platform-bootstrap
sudo TARGET_USER="$(whoami)" ./infra/scripts/bootstrap_vps.sh
```

`TARGET_USER` can be any existing VPS user. It is not specific to `claw`.

What it does:
- installs `docker.io` and `docker-compose-v2`
- prepares `/opt/garmin-platform`
- creates persistent data directories
- adds your user to the `docker` group
- clones or updates the app checkout at `/opt/garmin-platform/app`

After it finishes:

```bash
logout
```

Then reconnect and continue with:

```bash
cd /opt/garmin-platform/app
cp .env.example /opt/garmin-platform/.env
# edit /opt/garmin-platform/.env with real values
APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data ./infra/scripts/deploy.sh
```

Fresh-VPS auth note:
- `bootstrap_vps.sh` now prompts for your Garmin email address and saves it into `/opt/garmin-platform/.env`
- `deploy.sh` now prompts securely for your Garmin password only when it needs to create a fresh Garmin session under `/opt/garmin-platform/data/garth`
- that password is passed only to the bootstrap run and is not saved back into `/opt/garmin-platform/.env`

If the VPS already has valid Garmin session files under `/opt/garmin-platform/data/garth`, you can skip the bootstrap login step during deploy:

```bash
APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data SKIP_GARMIN_BOOTSTRAP=1 ./infra/scripts/deploy.sh
```

Production note:
- the protected production env file lives at `/opt/garmin-platform/.env`
- `GARMIN_EMAIL` may remain in `/opt/garmin-platform/.env` for bootstrap/recovery convenience
- after Garmin session state has been seeded successfully under `/opt/garmin-platform/data/garth`, remove `GARMIN_PASSWORD` from `/opt/garmin-platform/.env`
- from then on, use `SKIP_GARMIN_BOOTSTRAP=1` for steady-state deploys
- current private Tailscale access example: `http://prod-vps:3000` for the frontend
- the production backend API is no longer published on a host port; it is only reachable on the private Compose network by the frontend and operational `docker compose exec` commands
- production backend health checks should now use an in-stack command such as `docker compose -f docker-compose.prod.yml --env-file /opt/garmin-platform/.env exec -T backend python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=5).read().decode())"`

If you want to run Docker Compose commands manually on the VPS, include the external env/data paths explicitly:

```bash
cd /opt/garmin-platform/app
APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data docker compose -f docker-compose.prod.yml --env-file /opt/garmin-platform/.env ps
```

Current VPS convenience setup:
- helper functions can now be installed into `~/.bashrc` with:
  - `APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data /opt/garmin-platform/app/infra/scripts/install_vps_helpers.sh`
- that installer adds documented helpers for `gp-help`, `gp-env`, `gp-app`, `gp-gitpull`, `gp-deploy`, `gp-backup`, `gp-sync-once`, `gp-sync-status`, `gp-reprocess`, `gp-ps`, `gp-logs`, `gp-backend-health`, and `gp-timer-status`
- the installed helpers assume the standard `/opt/garmin-platform` layout
- `gp-help` prints the full VPS helper list with a one-line description of each command
- if you source the installer instead of executing it, it also reloads the updated profile immediately
- the production backend image now builds its runtime UID/GID from the current VPS deploy user so files written under `/opt/garmin-platform/data` land with the expected host ownership instead of low-numbered system accounts

## Production Sync Timer

The production scheduler uses the one-shot worker command, not the long-running local loop.

For the initial large historical import, do not enable the timer immediately. Run the one-shot worker manually first so you can watch for Garmin rate limits, MFA/auth issues, and long-running backfill behavior.

Recommended manual backfill command:

```bash
cd /opt/garmin-platform/app
APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data docker compose -f docker-compose.prod.yml --env-file /opt/garmin-platform/.env exec -T backend python -m app.workers
```

Repeat that command until the backlog is mostly caught up. Then enable the timer for steady-state syncs.

For a smaller test batch first, override the default limit of `100`:

```bash
cd /opt/garmin-platform/app
APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data docker compose -f docker-compose.prod.yml --env-file /opt/garmin-platform/.env exec -T -e GARMIN_SYNC_LIMIT=5 backend python -m app.workers
```

Install it on the VPS with:

```bash
sudo APP_USER="$(whoami)" APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data /opt/garmin-platform/app/infra/scripts/install_sync_timer.sh
```

That installs the timer files but does not enable them yet.
When the initial backfill is under control, enable the timer with:

```bash
sudo systemctl enable --now garmin-sync.timer
```

Or install and enable in one step:

```bash
sudo ENABLE_SYNC_TIMER=1 APP_USER="$(whoami)" APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data /opt/garmin-platform/app/infra/scripts/install_sync_timer.sh
```

This installs:
- `infra/systemd/garmin-sync.service`
- `infra/systemd/garmin-sync.timer`

Useful checks:

```bash
systemctl status garmin-sync.timer --no-pager
systemctl list-timers garmin-sync.timer --no-pager
journalctl -u garmin-sync.service -n 100 --no-pager
```

## Local Development

From the repository root:

```bash
docker compose up --build
```

By default, local Compose now starts `postgres`, `backend`, and `frontend` only. The scheduled `worker` is opt-in so local UI work does not immediately begin Garmin sync activity.

Current local shell convenience setup:
- helper functions can now be installed into `~/.zshrc` with:
  - `./infra/scripts/install_local_helpers.sh`
- that installer adds documented helpers for `gp-local-help`, `gp-local-root`, `gp-local-git-pull`, `gp-local-env`, `gp-local-up`, `gp-local-up-bg`, `gp-local-down`, `gp-local-ps`, `gp-local-logs`, `gp-local-logs-backend`, `gp-local-logs-frontend`, `gp-local-logs-postgres`, `gp-local-worker-up`, `gp-local-worker-once`, `gp-local-backup`, `gp-local-sync-status`, `gp-local-reprocess`, `gp-local-alembic-upgrade`, `gp-local-health`, `gp-local-ci-check`, `gp-local-audit`, and `gp-local-trivy`
- the installed helpers assume the standard local repo path at `/Users/gregrowntree/Documents/Dev/garmin-platform`
- `gp-local-help` prints the full local helper list with a one-line description of each command
- if you source the installer instead of executing it, it also reloads the updated profile immediately
- `gp-local-ci-check` runs the same required checks as GitHub CI: backend tests plus frontend build
- `gp-local-backup` wraps `./infra/scripts/backup.sh` for timestamped local snapshots under `./backups`
- `gp-local-reprocess` wraps `python -m app.reprocess_fit_files` and forwards options such as `--limit` or `--source-activity-id`

## Backup And Restore

Repo-owned scripts now cover both backup creation and clean-environment restore verification:

```bash
./infra/scripts/backup.sh
BACKUP_SOURCE=/path/to/snapshot ./infra/scripts/restore_backup.sh
```

Backup outputs:
- `postgres.dump`
- `raw-data.tar.gz`
- `garth-data.tar.gz`
- `metadata.json`

Default backup locations:
- local: `./backups/<timestamp>`
- VPS: `/opt/garmin-platform/backups/<timestamp>`

Current restore-verification approach:
- restore into a clean data directory with a fresh Postgres volume
- start Postgres and backend
- restore the Postgres dump plus raw/Garmin session archives
- verify backend health and confirm activity data is present
- bring `frontend` back separately afterward with `docker compose ... up -d frontend` or a normal steady-state `deploy.sh` run if you want the full stack back immediately

Recent VPS recovery note:
- this backup/restore flow was used successfully to recover a VPS after regenerating simpler non-`$` secrets and recreating only the Postgres data directory
- practical recommendation: prefer production secrets that do not contain `$` so Docker Compose interpolation cannot become part of the recovery/debug path

Useful commands:

```bash
uv sync
uv run pytest
uv run ruff check .
uv run pip-audit
PYTHONPATH=backend ./.venv/bin/python -c "from fastapi.testclient import TestClient; from app.main import app; client = TestClient(app); print(client.get('/api/v1/health').json())"
set -a && source .env && set +a
PYTHONPATH=backend ./.venv/bin/alembic -c alembic.ini heads
PYTHONPATH=backend ./.venv/bin/python -m app.bootstrap_garmin_auth
PYTHONPATH=backend ./.venv/bin/python -m app.workers
PYTHONPATH=backend ./.venv/bin/python -m app.workers.scheduled_sync
PYTHONPATH=backend ./.venv/bin/python -m app.reprocess_fit_files --limit 10
docker compose up --build backend
docker compose --profile sync up --build worker
docker compose ps
docker compose -f docker-compose.prod.yml config
./infra/scripts/dependency_audit.sh
./infra/scripts/trivy_scan.sh
```

Note:
- `.env` keeps `DATABASE_URL` pointed at `localhost` for host-based development
- the production deploy script rewrites `DATABASE_URL` in `/opt/garmin-platform/.env` to use the `postgres` service hostname for container-to-container networking
- Docker Compose still parses the VPS `.env` for interpolation, so any literal `$` in VPS secret values should remain escaped as `$$`
- the production deploy script decodes those escaped `POSTGRES_*` values when it rewrites `DATABASE_URL` for the backend
- the containerized frontend now uses `INTERNAL_API_BASE_URL=http://backend:8000/api/v1` for server-side requests while the browser continues using `NEXT_PUBLIC_API_BASE_URL`
- set `GARTH_HOME` to a local-only directory such as `./data/garth` so Garmin session state stays out of git
- set `LOG_LEVEL` in `.env` if you want quieter or more verbose backend logs
- dependency vulnerability checks now use `uv run pip-audit` for Python and `cd frontend && npm run audit` for the frontend, with `./infra/scripts/dependency_audit.sh` as the combined command that future CI can reuse
- Trivy scanning now uses `./infra/scripts/trivy_scan.sh`, which scans the repository filesystem for vulnerabilities, leaked secrets, and misconfiguration, then scans the built backend and frontend images
- if `trivy` is not installed locally, `./infra/scripts/trivy_scan.sh` falls back to the official `aquasec/trivy` Docker image
- the Trivy script now suppresses progress noise and focuses on `MEDIUM`, `HIGH`, and `CRITICAL` findings by default; override with `TRIVY_SEVERITIES=LOW,MEDIUM,HIGH,CRITICAL` if you want a broader report
- the Trivy filesystem scan skips `data/garth` by default so known local Garmin session tokens do not dominate the secret scan; override with `TRIVY_SKIP_DIRS=` if you want to include that path
- `trivy.log` is ignored by git so local scan captures can be kept in the repo root without accidental commits
- the current `npm audit` output includes one moderate Next.js advisory tied to `next/image` disk-cache growth; this is an accepted temporary MVP risk because the app is private and does not currently use `next/image`, but it should be revisited before broader exposure
- repository-level security automation now includes `.github/dependabot.yml` for weekly dependency update checks and `.github/workflows/codeql.yml` for CodeQL scanning on push, pull request, and a weekly schedule
- `.github/workflows/ci.yml` now runs backend tests and frontend build verification on push and pull request, with dependency-audit and Trivy checks running in a separate advisory CI job for now
- GitHub-native alerts and automatic security update PRs may still require the repository's security settings to be enabled in the GitHub UI after these files are pushed
- the backend test suite now covers FIT parsing, analytics queries, health/activity API responses, and end-to-end ingestion of a sample FIT file via `PYTHONPATH=backend ./.venv/bin/pytest backend/tests`
- a raw FIT reprocessing command is now available at `PYTHONPATH=backend ./.venv/bin/python -m app.reprocess_fit_files`, which rebuilds activity summaries, laps, and records from stored `raw_file_path` values without modifying the raw FIT files themselves
- the dashboard now includes a sync-status card backed by `GET /api/v1/sync/status`, and `/status/sync` provides a more detailed operator view
- an operator-friendly CLI summary is also available at `PYTHONPATH=backend ./.venv/bin/python -m app.print_sync_status`, with `--json` available for structured output

## Security Checklist

Before a production deploy, the current expected security-verification pass is:

- run dependency checks:
  - `./infra/scripts/dependency_audit.sh`
- run container and repository scans:
  - `./infra/scripts/trivy_scan.sh`
- confirm the automated repository checks are not showing fresh security failures:
  - CodeQL workflow status in GitHub Actions
  - Dependabot/alert status in the GitHub Security tab
- review any open Dependabot PRs and decide whether they should be merged, deferred, or explicitly accepted as risk
- verify there are no unexpected secrets in the repository scan output
- verify any remaining findings are understood and acceptable for the current deployment scope

For the current private MVP, a deploy is generally acceptable when:
- there are no unresolved `CRITICAL` findings
- there are no unresolved unexpected `HIGH` findings in repo/config/container setup
- known accepted risks are documented
- the app test/build checks are green

Current known accepted limitation:
- these checks reduce risk, but they do not prove the codebase or images are vulnerability-free
- some findings may reflect base-image packages, optional tooling, or private-MVP tradeoffs rather than immediately exploitable app defects
