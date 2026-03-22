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

Current state:
- the backend image now runs as a non-root application user and includes a container `HEALTHCHECK`
- the production build also supports VPS UID/GID alignment so mounted files land with sensible host ownership on the server
- the backend image remains the shared base for both the API service and worker-style command execution

### Task 5 `[done]`
Create `frontend/Dockerfile`.

Current state:
- the frontend Dockerfile now supports separate `dev` and hardened `prod` targets rather than a single shared runtime shape
- the production target now uses a multi-stage Next.js standalone build so the VPS image does not ship the full `npm` toolchain by default
- the development target still preserves the local `npm run dev` workflow used by `docker-compose.yml`
- later hardening work also showed the value of keeping host `node_modules` and `.next` output out of Docker build context so image builds stay reproducible and security scans reflect the image, not local machine artifacts

### Task 6 `[done]`
Create `docker-compose.yml` for local development.

Current state:
- backend, frontend, and PostgreSQL services are defined
- the backend runs the real FastAPI app
- the frontend now runs a Next.js scaffold, with the real dashboard and data pages still pending
- the local frontend service now explicitly builds the `dev` target from `frontend/Dockerfile` so local Compose keeps the hot-reload-friendly runtime shape
- local Compose remains the safest place to preserve convenience-oriented tooling while production uses the hardened target separately

### Task 7 `[done]`
Create `docker-compose.prod.yml` for VPS deployment.

Current state:
- the production Compose file now builds the hardened `prod` target from `frontend/Dockerfile` instead of reusing the local dev-oriented frontend image
- the production frontend now serves the Next.js standalone output while the backend and Postgres continue to use the protected host env file and persistent data mounts
- later security work confirmed that separating local and production targets materially reduces frontend vulnerability noise and makes it easier to harden the VPS runtime without harming the local dev workflow

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

### Task 48A `[todo]`
Harden the production `systemd` timer so it always retains a future trigger after manual disable/enable and backfill transitions.

Scope:
- investigate why `garmin-sync.timer` can end up in `active (elapsed)` with `Trigger: n/a` and no future run scheduled
- adjust the timer definition and/or install flow so steady-state scheduling is robust even when the timer is enabled long after boot
- document the expected recovery/verification commands and whether an initial manual `garmin-sync.service` run should ever be necessary

Current context:
- on the new VPS, after historical backfill completed and the timer was re-enabled, `systemctl list-timers garmin-sync.timer --all` showed `NEXT -` and `Trigger: n/a`
- the timer resumed normal scheduling only after manually running `sudo systemctl start garmin-sync.service` and then `sudo systemctl restart garmin-sync.timer`
- the current unit uses `OnBootSec=10m` plus `OnUnitActiveSec=6h`, which is a likely contributor to the missing-next-trigger state

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

### Task 49A `[done]`
Support historical Garmin backfill pagination after recent activities already exist locally.

Current state:
- the Garmin activity checkpoint now tracks a dedicated `backfill_offset` alongside the normal steady-state `last_synced_at` / `last_source_id` values
- repeated manual one-shot worker runs now continue paging into older Garmin activity pages even when the newest page is entirely duplicate data
- the normal incremental checkpoint stays anchored to the newest known activity while historical backfill is in progress, so steady-state sync resumes cleanly once older pages are exhausted
- operator-facing sync status now exposes `Backfill offset` in both `python -m app.print_sync_status` and `GET /api/v1/sync/status`
- verified locally with focused backend tests plus an Alembic upgrade through the new checkpoint-column migration

### Task 49B `[todo]`
Audit and fix Garmin activity timestamp semantics end-to-end.

Scope:
- verify how Garmin `startTimeGMT`, `startTimeLocal`, FIT timestamps, and stored database timestamps relate to each other
- distinguish source-local time from UTC storage and browser-local rendering expectations
- fix activity-detail summary, lap timestamp display, and metadata fields such as `Created` / `Updated` so known real activities render on the correct local date/time
- verify behavior against real examples that cross time zones and DST boundaries where possible

