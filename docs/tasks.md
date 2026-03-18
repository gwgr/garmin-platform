# TASKS.md

## Purpose

This file breaks the project into small, sequential tasks for Codex to implement.

Execution rules:
- complete tasks in order unless explicitly directed otherwise
- keep changes small and reviewable
- after each task, ensure code builds and tests pass where applicable
- prefer maintainable code over clever shortcuts

Status legend:
- `[done]` completed in the repository
- `[partial]` started but not finished
- `[next]` recommended next task
- `[todo]` not started

Already completed outside the numbered plan:
- local Python setup with `.python-version`, `pyproject.toml`, `uv.lock`, and `.venv`
- Docker Desktop install and local PostgreSQL wiring

---

## Phase 1 — Repository and Tooling

### Task 1 `[partial]`
Initialize repository structure:
- `docs/`
- `backend/`
- `frontend/`
- `infra/`
- `docker/`

Current state:
- `docs/`, `backend/`, and `frontend/` exist
- `infra/` and `docker/` do not exist yet
- this task remains partial until `infra/` and `docker/` are created

### Task 2 `[done]`
Create root `README.md` that references:
- `docs/prd.md`
- `docs/implementation.md`
- `docs/dev_deployment.md`
- `docs/tasks.md`
- `docs/imac_setup.md`

### Task 3 `[done]`
Create `.env.example` with placeholders for:
- Garmin credentials
- database settings
- backend settings
- frontend API URL

### Task 4 `[done]`
Create `backend/Dockerfile`.

### Task 5 `[done]`
Create `frontend/Dockerfile`.

### Task 6 `[done]`
Create `docker-compose.yml` for local development.

Current state:
- backend, frontend, and PostgreSQL services are defined
- the backend runs the real FastAPI app
- the frontend now runs a Next.js scaffold, with the real dashboard and data pages still pending

### Task 7 `[done]`
Create `docker-compose.prod.yml` for VPS deployment.

---

## Phase 2 — Backend Foundation

### Task 8 `[done]`
Initialize FastAPI backend project structure.

### Task 9 `[done]`
Add backend configuration management for environment variables.

### Task 10 `[done]`
Set up SQLAlchemy models and database session management.

### Task 11 `[done]`
Set up Alembic migrations.

### Task 12 `[done]`
Create initial health endpoint:
- `GET /api/v1/health`

### Task 12A `[done]`
Switch the backend container from the placeholder server to the real FastAPI app runtime and verify the backend starts with `uvicorn`.

---

## Phase 3 — Database Schema

Execution note for every Phase 3 task:
- create or update the SQLAlchemy model as needed
- create or update the Alembic migration
- apply the migration locally with `PYTHONPATH=backend ./.venv/bin/alembic -c alembic.ini upgrade head`
- verify the expected schema change exists in the local development database

### Task 13 `[done]`
Create migration for `activities` table and apply it locally.

### Task 14 `[done]`
Create migration for `activity_laps` table and apply it locally.

### Task 15 `[done]`
Create migration for `activity_records` table and apply it locally.

### Task 16 `[done]`
Create migration for `daily_metrics` table and apply it locally.

### Task 17 `[done]`
Create migration for `sleep_sessions` table and apply it locally.

### Task 18 `[done]`
Create migration for `devices` table and apply it locally.

### Task 19 `[done]`
Add indexes and apply them locally for:
- activity start time
- sport
- distance
- record timestamp

---

## Phase 4 — Garmin Sync and Parsing

### Task 20 `[done]`
Create backend service abstraction for Garmin client access.

### Task 21 `[done]`
Implement sync checkpoint storage.

### Task 22 `[done]`
Implement Garmin activity list fetcher.

### Task 23 `[done]`
Implement new activity detection and deduplication by source activity ID.

### Task 24 `[done]`
Implement FIT file download and raw file storage.

Current state:
- Garmin activity listing and FIT download have been validated locally
- raw files are saved idempotently under `data/raw/activities/YYYY/MM/`

### Task 25 `[done]`
Implement FIT parser service.

### Task 26 `[done]`
Parse and store activity summary data.

