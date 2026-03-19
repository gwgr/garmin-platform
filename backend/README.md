# Backend Scaffold

This directory now contains the initial FastAPI backend project structure:
- `app/main.py` application entrypoint
- `app/api/` router packages
- `app/api/v1/endpoints/health.py` for the initial health endpoint
- `app/api/v1/endpoints/activities.py` for paginated activity listing and activity detail responses
- `app/api/v1/endpoints/analytics.py` for trend analytics responses
- `app/api/v1/endpoints/metrics.py` for paginated daily metric responses
- `app/config/settings.py` for environment-driven backend settings
- `app/db/session.py` for SQLAlchemy engine and session management
- `app/models/base.py` for the shared declarative base and metadata naming conventions
- `app/models/activity.py` for the initial activity summary model
- `app/models/activity_lap.py`, `activity_record.py`, `daily_metric.py`, `sleep_session.py`, and `device.py` for the remaining core schema tables
- `app/models/sync_checkpoint.py` for durable sync checkpoints
- `app/services/garmin.py` for the Garmin client abstraction, `garth` integration, and FIT download support
- `app/services/garmin_activity_fetcher.py` for checkpoint-aware Garmin activity listing
- `app/services/activity_deduper.py` for filtering fetched activities by `source_activity_id`
- `app/services/raw_file_storage.py` and `activity_fit_downloader.py` for saving raw FIT files locally
- `app/parsers/fit_parser.py` and `app/services/activity_summary_ingest.py` for FIT summary parsing and activity persistence
- `app/services/activity_lap_ingest.py` for FIT lap parsing and `activity_laps` persistence
- `app/services/activity_record_ingest.py` for FIT record-stream parsing and `activity_records` persistence
- `app/services/sync_checkpoint.py` for reading and updating sync checkpoints
- `app/observability.py` for JSON-formatted structured application logging
- `app/workers/sync_worker.py` for the Garmin sync worker entrypoint
- `alembic/` for database migration configuration and revisions
- placeholder packages for services, parsers, workers, and analytics
- `tests/` for backend test modules

Current schema notes:
- `activities` is indexed on `start_time`, `sport`, and `distance_meters`
- `activity_records` is indexed on `record_time`

Development notes:
- `httpx` is installed as a dev dependency so `fastapi.testclient` works for local endpoint verification
- `get_garmin_client()` now always uses the `garth`-backed implementation and can resume from saved `GARTH_HOME` session state without requiring `GARMIN_PASSWORD`
- Garmin auth/login, activity listing, and FIT download calls now use conservative retry/backoff for HTTP `429` and transient request failures
- backend logs now emit one-line JSON records, and `LOG_LEVEL` can be set from the environment
- backend startup now validates database connectivity plus required storage paths for `RAW_DATA_DIR` and `GARTH_HOME`
- the sync worker can be run with `PYTHONPATH=backend ./.venv/bin/python -m app.workers`
- `GARMIN_SYNC_LIMIT` can be set to a smaller value such as `5` for cautious test batches during an initial backfill
- the scheduled sync loop can be run with `PYTHONPATH=backend ./.venv/bin/python -m app.workers.scheduled_sync`
- first-time or recovery Garmin auth bootstrap can be run with `PYTHONPATH=backend ./.venv/bin/python -m app.bootstrap_garmin_auth`
- a real local worker run has already been verified against the Postgres/Garmin setup and confirmed to import additional historical activities
- backend tests now cover FIT parsing, analytics calculations, `/api/v1/health`, activity list/detail endpoints, and full ingestion of a sample FIT file

Container runtime:
- the backend Docker image now runs the FastAPI app with `uvicorn`
- `GET /api/v1/health` should be available from the backend container on port `8000`
- the same backend image is now also used for the scheduled worker service, with only the container command overridden to `python -m app.workers.scheduled_sync`
- both services share the same `.env`-driven settings and `/app/data` mount so raw FIT files and `GARTH_HOME` session state stay consistent