Current context:
- during VPS backfill validation, at least one real activity that occurred around `8:00 am` on `21 Mar 2026` rendered in the UI as lap times around `9:00 pm` on `20 Mar 2026`, and the detail-page `Created` metadata also looked incorrect
- this likely indicates a remaining mismatch between Garmin/API parsing, persisted timestamps, and frontend display assumptions
- no fix has been attempted yet; capture this as the next timestamp-focused follow-up after the backfill work

### Task 50 `[partial]`
Create `infra/scripts/backup.sh`.

Current state:
- `infra/scripts/backup.sh` now creates timestamped snapshot directories containing `postgres.dump`, `raw-data.tar.gz`, `garth-data.tar.gz`, and `metadata.json`
- backups work against either the local Compose stack or the production Compose stack via `APP_*`/`COMPOSE_FILE` environment overrides
- local and VPS helper installers now include `gp-local-backup` and `gp-backup` so the standard snapshot flow does not require retyping the full command shape
- the backup workflow has now also been exercised successfully on the VPS before a real Postgres reset/recovery event
- remaining work: exercise and harden the backup flow against the real production-scale raw FIT corpus and finalize the longer-term raw-file backup/recovery expectations

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

### Task 62 `[done]`
Add automated dependency vulnerability scanning for backend and frontend.

Scope:
- add `pip-audit` for Python dependency checks
- run `npm audit` for frontend dependency checks
- document how to run both locally and in CI

Current state:
- `pip-audit` is now installed as a Python dev dependency and can be run with `uv run pip-audit`
- the frontend now exposes `npm run audit` as the standard `npm audit` wrapper
- `infra/scripts/dependency_audit.sh` now runs both checks together from the repo root
- README and deployment docs now describe the local command shape and note that the combined script is intended for reuse in CI

### Task 63 `[done]`
Add Trivy scanning for filesystem, secrets, and built container images.

Scope:
- scan the repository filesystem for vulnerabilities and leaked secrets
- scan built backend and frontend images
- include Docker/config misconfiguration checks where useful

Current state:
- `infra/scripts/trivy_scan.sh` now scans the repository filesystem with Trivy using the `vuln`, `secret`, and `misconfig` scanners
- the same script now scans the built backend and frontend images after the filesystem scan
- the script supports either a local `trivy` binary or fallback execution through the official Trivy Docker image
- image references can be overridden when needed, while local defaults target `garmin-platform-backend:latest` and `garmin-platform-frontend:latest`
- README, local setup, backend notes, and deployment docs now describe how to run the scan locally and reuse it later in CI
- the backend and frontend Dockerfiles now run as non-root users and include image `HEALTHCHECK` instructions in response to the first high-signal Trivy misconfiguration findings

### Task 64 `[done]`
Enable repository-level dependency monitoring and code scanning.

Scope:
- enable GitHub Dependabot alerts and security updates
- enable GitHub CodeQL or equivalent code scanning for Python and TypeScript
- document the expected baseline security workflow

Current state:
- `.github/dependabot.yml` now configures weekly Dependabot version-update checks for `uv`, frontend `npm`, and GitHub Actions dependencies
- `.github/workflows/codeql.yml` now runs CodeQL scanning for Python and JavaScript/TypeScript on push, pull request, and a weekly schedule
- README and deployment docs now describe the repo-level security automation baseline
- repository security settings in the GitHub UI may still need to be enabled so Dependabot alerts and automatic security update PRs are active

### Task 65 `[done]`
Document the security verification checklist for releases and production deploys.

Scope:
- include dependency scanning, container scanning, and secret scanning steps
- define what must be green before production deploys
- capture known limitations such as “best effort” detection rather than absolute guarantees

Current state:
- README now includes a concrete security checklist covering dependency scans, Trivy scans, CodeQL/Dependabot review, secret review, and acceptance of documented residual risk
- deployment docs now define the current production release gate:
  - no unresolved `CRITICAL` findings
  - no unresolved unexpected `HIGH` findings in repo/config/container setup
  - accepted temporary risks must be documented
- the docs now explicitly state that these checks are best-effort risk reduction rather than proof of zero vulnerabilities

