# Garmin Platform

Local-first Garmin data platform for syncing activity data, storing raw files, and building custom analytics and visualizations.

## Current Status

This repository is in early setup. The current local foundation includes:
- Python project setup with `uv`, `.venv`, `pyproject.toml`, and `uv.lock`
- Dockerfiles for backend and frontend container scaffolding
- local development and production Compose files
- setup and planning docs in `docs/`

The backend FastAPI project structure is now scaffolded, including environment-based settings management and SQLAlchemy session setup, and the backend Docker container now runs the real FastAPI app. The frontend app is not yet implemented and still serves placeholder content.

The first API endpoint is now available at `GET /api/v1/health`.

The initial database schema now includes `activities`, `activity_laps`, `activity_records`, `daily_metrics`, `sleep_sessions`, and `devices`, with Alembic migrations applied to the local development database. Query indexes are in place for activity start time, sport, distance, and activity record timestamp.

## Key Documents

- Product requirements: `docs/prd.md`
- Implementation notes: `docs/implementation.md`
- Development and deployment workflow: `docs/dev_deployment.md`
- Task list and current progress: `docs/tasks.md`
- Local machine setup notes: `docs/imac_setup.md`

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
PYTHONPATH=backend ./.venv/bin/alembic -c alembic.ini heads
docker compose up --build backend
docker compose ps
docker compose -f docker-compose.prod.yml config
```

Note:
- `.env` keeps `DATABASE_URL` pointed at `localhost` for host-based development
- the Compose files override that value to use the `postgres` service hostname for container-to-container networking