Current state:
- FIT summary parsing is implemented with `fitparse`
- parsed activity summaries can now be persisted into the `activities` table from downloaded FIT files
- this flow has been validated locally against a downloaded Garmin activity FIT file

### Task 27 `[done]`
Parse and store lap data.

Current state:
- FIT lap parsing is implemented with `fitparse`
- parsed lap summaries can now be persisted into `activity_laps` for a stored activity

### Task 28 `[done]`
Parse and store per-record stream data.

Current state:
- FIT record stream parsing is implemented with `fitparse`
- parsed record streams can now be persisted into `activity_records` for a stored activity

### Task 29 `[done]`
Add structured logging for sync runs and parser failures.

Current state:
- backend startup now configures one-line JSON logs via the standard library logger
- Garmin fetch, dedupe, download, and ingest paths now emit structured sync events
- FIT parser failures are logged with structured metadata and stack traces

---

## Phase 5 — API Endpoints

### Task 30 `[done]`
Implement:
- `GET /api/v1/activities`

Support:
- pagination
- date filtering
- sport filtering
- sort by start time descending

Current state:
- `GET /api/v1/activities` now returns paginated activity summaries from Postgres
- supports `page`, `page_size`, `start_date`, `end_date`, and `sport` query params
- results are sorted by `start_time` descending
- verified locally against the Postgres-backed app using the current imported activity data

### Task 31 `[done]`
Implement:
- `GET /api/v1/activities/{id}`

Return:
- activity summary
- laps
- stream data
- basic metadata

Current state:
- `GET /api/v1/activities/{id}` now returns the persisted activity summary plus its laps and record stream rows
- missing activities return a `404` with a stable JSON error response
- verified locally against the Postgres-backed app, including the populated lap and record data for activity `1`

### Task 32 `[done]`
Implement:
- `GET /api/v1/metrics/daily`

Current state:
- `GET /api/v1/metrics/daily` now returns paginated daily metric rows from Postgres
- supports `page`, `page_size`, `start_date`, and `end_date` query params
- results are sorted by `metric_date` descending

### Task 33 `[done]`
Implement:
- `GET /api/v1/analytics/trends`

Include:
- weekly distance & time
- monthly distance & time
- last 6 months distance & time
- last 1 year distance & time
- recent activity counts
- resting HR trend if data exists

Current state:
- `GET /api/v1/analytics/trends` now returns current week, current month, last 6 months, and last 1 year activity summaries
- includes recent activity counts for the last 7, 30, and 90 days
- includes a resting heart rate trend series when `daily_metrics` data exists

---

## Phase 6 — Frontend Foundation

### Task 34 `[done]`
Initialize Next.js frontend structure.

Current state:
- the frontend now has a real Next.js scaffold under `frontend/app`
- the frontend Docker image now runs the Next.js dev server instead of the old static placeholder page
- verified locally via `docker compose up --build frontend` and the page loaded at `http://localhost:3000`

### Task 35 `[done]`
Create shared API client utilities.

Current state:
- the frontend now has a shared typed API client in `frontend/lib/api.ts`
- activity list/detail, daily metrics, and analytics trend helpers all use the same base URL and fetch wrapper
- verified locally with `npm install` and `npm run build`

### Task 36 `[done]`
Create dashboard page.

Current state:
- the frontend home page now acts as the initial dashboard
- it uses the shared API client to load analytics trends, recent activities, and daily metrics
- the dashboard is designed to degrade gracefully when backend data is sparse or temporarily unavailable

### Task 37 `[done]`
Create activity list page.

Current state:
- the frontend now has a dedicated `/activities` page
- the activity list page uses the shared API client with URL-driven sport/date filters and pagination
- the page is server-rendered and designed to stay aligned with the backend list endpoint
- verified locally with a clean `npm run build` and browser checks at `/activities`

### Task 38 `[done]`
Create activity detail page.

Current state:
- the frontend now has a dedicated `/activities/[id]` page
- the activity detail page loads summary, lap data, and record stream samples from the backend detail endpoint
- dashboard and activity list entries now link into the activity detail flow
- verified locally with a clean `npm run build` and browser checks at `/activities/1`