### Task 66 `[done]`
Add CI automation to run backend and frontend verification on GitHub.

Scope:
- run backend tests automatically on push and pull request
- run frontend build verification automatically on push and pull request
- run the repo-defined security checks from Task 62 in CI, including `uv run pip-audit`, `cd frontend && npm run audit`, or the combined `./infra/scripts/dependency_audit.sh`
- run the repo-defined Trivy checks from Task 63 in CI once they exist
- keep Task 64 separate as GitHub-native repository security automation rather than a normal CI job step
- make CI the default place where regressions are caught before deployment

Status:
- `.github/workflows/ci.yml` now runs backend tests and frontend build verification on `push` and `pull_request` to `main`
- the workflow also runs dependency-audit and Trivy checks in a separate advisory security job
- the security job is intentionally non-blocking for now because the accepted Next.js audit finding and the remaining frontend Trivy cleanup are still being tracked separately in Tasks 71 and 72

### Task 67 `[done]`
Implement private API access enforcement for the MVP deployment.

Scope:
- choose and implement a concrete access-control boundary for the private MVP deployment
- align the choice with the current Tailscale-first deployment model and future HTTPS options
- document how API access is restricted in practice, not just recommended

Current state:
- the production Compose topology no longer publishes the backend API port on the host, so the backend is private to the Docker network by default
- the frontend now uses the backend over the internal Compose network in production, which preserves the existing server-side page fetches without exposing the API directly
- the deploy script and VPS helpers now use in-stack backend health checks instead of relying on `http://localhost:8000`
- docs now describe the concrete MVP access boundary as frontend-on-Tailscale with backend/private-network-only access, while leaving room for a future authenticated HTTPS layer

### Task 68 `[done]`
Add a raw FIT reprocessing workflow to rebuild normalized activity data.

Scope:
- support reprocessing stored raw FIT files after parser or schema improvements
- define how activity summaries, laps, and records are safely rebuilt without losing raw files
- document when to use reprocessing versus normal sync ingestion

Current state:
- `PYTHONPATH=backend ./.venv/bin/python -m app.reprocess_fit_files` now rebuilds activity summaries, laps, and records from stored `raw_file_path` values
- the reprocess flow reuses the existing FIT ingest services so it updates activity summaries in place and replaces lap/record rows from the raw FIT source of truth
- missing raw files are skipped cleanly, raw FIT files are never modified by the reprocess command, and batch runs continue per activity rather than aborting on the first issue
- backend tests now cover both successful activity reprocessing and safe skipping when a raw FIT path is missing

### Task 69 `[partial]`
Verify backup restore flow in a clean environment.

Scope:
- restore PostgreSQL plus raw FIT storage from backup artifacts
- verify the application boots and serves expected data after restore
- document the restore runbook, not just the backup command

Current state:
- `infra/scripts/restore_backup.sh` now restores `postgres.dump` plus the archived `raw` and `garth` directories into a clean target environment
- the restore flow can optionally boot PostgreSQL and the backend and verify backend health plus a summarized activity count before declaring success
- a real VPS recovery using the backup/restore flow has already been exercised successfully in production, but Task 69 remains partial until a production-generated snapshot is copied down to the iMac and restored into a clean local environment
- remaining proof for completion: `prod VPS backup snapshot -> copy to iMac -> clean local restore -> verify backend health, sync status, and representative restored activity data locally`
- the backup/restore flow was verified locally in a disposable clean environment by:
  - seeding one real FIT fixture into PostgreSQL plus raw storage
  - creating a snapshot with `backup.sh`
  - restoring that snapshot into a second clean environment with a different Postgres password
  - confirming the restored backend booted and still reported `1` activity, `4` laps, `481` records, and `1` restored raw FIT file
- the same recovery shape has now also been exercised on the VPS:
  - fresh non-`$` secrets were generated
  - only the Postgres data directory was recreated
  - the backup snapshot was restored successfully
  - backend health and sync checkpoint state came back as expected
- remaining work: verify the restore runbook against a more realistic raw FIT backup set and complete the end-to-end recovery story for the production raw-data volume

