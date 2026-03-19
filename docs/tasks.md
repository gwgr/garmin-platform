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

### Task 1 `[done]`
Initialize repository structure:
- `docs/`
- `backend/`
- `frontend/`
- `infra/`
- Docker-related files at the repo root (`docker-compose*.yml`, service `Dockerfile`s)

Current state:
- `docs/`, `backend/`, `frontend/`, and `infra/` all exist
- Docker-related files now live at the repo root and within service directories rather than under a dedicated top-level `docker/` folder

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

### Task 48 `[done]`
Create production scheduler setup for Garmin sync jobs.

Scope:
- add versioned `systemd` unit files under `infra/systemd/` for the one-shot worker command `python -m app.workers`
- add an install/setup script under `infra/scripts/` to place the unit files and reload `systemd`, with enable/start kept explicit
- keep this separate from the long-running `app.workers.scheduled_sync` loop used for local/dev convenience
- use the protected env file and persistent data paths under `/opt/garmin-platform`
- document install, enable, and verification steps on the VPS

Current state:
- the versioned unit files now exist at `infra/systemd/garmin-sync.service` and `infra/systemd/garmin-sync.timer`
- `infra/scripts/install_sync_timer.sh` now installs the units under `/etc/systemd/system` and reloads `systemd`
- timer enable/start is now explicit via `ENABLE_SYNC_TIMER=1` or a later `systemctl enable --now garmin-sync.timer`
- the service runs the one-shot worker through Docker Compose with `SKIP_GARMIN_BOOTSTRAP=1` so scheduled syncs rely on seeded `GARTH_HOME` session state
- README and deployment docs now include the VPS install command and verification commands
- verified locally with `bash -n` on the new install script

### Task 49 `[done]`
Perform and document the initial historical Garmin backfill strategy.

Scope:
- use manual one-shot worker runs for the first large import instead of enabling the production timer immediately
- watch for Garmin rate limiting, auth challenges, and long-running sync overlap risks
- document when it is safe to enable the scheduled timer for steady-state syncs

Current state:
- the recommended initial backfill path is now documented as repeated manual one-shot worker runs via Docker Compose on the VPS
- the runbook explicitly keeps `garmin-sync.timer` disabled at first
- `GARMIN_SYNC_LIMIT` can now be overridden for smaller test batches such as `5`
- enable the timer only after manual runs show the backlog is under control and steady-state sync behavior looks safe

### Task 50
Create `infra/scripts/backup.sh`.

### Task 51 `[done]`
Document local setup in `README.md`.

Current state:
- the root `README.md` now documents the local development workflow, key commands, and the current backend/frontend/dev-container shape

### Task 52 `[done]`
Document production deploy steps in `README.md`.

Current state:
- the root `README.md` now documents VPS bootstrap, protected env file placement, deploy flow, manual backfill, sync-timer installation, and current Tailscale access examples

### Task 53 `[done]`
Add startup checks for database connectivity and required storage paths.

Current state:
- backend startup now validates `RAW_DATA_DIR` and `GARTH_HOME`, creating them when needed and failing clearly if they are unusable
- backend startup now also verifies database connectivity with a simple `SELECT 1` before the app reports itself initialized
- structured logs now show which startup validations passed or failed

---

## Phase 9 — Testing

### Task 54 `[done]`
Add unit tests for FIT parsing.

Current state:
- `backend/tests/test_fit_parser.py` now exercises FIT summary, lap, and record parsing against a real sample fixture
- parser coverage now explicitly checks coordinate normalization into latitude/longitude degrees

### Task 55 `[done]`
Add unit tests for analytics calculations.

Current state:
- `backend/tests/test_analytics_queries.py` now covers empty-result behavior and rolling resting-heart-rate trend limits/order
- existing analytics endpoint coverage remains in place via `backend/tests/test_analytics_endpoint.py`

### Task 56 `[done]`
Add API tests for:
- health endpoint
- activities endpoint
- activity detail endpoint

Current state:
- `backend/tests/test_health_endpoint.py` now covers `/api/v1/health`
- `backend/tests/test_activities_endpoint.py` covers both activity list and activity detail behavior
- backend API tests now run under a safe `test` environment bootstrap via `backend/tests/conftest.py`

### Task 57 `[done]`
Add integration test for full ingestion of a sample FIT file.