### Task 39 `[done]`
Add chart components for:
- pace
- heart rate
- elevation

Current state:
- the frontend now includes reusable SVG-based chart components for pace, heart rate, and elevation
- the activity detail page renders those charts from stored record stream data without requiring an external charting library
- verified locally with a clean `npm run build` and browser checks on `/activities/1`

### Task 40 `[done]`
Add route map component using Leaflet or MapLibre.

Current state:
- the frontend now includes a Leaflet-based route map component on the activity detail page
- the map renders when usable latitude/longitude samples exist and otherwise shows a clear empty-state message
- FIT record coordinates are now normalized to degrees so stored Garmin routes can render correctly
- verified locally with a clean `npm run build` and browser checks on `/activities/1`

---

## Phase 7 — Worker and Scheduling

### Task 41 `[done]`
Create worker entrypoint for sync jobs.

Current state:
- the backend now has a real Garmin sync worker entrypoint in `backend/app/workers/sync_worker.py`
- the worker reuses the existing fetch, dedupe, download, parse, ingest, and checkpoint services
- progress is committed incrementally so processed activities are preserved even if a later item fails
- verified locally against the real Postgres/Garmin setup, and a partial historical sync imported additional activities before the run was stopped

### Task 42 `[done]`
Create scheduled sync command to run every 6 hours.

Current state:
- the backend now includes a repeating scheduled sync loop in `backend/app/workers/scheduled_sync.py`
- the loop reuses the real Garmin sync worker entrypoint and sleeps for `21600` seconds between runs
- it emits structured logs for scheduler start, each tick, completion/failure, sleep, and shutdown
- verified at import level locally; the runtime command is `PYTHONPATH=backend ./.venv/bin/python -m app.workers.scheduled_sync`

### Task 43 `[done]`
Ensure worker and backend can share the same application config and codebase.

Current state:
- the local and production Compose files now define a dedicated `worker` service using the same backend Docker image as the API service
- both `backend` and `worker` now share the same `.env` configuration, PostgreSQL connection override, and `./data` mount for raw FIT files plus Garmin session state
- the worker runtime is now a command override on the shared backend image: `python -m app.workers.scheduled_sync`

---

## Phase 8 — Deployment and Operations

### Task 44 `[done]`
Capture and document the agreed VPS runtime shape.

Current state:
- agreed production approach: run `frontend`, `backend`, and `postgres` as long-running services
- agreed production sync approach: trigger the one-shot worker command `python -m app.workers` from a host-side scheduler such as `systemd` timer or cron
- keep the long-running `worker` container available for local development and as an optional fallback, but do not treat it as the primary production scheduler
- discovered VPS baseline: Ubuntu 24.04, `systemd` available, `git` installed, Docker not yet installed, and about `40G` free on `/`
- agreed VPS ownership/layout: deploy as the chosen VPS app user under `/opt/garmin-platform/app`, with `/opt/garmin-platform/.env` for protected secrets and `/opt/garmin-platform/data` for persistent runtime storage

### Task 45 `[done]`
Implement production secret handling and Garmin auth bootstrap flow.

Current state:
- agreed production secret location: a protected host env file such as `/opt/garmin-platform/.env`, not committed config
- agreed steady-state Garmin auth approach: rely on persisted `GARTH_HOME` session data for scheduled syncs
- agreed password handling approach: treat `GARMIN_PASSWORD` as bootstrap/recovery-only and avoid requiring it in normal runtime config
- the Garmin client now treats a saved `GARTH_HOME` session as sufficient configuration for steady-state syncs
- a dedicated bootstrap command is now available at `PYTHONPATH=backend ./.venv/bin/python -m app.bootstrap_garmin_auth`
- verified locally by removing `GARMIN_PASSWORD` from the local `.env` and confirming the saved `GARTH_HOME` session still reports the Garmin client as configured

### Task 46 `[done]`
Create `infra/scripts/bootstrap_vps.sh` for first-time server setup.

