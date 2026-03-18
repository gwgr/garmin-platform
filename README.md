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

If the VPS already has valid Garmin session files under `/opt/garmin-platform/data/garth`, you can skip the bootstrap login step during deploy:

```bash
APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data SKIP_GARMIN_BOOTSTRAP=1 ./infra/scripts/deploy.sh
```

## Local Development

From the repository root:

```bash
docker compose up --build
```

Useful commands:

```bash
uv sync
uv run pytest
uv run ruff check .
PYTHONPATH=backend ./.venv/bin/python -c "from fastapi.testclient import TestClient; from app.main import app; client = TestClient(app); print(client.get('/api/v1/health').json())"
set -a && source .env && set +a
PYTHONPATH=backend ./.venv/bin/alembic -c alembic.ini heads
PYTHONPATH=backend ./.venv/bin/python -m app.bootstrap_garmin_auth
PYTHONPATH=backend ./.venv/bin/python -m app.workers
PYTHONPATH=backend ./.venv/bin/python -m app.workers.scheduled_sync
docker compose up --build backend
docker compose up --build worker
docker compose ps
docker compose -f docker-compose.prod.yml config
```

Note:
- `.env` keeps `DATABASE_URL` pointed at `localhost` for host-based development
- the Compose files override that value to use the `postgres` service hostname for container-to-container networking
- set `GARTH_HOME` to a local-only directory such as `./data/garth` so Garmin session state stays out of git
- set `LOG_LEVEL` in `.env` if you want quieter or more verbose backend logs