Current state:
- `backend/tests/test_fit_ingestion_integration.py` now ingests a real sample FIT fixture end-to-end into an in-memory database
- the integration test verifies persisted activity summary, lap count, record count, and normalized route coordinates

---

## Phase 10 — MVP Hardening

### Task 58 `[done]`
Add error handling for:
- Garmin API failures
- corrupted FIT files
- partial downloads

Current state:
- Garmin auth/login, activity listing, and FIT download paths now log clearer failures and distinguish retryable request errors from terminal failures
- invalid or empty FIT download payloads are now rejected before normal storage, copied into a quarantine area, and logged clearly
- corrupt FIT files that fail during parsing now cause the worker to quarantine the file, advance the checkpoint, and continue with later activities instead of crashing the full sync batch
- backend tests now cover both invalid-download quarantine behavior and corrupt-FIT skip behavior in the sync worker

### Task 59 `[done]`
Add retry logic with exponential backoff for sync failures.

Current state:
- the `garth` client now retries Garmin auth/login, activity listing, and FIT download calls when it sees HTTP `429` or transient request failures
- the backoff schedule is now configurable via `GARMIN_RETRY_DELAYS_SECONDS` rather than hardcoded in the client
- backend tests now explicitly cover both “retry then succeed” and “retry then fail” behavior for the Garmin retry helper

### Task 60 `[done]`
Add validation to avoid duplicate activity insertion.

Current state:
- the worker now performs a second source-activity check inside the per-activity ingest loop before downloading and parsing FIT data
- if a duplicate source ID slips past the initial dedupe stage, the worker now logs `worker.sync.duplicate_activity_skipped`, advances the sync checkpoint, and continues cleanly
- backend test coverage now includes an explicit worker test for this duplicate-skip path

### Task 61 `[done]`
Expose sync health and recent ingestion errors in the frontend.

Current state:
- the backend now exposes `GET /api/v1/sync/status` backed by persisted sync checkpoint metadata
- the dashboard now shows a compact sync-status card with healthy, warning, or error state
- the status card links to `/status/sync`, which shows last attempt, last success, last synced activity timestamp, last source ID, and recent error summary
- backend tests now cover the sync-status endpoint, and the frontend build includes the new `/status/sync` page

### Task 62
Add automated dependency vulnerability scanning for backend and frontend.

Scope:
- add `pip-audit` for Python dependency checks
- run `npm audit` for frontend dependency checks
- document how to run both locally and in CI

### Task 63
Add Trivy scanning for filesystem, secrets, and built container images.

Scope:
- scan the repository filesystem for vulnerabilities and leaked secrets
- scan built backend and frontend images
- include Docker/config misconfiguration checks where useful

### Task 64
Enable repository-level dependency monitoring and code scanning.

Scope:
- enable GitHub Dependabot alerts and security updates
- enable GitHub CodeQL or equivalent code scanning for Python and TypeScript
- document the expected baseline security workflow

### Task 65
Document the security verification checklist for releases and production deploys.

Scope:
- include dependency scanning, container scanning, and secret scanning steps
- define what must be green before production deploys
- capture known limitations such as “best effort” detection rather than absolute guarantees

### Task 66
Add CI automation to run backend and frontend verification on GitHub.

Scope:
- run backend tests automatically on push and pull request
- run frontend build verification automatically on push and pull request
- make CI the default place where regressions are caught before deployment

### Task 67
Implement private API access enforcement for the MVP deployment.

Scope:
- choose and implement a concrete access-control boundary for the private MVP deployment
- align the choice with the current Tailscale-first deployment model and future HTTPS options
- document how API access is restricted in practice, not just recommended

### Task 68
Add a raw FIT reprocessing workflow to rebuild normalized activity data.

Scope:
- support reprocessing stored raw FIT files after parser or schema improvements
- define how activity summaries, laps, and records are safely rebuilt without losing raw files
- document when to use reprocessing versus normal sync ingestion

### Task 69
Verify backup restore flow in a clean environment.

Scope:
- restore PostgreSQL plus raw FIT storage from backup artifacts
- verify the application boots and serves expected data after restore
- document the restore runbook, not just the backup command

### Task 70
Add sync-status visibility for operations.

Scope:
- expose last successful sync time and recent failure state in an operator-friendly way
- support quick diagnosis when scheduled syncs stall or fail repeatedly
- keep the MVP solution lightweight, such as an API endpoint, status card, or structured health summary

