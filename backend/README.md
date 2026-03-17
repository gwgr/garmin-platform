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
- `alembic/` for database migration configuration and revisions
- placeholder packages for services, parsers, workers, and analytics
- `tests/` for backend test modules

Current schema notes:
- `activities` is indexed on `start_time`, `sport`, and `distance_meters`
- `activity_records` is indexed on `record_time`

Development notes:
- `httpx` is installed as a dev dependency so `fastapi.testclient` works for local endpoint verification
- when Garmin credentials are present, `get_garmin_client()` returns the `garth`-backed implementation instead of the placeholder client
- backend logs now emit one-line JSON records, and `LOG_LEVEL` can be set from the environment

Container runtime:
- the backend Docker image now runs the FastAPI app with `uvicorn`
- `GET /api/v1/health` should be available from the backend container on port `8000`
