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
- backend and frontend currently serve placeholder content until app scaffolding is implemented

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

### Task 20
Create backend service abstraction for Garmin client access.

### Task 21
Implement sync checkpoint storage.

### Task 22
Implement Garmin activity list fetcher.

### Task 23
Implement new activity detection and deduplication by source activity ID.

### Task 24
Implement FIT file download and raw file storage.

### Task 25
Implement FIT parser service.

### Task 26
Parse and store activity summary data.

### Task 27
Parse and store lap data.

### Task 28
Parse and store per-record stream data.

### Task 29
Add structured logging for sync runs and parser failures.

---

## Phase 5 — API Endpoints

### Task 30
Implement:
- `GET /api/v1/activities`

Support:
- pagination
- date filtering
- sport filtering
- sort by start time descending

### Task 31
Implement:
- `GET /api/v1/activities/{id}`

Return:
- activity summary
- laps
- stream data
- basic metadata

### Task 32
Implement:
- `GET /api/v1/metrics/daily`

### Task 33
Implement:
- `GET /api/v1/analytics/trends`

Include:
- weekly distance
- recent activity counts
- resting HR trend if data exists

---

## Phase 6 — Frontend Foundation

### Task 34
Initialize Next.js frontend structure.

### Task 35
Create shared API client utilities.

### Task 36
Create dashboard page.

### Task 37
Create activity list page.

### Task 38
Create activity detail page.

### Task 39
Add chart components for:
- pace
- heart rate
- elevation

### Task 40
Add route map component using Leaflet or MapLibre.

---

## Phase 7 — Worker and Scheduling

### Task 41
Create worker entrypoint for sync jobs.

### Task 42
Create scheduled sync command to run every 6 hours.

### Task 43
Ensure worker and backend can share the same application config and codebase.

---

## Phase 8 — Deployment and Operations

### Task 44
Create `infra/scripts/deploy.sh`.

### Task 45
Create `infra/scripts/backup.sh`.

### Task 46
Document local setup in `README.md`.

### Task 47
Document production deploy steps in `README.md`.

### Task 48
Add startup checks for database connectivity and required storage paths.

---

## Phase 9 — Testing

### Task 49
Add unit tests for FIT parsing.

### Task 50
Add unit tests for analytics calculations.

### Task 51
Add API tests for:
- health endpoint
- activities endpoint
- activity detail endpoint

### Task 52
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

### Task 56
Add downsampling or capped payload strategy for large activity stream responses.

### Task 57
Verify that raw FIT files are never modified after download.

### Task 58
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
