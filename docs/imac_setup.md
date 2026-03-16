# iMac Setup

## Summary

This document records the local iMac development setup completed for the `garmin-platform` repository.

Date:
- 2026-03-16

## What Changed

### Removed Conda / Miniforge

- Removed Conda shell initialization from `~/.zshrc`
- Removed Conda shell initialization from `~/.bash_profile`
- Disabled Conda base auto-activation
- Uninstalled Miniforge from `/opt/homebrew/Caskroom/miniforge`
- Removed the `conda` Homebrew symlink

Result:
- new shells no longer auto-activate Conda
- `conda` is no longer on the default shell `PATH`

### Standardized Global Python

Installed and verified:
- Homebrew `python@3.12`
- Homebrew `uv`

Current shell default:
- `python` -> Homebrew Python 3.12
- `python3` -> Homebrew Python 3.12
- `pip` -> Homebrew pip for Python 3.12
- `pip3` -> Homebrew pip for Python 3.12

Verified version at time of setup:
- Python `3.12.13`
- `uv` `0.10.10`

Shell configuration updates:
- added `export PATH="/opt/homebrew/opt/python@3.12/libexec/bin:$PATH"` to `~/.zprofile`
- kept `alias ls="ls -G"`
- added `alias ll="ls -lahG"` for long, human-readable directory listings

### Project-Level Python Setup

Created for this repository:
- `.venv/` local virtual environment
- `.python-version` pinned to `3.12`
- `pyproject.toml`
- `uv.lock`

Updated:
- `.gitignore` to ignore `.venv/`

Project Python requirement:
- `>=3.12,<3.13`

Installed project dependencies:
- `fastapi>=0.135.1`
- `psycopg[binary]>=3.3.3`
- `sqlalchemy>=2.0.48`
- `alembic>=1.18.4`
- `uvicorn>=0.42.0`

Installed development dependencies:
- `httpx>=0.28.1`
- `pytest>=9.0.2`
- `ruff>=0.15.6`

Verified versions at time of setup:
- FastAPI `0.135.1`
- Psycopg `3.3.3`
- SQLAlchemy `2.0.48`
- Alembic `1.18.4`
- Uvicorn `0.42.0`
- HTTPX `0.28.1`
- Pytest `9.0.2`
- Ruff `0.15.6`

## Current Workflow

From the repository root:

```bash
cd /Users/gregrowntree/Documents/Dev/garmin-platform
source .venv/bin/activate
python --version
```

To add dependencies:

```bash
uv add <package-name>
```

Current starter set:

```bash
uv add fastapi psycopg sqlalchemy alembic uvicorn
uv add --dev httpx pytest ruff
```

To refresh the environment from the lockfile:

```bash
uv sync
```

To run tools inside the project environment:

```bash
uv run pytest
uv run ruff check .
PYTHONPATH=backend ./.venv/bin/python -c "from fastapi.testclient import TestClient; from app.main import app; client = TestClient(app); print(client.get('/api/v1/health').json())"
```

### Docker Desktop

Installed:
- Docker Desktop app via Homebrew Cask

Current state:
- `Docker.app` is present in `/Applications`
- Docker CLI is available
- Docker Compose CLI is available

Verified versions at time of setup:

```bash
docker --version
docker compose version
```

Observed results:
- Docker `29.2.1`
- Docker Compose `v5.1.0`

Daemon verification command:

```bash
docker info
```

Note:
- `docker info` could not be fully verified from the Codex sandbox because the sandbox cannot access the local Docker socket
- if `docker info` works in your own terminal, Docker Desktop is fully ready to use

### Local Postgres via Docker Compose

Created for this repository:
- `docker-compose.yml`
- `.env.example`
- local `.env` for development

Service details:
- service name: `postgres`
- container name: `garmin-platform-postgres`
- image: `postgres:16`
- host port: `5432`
- data directory: `./postgres-data`

Configured local development values:
- `POSTGRES_DB=garmin_platform`
- `POSTGRES_USER=garmin`
- `POSTGRES_PASSWORD=garmin_local_dev_password`
- `DATABASE_URL=postgresql+psycopg://garmin:garmin_local_dev_password@localhost:5432/garmin_platform`

Current status at time of setup:
- container started successfully
- Postgres healthcheck is passing
- database is accepting connections

Useful commands:

```bash
docker compose up -d postgres
docker compose ps
docker compose logs -f postgres
docker compose down
```

## Why This Setup

This project is a better fit for a simple repository-local virtual environment than Conda because:

- it is a standard Python web/backend project
- it does not currently need Conda-managed scientific packages
- a local `.venv` is easier to reason about
- `uv` provides fast installs and reproducible locking

## Notes

- The local virtual environment includes `pip`, available at `.venv/bin/pip`.
- The system Python at `/usr/bin/python3` still exists on macOS, but it is no longer the default developer Python in the shell.
- Docker Desktop client tooling is installed and available in the shell.
- Local Postgres now runs through Docker Compose for development.