### Task 70 `[done]`
Add sync-status visibility for operations.

Scope:
- expose last successful sync time and recent failure state in an operator-friendly way
- support quick diagnosis when scheduled syncs stall or fail repeatedly
- keep the MVP solution lightweight, such as an API endpoint, status card, or structured health summary

Current state:
- the frontend dashboard and `/status/sync` page already expose sync state through `GET /api/v1/sync/status`
- `python -m app.print_sync_status` now prints the persisted sync checkpoint in a shell-friendly summary, with `--json` for structured output
- the managed helper installers now include `gp-local-sync-status` and `gp-sync-status` so local and VPS operators can inspect sync health without opening the browser

### Task 71 `[partial]`
Clean up the remaining frontend Trivy findings after the first Docker hardening pass.

Scope:
- reduce or eliminate avoidable frontend image vulnerability noise where practical
- review the current frontend base image and runtime shape for safer defaults
- decide which findings are true remediation targets versus accepted temporary MVP risk
- document any remaining accepted frontend security findings clearly

Current state:
- the frontend Docker image now uses a multi-stage build with separate `dev` and `prod` targets so the VPS runtime no longer defaults to shipping the full `npm`-driven development environment
- the production target now runs the Next.js standalone output on `gcr.io/distroless/nodejs22-debian12:nonroot`, while the local target keeps the normal `npm run dev` workflow
- the local and production Compose files now select the appropriate frontend build target explicitly (`dev` for `docker-compose.yml`, `prod` for `docker-compose.prod.yml`)
- `.dockerignore` now excludes local `frontend/node_modules/` and `.next/` content so Docker builds use a clean dependency graph instead of accidentally inheriting dirty host artifacts
- rerunning Trivy against the rebuilt image reduced the frontend container findings from `20` (`1 CRITICAL`, `2 HIGH`) down to `3` OS-package findings (`1 HIGH`, `2 MEDIUM`), while the Node package findings dropped to the single already-known `next` advisory
- remaining work: decide whether the remaining distroless/Debian `libc6` `HIGH` finding should be treated as temporary accepted base-image risk for the private MVP or whether a further runtime-base change is warranted before Task 71 can be closed

### Task 72 `[partial]`
Review and triage the initial Dependabot pull requests created by the new security automation.

Scope:
- group the current Dependabot PRs into low-risk merges, cautious upgrades, and deferred major-version changes
- merge or close straightforward low-risk updates where appropriate
- document why riskier updates such as major framework or Garmin-library jumps are deferred or accepted
- keep the repo-level automation useful without creating alert fatigue or unreviewed upgrade churn

Current state:
- as of `2026-03-22`, the open Dependabot PRs are `#7 next 15.5.13 -> 16.2.0`, `#6 @types/leaflet 1.9.20 -> 1.9.21`, `#5 typescript 5.8.3 -> 5.9.3`, `#4 react-dom + @types/react-dom`, `#3 @types/node 22.15.21 -> 25.5.0`, and `#2 garth 0.6.3 -> 0.7.10`
- the lowest-risk frontend typing/tooling updates are `#6` and `#5`; those versions have now been applied locally and a clean `npm run build` still passes
- `#7 next` remains the clearest deferred major upgrade because it is directly tied to the known accepted Next.js advisory, could alter App Router behavior, and should be handled as a deliberate framework-upgrade task rather than a drive-by Dependabot merge
- `#3 @types/node` is not an automatic merge candidate because it jumps far ahead of the current Node 22 runtime and could create misleading type/runtime mismatches
- `#4 react-dom + @types/react-dom` is a cautious upgrade rather than a no-thought merge because it changes a runtime dependency, not just type-only tooling
- `#2 garth` is a cautious backend/Garmin-auth upgrade because recent `garth` releases have included real login and SSO behavior changes that should be tested against live Garmin auth flows before merging
- remaining work: decide whether to merge the validated low-risk frontend updates now, then document explicit defer/close rationale for the `next`, `@types/node`, `react-dom`, and `garth` PRs