Current state:
- `infra/scripts/bootstrap_vps.sh` now exists and stays separate from `deploy.sh`
- it installs `docker.io` and `docker-compose-v2`, prepares `/opt/garmin-platform`, creates persistent data directories, adds the target user to the `docker` group, and clones or updates the repo into `/opt/garmin-platform/app`
- the repo README now includes simple VPS-side bootstrap and first-deploy commands
- verified locally with `bash -n`

### Task 47 `[done]`
Create `infra/scripts/deploy.sh`.

Current state:
- `infra/scripts/deploy.sh` now exists and targets the agreed VPS layout under `/opt/garmin-platform`
- it validates the protected env file, ensures persistent data directories exist, fast-forwards `main`, validates Compose config, builds images, starts Postgres, bootstraps Garmin auth, runs Alembic migrations, starts `frontend` and `backend`, and checks backend health when `curl` is available
- it now supports `SKIP_GARMIN_BOOTSTRAP=1` plus clearer failure guidance when Garmin login is rate-limited or session files should be seeded first
- verified locally with `bash -n` plus `docker compose -f docker-compose.prod.yml --env-file .env config`

### Task 48
Create `infra/scripts/backup.sh`.

### Task 49
Document local setup in `README.md`.

### Task 50
Document production deploy steps in `README.md`.

### Task 51
Add startup checks for database connectivity and required storage paths.

---

## Phase 9 — Testing

### Task 52
Add unit tests for FIT parsing.

### Task 53
Add unit tests for analytics calculations.

### Task 54
Add API tests for:
- health endpoint
- activities endpoint
- activity detail endpoint

### Task 55
Add integration test for full ingestion of a sample FIT file.

---

## Phase 10 — MVP Hardening

### Task 53
Add error handling for:
- Garmin API failures
- corrupted FIT files
- partial downloads

### Task 54
Add retry logic with exponential backoff for sync failures.

### Task 55
Add validation to avoid duplicate activity insertion.

---

## Version 2 — Health Metrics Expansion

These tasks are intentionally deferred until after the MVP is complete.
The MVP should continue to preserve raw data, keep ingestion separate from analytics,
and avoid overloading `daily_metrics` so these additions remain straightforward later.

### Task 56
Implement device identification for activities.

Scope:
- parse device metadata from FIT files or Garmin source data
- populate the `devices` table
- link activities to the recording device
- expose device information in activity APIs

### Task 57
Add optional weather enrichment for activities and analytics.

Scope:
- decide whether to fetch historical weather from a provider or derive it from exported Garmin data if available
- store weather as separate enrichment data rather than mixing it into core activity ingestion
- support future weather correlation views and analytics

### Task 58
Research Garmin retrieval options for additional health and physiology data:
- HRV
- VO2 max
- lactate threshold
- endurance-related metrics
- richer sleep metrics

### Task 59
Design Version 2 schema additions for specialized health data.

Recommended direction:
- keep `daily_metrics` for lightweight daily rollups
- add focused tables for physiology/performance and richer sleep data
- include source timestamps and ingestion provenance

### Task 60
Add raw JSON snapshot storage for Garmin health endpoints to support reprocessing.

### Task 61
Implement ingestion for daily health metrics beyond the MVP set.

Candidate metrics:
- HRV
- richer sleep summary/detail
- VO2 max

### Task 62
Implement ingestion for performance metrics.

Candidate metrics:
- lactate threshold
- endurance score
- related training-readiness style metrics if reliable

### Task 63
Expand analytics endpoints and dashboard views to visualize Version 2 health metrics over time.

### Task 64
Add downsampling or capped payload strategy for large activity stream responses.

### Task 65
Verify that raw FIT files are never modified after download.

### Task 66
Review all MVP acceptance criteria against `docs/prd.md`.

---

## Suggested Codex Prompt Pattern

Use prompts like:

```text
Read docs/prd.md, docs/implementation.md, docs/dev_deployment.md, and docs/tasks.md.
Implement Task 13.
Keep changes minimal and production-sensible.
Explain what you changed.
```

Or:

```text
Implement Tasks 20 through 24.
Do not skip tests or configuration updates that are necessary for those tasks.
```
