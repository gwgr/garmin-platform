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
- `fitparse>=1.2.0`
- `garth>=0.6.3`
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
- Fitparse `1.2.0`
- Garth `0.6.3`
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
uv add fastapi fitparse garth psycopg sqlalchemy alembic uvicorn
uv add --dev httpx pip-audit pytest ruff
```

To refresh the environment from the lockfile:

```bash
uv sync
```

To run tools inside the project environment:

```bash
uv run pytest
uv run ruff check .
uv run pip-audit
PYTHONPATH=backend ./.venv/bin/python -c "from fastapi.testclient import TestClient; from app.main import app; client = TestClient(app); print(client.get('/api/v1/health').json())"
set -a && source .env && set +a
```

Security scan helpers:

```bash
./infra/scripts/dependency_audit.sh
./infra/scripts/trivy_scan.sh
```

Frontend workflow is also available locally:

```bash
cd /Users/gregrowntree/Documents/Dev/garmin-platform/frontend
npm install
npm run dev
```

Containerized local app workflow:
- `docker compose up --build` starts `postgres`, `backend`, and `frontend`
- the scheduled `worker` is now opt-in for local development so Garmin sync does not begin automatically
- to run the worker locally through Docker, use `docker compose --profile sync up --build worker`

Local shell convenience setup:
- helper functions can be added to `~/.zshrc` for `gp-local-root`, `gp-local-env`, `gp-local-up`, `gp-local-up-bg`, `gp-local-down`, `gp-local-ps`, `gp-local-logs`, `gp-local-logs-backend`, `gp-local-logs-frontend`, `gp-local-logs-postgres`, `gp-local-worker-up`, `gp-local-worker-once`, `gp-local-alembic-upgrade`, `gp-local-health`, `gp-local-audit`, and `gp-local-trivy`
- these helpers make it easier to start, stop, inspect, migrate, and health-check the local stack without retyping the repo path each time
- `gp-local-audit` is the convenience wrapper for the combined dependency audit script at `./infra/scripts/dependency_audit.sh`
- `gp-local-trivy` is the convenience wrapper for the Trivy scan script at `./infra/scripts/trivy_scan.sh`

Verified locally:
- `npm install`
- `npm run build`
- `npm audit`
- browser checks for `/`, `/activities`, and `/activities/1`
- chart checks on the activity detail page at `/activities/1`
- route map check on the activity detail page after record-coordinate normalization

Observed frontend package status:
- `next@15.5.13`
- build passes locally
- `npm audit` currently reports one moderate Next.js advisory related to `next/image` disk-cache growth
- current decision: accept that risk for the private MVP for now rather than force a breaking upgrade to Next.js 16
- revisit this before public exposure or if the app begins using `next/image`

Trivy note:
- `./infra/scripts/trivy_scan.sh` can use either a local `trivy` install or the official Trivy Docker image
- build the local backend and frontend images before running image scans if you want the default image names to exist locally
- the script suppresses progress noise and focuses on `MEDIUM`, `HIGH`, and `CRITICAL` findings by default; set `TRIVY_SEVERITIES=LOW,MEDIUM,HIGH,CRITICAL` if you want a broader report
- the filesystem scan skips `data/garth` by default so known local Garmin session tokens do not dominate the secret scan; set `TRIVY_SKIP_DIRS=` if you want to include that path

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

### Frontend Tooling

Installed and verified:
- Homebrew `node`
- `npm`

Observed versions:
- Node `25.8.1`
- npm `11.11.0`

Why this matters:
- enables running the Next.js frontend locally without depending only on Docker
- supports `npm install`, `next dev`, and future frontend linting/type-checking tasks

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
- `GARTH_HOME=./data/garth`
- `LOG_LEVEL=INFO`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`

Compose-specific networking note:
- the browser continues using `NEXT_PUBLIC_API_BASE_URL`
- the containerized frontend now uses `INTERNAL_API_BASE_URL=http://backend:8000/api/v1` for server-side requests between containers

Garmin integration notes:
- Garmin email may be kept in local `.env`, but steady-state local sync now resumes from saved `GARTH_HOME` session files without requiring `GARMIN_PASSWORD`
- `garth` stores local session files under `GARTH_HOME`
- first-time Garmin auth may prompt for MFA in the terminal
- local `GARMIN_PASSWORD` has been removed after session bootstrap and the saved session still verifies correctly
- raw FIT files are saved under `data/raw/activities/YYYY/MM/<activity_id>.fit`
- downloaded Garmin FIT files can now be parsed locally for summary, lap, and record stream data
- backend sync and parser logs now emit structured JSON lines locally

Current status at time of setup:
- container started successfully
- Postgres healthcheck is passing
- database is accepting connections
- Garmin activity listing is working locally through `garth`
- FIT download and raw file persistence have been verified locally
- the worker entrypoint has been run locally and confirmed to import additional historical Garmin activities into Postgres

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
- Node.js and npm are installed and available for local frontend development.
- Local Postgres now runs through Docker Compose for development.