### Task 73 `[partial]`
Review and address GitHub Actions runtime deprecation warnings from CI and repository automation.

Scope:
- identify warnings related to GitHub-hosted action runtime deprecations such as the Node.js 20 to Node.js 24 transition
- distinguish between upstream GitHub-managed warnings and warnings caused by action versions pinned in this repo
- update repo-owned workflow actions where compatible newer versions are available
- document any warnings that are upstream-only and do not require immediate repo changes

Current state:
- the repo-owned CI workflow had still been using older action generations for some setup steps: `actions/setup-python@v5`, `actions/setup-node@v4`, and `astral-sh/setup-uv@v6`
- those have now been updated in `.github/workflows/ci.yml` to `actions/setup-python@v6`, `actions/setup-node@v6`, and `astral-sh/setup-uv@v7`, which aligns the repo-owned setup steps with the newer action runtime line
- `actions/checkout@v6` and `github/codeql-action@v4` were already on the newer maintained major versions and did not need the same adjustment
- the follow-up `CI` run for commit `efd4411` completed successfully in GitHub Actions, with `Backend tests` and `Frontend build` both passing and the completed frontend check run reporting `annotations_count: 0`
- remaining work: confirm whether any residual runtime warnings still appear in GitHub-managed workflow surfaces such as CodeQL or repository-level banners, and document those separately if they are not caused by repo-pinned action versions

### Task 74 `[done]`
Add versioned scripts to install documented helper functions into local and VPS shell profiles.

Scope:
- provide a repo-owned installer for the local `~/.zshrc` helper functions
- provide a repo-owned installer for the VPS `~/.bashrc` helper functions
- include comments above each installed function describing what it does
- update the docs to use these installers instead of ad hoc copy-paste shell snippets

Current state:
- `infra/scripts/install_local_helpers.sh` now installs a versioned helper block into `~/.zshrc`
- `infra/scripts/install_vps_helpers.sh` now installs a versioned helper block into `~/.bashrc`
- both installers replace any prior managed helper block cleanly instead of duplicating functions
- README, local setup notes, and deployment docs now point to the installer scripts and describe the installed helper sets

### Task 75 `[done]`
Create and publish the Version 1 MVP release marker.

Scope:
- choose the MVP release version and freeze point on `main`
- create and push an annotated git tag for the MVP baseline
- create a GitHub release so the Version 1 scope is easy to reference before Version 2 work continues

Current state:
- the Version 1 MVP baseline is now tagged and released as `v1.0.0`
- the GitHub release is published at `https://github.com/gwgr/garmin-platform/releases/tag/v1.0.0`
- `main` remains the active line for continued Version 2 work and for any remaining Version 1 follow-ups that were intentionally left partial or deferred

---

## Version 2 — Health Metrics Expansion

These tasks are intentionally deferred until after the MVP is complete.
The MVP should continue to preserve raw data, keep ingestion separate from analytics,
and avoid overloading `daily_metrics` so these additions remain straightforward later.

### Task 76
Implement device identification for activities.

Scope:
- parse device metadata from FIT files or Garmin source data
- populate the `devices` table
- link activities to the recording device
- expose device information in activity APIs

### Task 77
Add optional weather enrichment for activities and analytics.

Scope:
- decide whether to fetch historical weather from a provider or derive it from exported Garmin data if available
- store weather as separate enrichment data rather than mixing it into core activity ingestion
- support future weather correlation views and analytics

### Task 78
Add HTTPS-friendly private access for the VPS deployment.

Scope:
- choose between Tailscale Serve and a reverse proxy such as Caddy for TLS termination
- support private HTTPS access to the frontend and backend over the tailnet
- keep the setup compatible with the existing Docker Compose deployment model

### Task 79
Research Garmin retrieval options for additional health and physiology data:
- HRV
- VO2 max
- lactate threshold
- endurance-related metrics
- richer sleep metrics

### Task 80
Design Version 2 schema additions for specialized health data.

Recommended direction:
- keep `daily_metrics` for lightweight daily rollups
- add focused tables for physiology/performance and richer sleep data
- include source timestamps and ingestion provenance