---

## Version 2 — Health Metrics Expansion

These tasks are intentionally deferred until after the MVP is complete.
The MVP should continue to preserve raw data, keep ingestion separate from analytics,
and avoid overloading `daily_metrics` so these additions remain straightforward later.

### Task 71
Implement device identification for activities.

Scope:
- parse device metadata from FIT files or Garmin source data
- populate the `devices` table
- link activities to the recording device
- expose device information in activity APIs

### Task 72
Add optional weather enrichment for activities and analytics.

Scope:
- decide whether to fetch historical weather from a provider or derive it from exported Garmin data if available
- store weather as separate enrichment data rather than mixing it into core activity ingestion
- support future weather correlation views and analytics

### Task 73
Add HTTPS-friendly private access for the VPS deployment.

Scope:
- choose between Tailscale Serve and a reverse proxy such as Caddy for TLS termination
- support private HTTPS access to the frontend and backend over the tailnet
- keep the setup compatible with the existing Docker Compose deployment model

### Task 74
Research Garmin retrieval options for additional health and physiology data:
- HRV
- VO2 max
- lactate threshold
- endurance-related metrics
- richer sleep metrics

### Task 75
Design Version 2 schema additions for specialized health data.

Recommended direction:
- keep `daily_metrics` for lightweight daily rollups
- add focused tables for physiology/performance and richer sleep data
- include source timestamps and ingestion provenance

### Task 76
Add raw JSON snapshot storage for Garmin health endpoints to support reprocessing.

### Task 77
Implement ingestion for daily health metrics beyond the MVP set.

Candidate metrics:
- HRV
- richer sleep summary/detail
- VO2 max

### Task 78
Implement ingestion for performance metrics.

Candidate metrics:
- lactate threshold
- endurance score
- related training-readiness style metrics if reliable

### Task 79
Expand analytics endpoints and dashboard views to visualize Version 2 health metrics over time.

### Task 80
Refactor the frontend to use Tailwind CSS for layout, spacing, and design tokens.

Scope:
- adopt Tailwind as the primary layout and spacing system
- keep the existing visual direction while reducing ad hoc global CSS
- standardize spacing, typography, and responsive breakpoints across pages

### Task 81
Adopt `shadcn/ui` components for core dashboard UI primitives.

Scope:
- use `shadcn/ui` for cards, tabs, tables, dialogs, and related reusable primitives
- keep the component set intentionally small and aligned with the product’s visual language
- avoid over-customized one-off components where standard primitives are a better fit

### Task 82
Create a responsive dashboard shell and shared frontend page layout system.

Scope:
- add a reusable app shell with header/navigation/content regions
- support desktop and mobile layouts cleanly
- make dashboard, activities list, and activity detail pages share the same structural system

### Task 83
Standardize frontend typography and spacing across all pages.

Scope:
- define consistent page spacing, section spacing, headings, body copy, and data-density rules
- remove inconsistent sizing/layout patterns across dashboard and activity pages
- ensure charts, cards, filters, and tables align to the same rhythm

### Task 84
Standardize frontend loading, empty, error, and partial-data states.

Scope:
- create shared UI patterns for loading, empty, error, and sparse-data views
- apply them consistently across dashboard, activities list, and activity detail pages
- make frontend behavior clearer when backend data is missing, delayed, or partially populated

### Task 85
Add Playwright screenshot coverage for the main dashboard and activity pages.

Scope:
- add screenshot tests for the home dashboard, activities list, and activity detail pages
- use stable fixture data or deterministic local test setup
- make the screenshots useful for catching layout regressions during frontend refactors

### Task 86
Create a deterministic fixture dataset for frontend development and screenshot testing.

Scope:
- provide a stable seeded dataset for dashboard and activity-page development
- decouple UI regression testing from live Garmin sync state
- support repeatable Playwright screenshot baselines

### Task 87
Add downsampling or capped payload strategy for large activity stream responses.

### Task 88
Verify that raw FIT files are never modified after download.

### Task 89
Review database performance strategy for long-term `activity_records` growth.

Scope:
- evaluate whether `activity_records` needs partitioning, archiving, or other scaling changes
- revisit the implementation-spec note about month-based partitioning
- keep the solution aligned with expected single-user growth and query patterns

### Task 90
Review all MVP acceptance criteria against `docs/prd.md`.
