# Backend Scaffold

This directory now contains the initial FastAPI backend project structure:
- `app/main.py` application entrypoint
- `app/api/` router packages
- `app/api/v1/endpoints/health.py` for the initial health endpoint
- `app/config/settings.py` for environment-driven backend settings
- `app/db/session.py` for SQLAlchemy engine and session management
- `app/models/base.py` for the shared declarative base and metadata naming conventions
- `app/models/activity.py` for the initial activity summary model
- `app/models/activity_lap.py`, `activity_record.py`, `daily_metric.py`, `sleep_session.py`, and `device.py` for the remaining core schema tables
- `alembic/` for database migration configuration and revisions
- placeholder packages for services, parsers, workers, and analytics
- `tests/` for backend test modules

Current schema notes:
- `activities` is indexed on `start_time`, `sport`, and `distance_meters`
- `activity_records` is indexed on `record_time`

Development notes:
- `httpx` is installed as a dev dependency so `fastapi.testclient` works for local endpoint verification

Container runtime:
- the backend Docker image now runs the FastAPI app with `uvicorn`
- `GET /api/v1/health` should be available from the backend container on port `8000`