### Task 81
Add raw JSON snapshot storage for Garmin health endpoints to support reprocessing.

### Task 82
Implement ingestion for daily health metrics beyond the MVP set.

Candidate metrics:
- HRV
- richer sleep summary/detail
- VO2 max

### Task 83
Implement ingestion for performance metrics.

Candidate metrics:
- lactate threshold
- endurance score
- related training-readiness style metrics if reliable

### Task 84
Expand analytics endpoints and dashboard views to visualize Version 2 health metrics over time.

### Task 85 [done]
Perform a frontend content and UX cleanup pass before deeper design-system refactors.

Scope:
- remove MVP/dev-oriented placeholder copy and replace it with user-facing product language
- review dashboard, activity list, activity detail, and sync status pages for awkward section hierarchy, overexposed technical metadata, and low-value explanatory text
- simplify or rebalance layouts where the current composition makes the product feel more like a prototype than a training dashboard
- keep this pass intentionally light on framework churn so copy, hierarchy, and product emphasis are improved before Tailwind or component-library adoption

Progress notes:
- cleaned up dashboard, activity list, activity detail, and sync status page copy and section hierarchy
- reduced placeholder/dev-oriented narrative text and toned down over-prominent technical metadata
- simplified heading treatment and page structure before starting any Tailwind or component-library refactor

### Task 86
Find or create a consistent set of sport icons for use across the frontend.

Scope:
- evaluate whether an existing icon set can cover the main Garmin sport/activity types cleanly
- create custom icons only where common libraries do not provide a good fit
- replace repeated sport text labels with icons where they improve scanability without hurting clarity
- define a fallback treatment for unknown or unsupported activity types

### Task 87
Refactor the frontend to use Tailwind CSS for layout, spacing, and design tokens.

Scope:
- adopt Tailwind as the primary layout and spacing system
- keep the existing visual direction while reducing ad hoc global CSS
- standardize spacing, typography, and responsive breakpoints across pages

### Task 88
Adopt `shadcn/ui` components for core dashboard UI primitives.

Scope:
- use `shadcn/ui` for cards, tabs, tables, dialogs, and related reusable primitives
- keep the component set intentionally small and aligned with the product’s visual language
- avoid over-customized one-off components where standard primitives are a better fit

### Task 89
Create a responsive dashboard shell and shared frontend page layout system.

Scope:
- add a reusable app shell with header/navigation/content regions
- support desktop and mobile layouts cleanly
- make dashboard, activities list, and activity detail pages share the same structural system

### Task 90
Standardize frontend typography and spacing across all pages.

Scope:
- define consistent page spacing, section spacing, headings, body copy, and data-density rules
- remove inconsistent sizing/layout patterns across dashboard and activity pages
- ensure charts, cards, filters, and tables align to the same rhythm

### Task 91
Standardize frontend loading, empty, error, and partial-data states.

Scope:
- create shared UI patterns for loading, empty, error, and sparse-data views
- apply them consistently across dashboard, activities list, and activity detail pages
- make frontend behavior clearer when backend data is missing, delayed, or partially populated

### Task 92
Add Playwright screenshot coverage for the main dashboard and activity pages.

Scope:
- add screenshot tests for the home dashboard, activities list, and activity detail pages
- use stable fixture data or deterministic local test setup
- make the screenshots useful for catching layout regressions during frontend refactors

### Task 93
Create a deterministic fixture dataset for frontend development and screenshot testing.

Scope:
- provide a stable seeded dataset for dashboard and activity-page development
- decouple UI regression testing from live Garmin sync state
- support repeatable Playwright screenshot baselines

### Task 90
Add downsampling or capped payload strategy for large activity stream responses.

### Task 91
Verify that raw FIT files are never modified after download.

### Task 92
Review database performance strategy for long-term `activity_records` growth.

Scope:
- evaluate whether `activity_records` needs partitioning, archiving, or other scaling changes
- revisit the implementation-spec note about month-based partitioning
- keep the solution aligned with expected single-user growth and query patterns

### Task 93
Review all MVP acceptance criteria against `docs/prd.md`.
