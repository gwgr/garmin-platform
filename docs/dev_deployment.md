# DEV_DEPLOYMENT.md

## Purpose

This document defines the recommended development and deployment workflow for the Local Garmin Data Platform.

Primary approach:
- Develop on the iMac
- Use GitHub as the source of truth
- Deploy to the Ubuntu VPS
- Use Docker Compose for consistency
- Keep PostgreSQL data and raw FIT files on persistent VPS storage

Current repo status as of 2026-03-16:
- local Python tooling is set up with `uv`, `.venv`, `.python-version`, `pyproject.toml`, and `uv.lock`
- local and production Docker Compose files are present
- backend and frontend Dockerfiles are present
- `.env.example` exists for local database configuration
- dev tooling includes `pytest`, `ruff`, and `httpx` for backend verification
- backend FastAPI project structure is scaffolded
- backend Docker container is configured to run the FastAPI app with `uvicorn`
- backend environment settings are read from environment variables
- SQLAlchemy engine and session management are scaffolded
- Alembic migration scaffolding is present
- initial backend health endpoint is implemented at `GET /api/v1/health`
- activity listing endpoint is implemented at `GET /api/v1/activities` and has been verified locally against the Postgres-backed app
- activity detail endpoint is implemented at `GET /api/v1/activities/{id}` and has been verified locally with summary, lap, and record data
- daily metrics endpoint is implemented at `GET /api/v1/metrics/daily`
- analytics trends endpoint is implemented at `GET /api/v1/analytics/trends`
- the initial schema models and migrations for `activities`, `activity_laps`, `activity_records`, `daily_metrics`, `sleep_sessions`, and `devices` are present and applied locally
- query indexes are applied locally for activity start time, sport, distance, and record timestamp
- Garmin client access is implemented through a `garth`-backed backend service
- sync checkpoint storage is implemented in the database and backend service layer
- Garmin activity list fetching is implemented as a checkpoint-aware backend service
- new activity detection and `source_activity_id`-based deduplication are implemented in the backend service layer
- FIT download and raw file storage are implemented with `garth` and local raw-data persistence, and have been validated locally
- FIT parsing and activity-summary persistence are implemented in the backend service layer
- FIT lap parsing and `activity_laps` persistence are implemented in the backend service layer
- FIT per-record stream parsing and `activity_records` persistence are implemented in the backend service layer
- FIT record coordinates are normalized to degrees for frontend route-map rendering
- structured JSON logging is implemented for sync runs and parser failures
- backend sync worker entrypoint is implemented for running the Garmin pipeline outside the API server
- frontend Next.js scaffold is present and the frontend container is ready to run the app
- frontend shared API client utilities are implemented for the current backend endpoints
- initial frontend dashboard page is implemented and consumes the current backend APIs
- frontend activity list page is implemented and uses the backend activity list endpoint
- frontend activity detail page is implemented and uses the backend activity detail endpoint
- frontend activity detail charts are implemented for pace, heart rate, and elevation
- frontend activity detail route map is implemented with Leaflet

---

## 1. Recommended Workflow

### Development machine
Use the iMac as the main development environment.

Reasons:
- Faster iteration
- Better Codex experience
- Safer than developing directly on the server
- Easier testing and debugging

### Source control
Use GitHub as the canonical repository.

Recommended branches:
- `main` = stable, deployable
- `dev` = active integration branch
- feature branches optional for larger work

### Deployment target
Use the Ubuntu VPS primarily for:
- running the application
- hosting PostgreSQL
- storing raw Garmin files
- backups
- reverse proxy / secure access

---

## 2. Environment Strategy

### Local development
Purpose:
- fast iteration
- local testing
- Codex-driven implementation
- schema and API development

Recommended local setup:
- backend runs locally or in Docker
- frontend runs locally or in Docker
- PostgreSQL via Docker
- test data volume
- hot reload enabled

### VPS production
Purpose:
- durable runtime environment
- persistent data storage
- secure remote access

Recommended VPS setup:
- Docker Compose
- persistent volumes
- reverse proxy
- environment variables stored on host
- access restricted via Tailscale or authenticated HTTPS

---

## 3. Repository Structure

Current repository state:

```text
garmin-platform/
  docs/
    dev_deployment.md
    imac_setup.md
    implementation.md
    prd.md
    tasks.md
  backend/
    alembic/
    app/
    tests/
    Dockerfile
  frontend/
    Dockerfile
  docker-compose.yml
  docker-compose.prod.yml
  .env.example
  README.md
  pyproject.toml
  uv.lock
```

Target structure:

```text
garmin-platform/
  docs/
    prd.md
    implementation.md
    dev_deployment.md
    tasks.md
  backend/
    app/
    tests/
    alembic/
    Dockerfile
  frontend/
    src/
    public/
    Dockerfile
  infra/
    caddy/
    nginx/
    scripts/
  docker/
  docker-compose.yml
  docker-compose.prod.yml
  .env.example
  README.md
```

---

## 4. Docker Recommendation

Use Docker where it adds consistency, but keep local Python tooling available for fast iteration.

Benefits:
- same runtime on iMac and VPS
- simpler dependency management
- reproducible deploys
- easier rollback

Current services:
- backend FastAPI container
- frontend placeholder container
- postgres

Target services:
- backend
- frontend
- postgres
- worker
- optional caddy or nginx

---

## 5. Local Development Workflow

Typical cycle:
1. Pull latest repo from GitHub
2. Work on `dev` branch or feature branch
3. Use Codex to implement one task at a time
4. Run tests locally
5. Run app locally
6. Commit changes
7. Push to GitHub

Suggested commands:
```bash
git checkout dev
git pull origin dev
docker compose up --build
```

---

## 6. GitHub Workflow

Recommended minimum workflow:
- develop locally
- push to GitHub
- merge stable work into `main`
- deploy from `main`

Suggested policy:
- do not edit production code directly on the VPS
- do not make manual untracked changes on the VPS
- all deployable changes should come from Git

---

## 7. VPS Deployment Workflow

Recommended deploy pattern:
1. Bootstrap a fresh VPS if needed
2. Create and protect `/opt/garmin-platform/.env`
3. Run the deploy wrapper from `/opt/garmin-platform/app`
4. Perform the initial historical backfill with manual one-shot worker runs
5. Install the `systemd` timer files
6. Enable the timer only after the backlog is under control
7. Verify health and logs

Example:
```bash
cd ~/garmin-platform-bootstrap
sudo TARGET_USER="$(whoami)" ./infra/scripts/bootstrap_vps.sh
logout

cd /opt/garmin-platform/app
cp .env.example /opt/garmin-platform/.env
# edit /opt/garmin-platform/.env with real values
APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data ./infra/scripts/deploy.sh
APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data SKIP_GARMIN_BOOTSTRAP=1 docker compose -f docker-compose.prod.yml --env-file /opt/garmin-platform/.env run --rm backend python -m app.workers
sudo APP_USER="$(whoami)" APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data /opt/garmin-platform/app/infra/scripts/install_sync_timer.sh
sudo systemctl enable --now garmin-sync.timer
```

Note:
- the backend image now runs the real FastAPI app and can execute Alembic and Garmin bootstrap commands inside the container
- production app services should live under `/opt/garmin-platform/app`
- protect the production env file at `/opt/garmin-platform/.env`
- current VPS shell convenience setup includes `~/.bashrc` helpers such as `gp-deploy`, `gp-sync-once`, `gp-ps`, `gp-logs`, and `gp-timer-status`
- backend startup now checks database connectivity plus required `RAW_DATA_DIR` and `GARTH_HOME` paths before reporting healthy

Wrap this later in:
```bash
./deploy.sh
```

Current repo state:
- the VPS bootstrap wrapper now exists at `infra/scripts/bootstrap_vps.sh`
- the deploy wrapper now exists at `infra/scripts/deploy.sh`
- it expects the repo checkout at `/opt/garmin-platform/app`
- it reads production settings from `/opt/garmin-platform/.env`
- it uses `/opt/garmin-platform/data` for persistent PostgreSQL, raw FIT, and Garmin session storage
- it installs Docker packages, prepares `/opt/garmin-platform`, configures Docker group access, and clones or updates the repo into the target app path
- the deploy wrapper now also supports `SKIP_GARMIN_BOOTSTRAP=1` for VPSes where valid `GARTH_HOME` session files are already seeded

---

## 8. Persistent Storage

Use persistent storage on the VPS for:

### PostgreSQL data
Suggested path:
```text
/opt/garmin-platform/data/postgres
```

### Raw Garmin files
Suggested path:
```text
/opt/garmin-platform/data/raw
```

### Garmin session state
Suggested path:
```text
/opt/garmin-platform/data/garth
```

Requirements:
- do not store important data only inside containers
- raw FIT files must persist across redeploys
- database must persist across container rebuilds
- Garmin session state must persist across redeploys so steady-state syncs do not require `GARMIN_PASSWORD`

---

## 9. Environment Variables

Keep:
- `.env.example` in the repo
- `.env` out of the repo
- production env file on the VPS

Container networking note:
- host-based local tooling can use `localhost` in `DATABASE_URL`
- containerized services should use the Compose service name `postgres` instead

Likely variables:
- `GARMIN_EMAIL`
- `GARMIN_PASSWORD` for bootstrap/recovery only
- `DATABASE_URL`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `APP_SECRET_KEY`
- `NEXT_PUBLIC_API_BASE_URL`

Production env location suggestion:
```text
/opt/garmin-platform/.env
```

Current VPS findings:
- target host is Ubuntu `24.04`
- `systemd` is available for timers/services
- `git` is already installed
- Docker still needs to be installed
- current example deploy user is `claw`, but the bootstrap flow supports any existing VPS user

---

## 10. Reverse Proxy and Access

Recommended initial access model:
- use Tailscale
- keep app private initially
- avoid broad public exposure until auth is in place

Current private-access example:
- frontend via `http://prod-vps:3000`
- backend health via `http://prod-vps:8000/api/v1/health`

If public exposure is needed:
- use HTTPS
- put app behind Caddy or Nginx
- require authentication
- restrict admin and sync endpoints

---

## 11. Background Jobs

Do not rely on the web process for scheduled sync jobs.

Recommended approach:
- separate worker container using the same backend image
- scheduler via cron or internal scheduler
- sync every 6 hours

Current local state:
- the backend now includes a scheduled sync loop at `backend/app/workers/scheduled_sync.py`
- it reuses the existing sync worker entrypoint and sleeps for 6 hours between runs
- local runtime command: `PYTHONPATH=backend ./.venv/bin/python -m app.workers.scheduled_sync`
- both Compose files now model this as a separate `worker` service using the same backend image, `.env`, database settings, and `/app/data` mount as the API service

Agreed production direction:
- use Docker Compose for the long-running `frontend`, `backend`, and `postgres` services
- run sync jobs from the host on a timer using the one-shot worker command `python -m app.workers`
- keep the long-running `worker` container as a development convenience and optional fallback, not the primary production scheduler
- install `docker.io` and `docker-compose-v2` from Ubuntu apt packages during VPS setup
- run normal deploys as the chosen VPS app user after one-time system setup

Current repo state:
- `infra/systemd/garmin-sync.service` runs the one-shot worker via Docker Compose with `SKIP_GARMIN_BOOTSTRAP=1`
- `infra/systemd/garmin-sync.timer` triggers that service every 6 hours
- `infra/scripts/install_sync_timer.sh` installs the unit files and reloads `systemd`
- enable/start is now explicit via `ENABLE_SYNC_TIMER=1` or `systemctl enable --now garmin-sync.timer`
- for the initial large historical import, prefer manual one-shot worker runs before enabling the timer so Garmin rate limits and long-running backfill behavior can be observed directly
- recommended manual backfill command: `docker compose -f docker-compose.prod.yml --env-file /opt/garmin-platform/.env run --rm backend python -m app.workers`
- current recommended order is: install timer files first, keep them disabled during backfill, then enable `garmin-sync.timer` for steady-state syncs

Agreed production secret direction:
- store production secrets in a protected host env file such as `/opt/garmin-platform/.env`
- do not commit real runtime secrets into the repository
- use persisted `GARTH_HOME` session state for steady-state Garmin syncs
- treat `GARMIN_PASSWORD` as bootstrap/recovery-only rather than a normal always-present runtime secret
- bootstrap or recover the Garmin session with `PYTHONPATH=backend ./.venv/bin/python -m app.bootstrap_garmin_auth`

Worker responsibilities:
- fetch new Garmin activities
- download FIT files
- update sync checkpoint
- trigger parsing

---

## 12. Backup Strategy

Back up both:
- PostgreSQL database
- raw FIT file storage

Recommended frequency:
- daily backup
- periodic restore test

Minimum backup outputs:
- Postgres dump
- compressed raw data archive

Suggested backup locations:
- local mounted backup directory
- Synology or other secondary storage
- optional cloud backup later

---

## 13. CI/CD Recommendation

### Start simple
Use manual deploy first.

Why:
- easy to understand
- fewer moving parts
- simpler troubleshooting

### Later upgrade
Add GitHub Actions for:
- running tests on push
- building containers
- optional automated deploy on merge to `main`

---

## 14. What to Avoid

Do not:
- develop primarily on the VPS
- edit live production files outside Git
- store raw data only inside containers
- mix dev and prod databases
- allow large uncontrolled Codex edits directly on production

---

## 15. Recommended Initial Setup Sequence

1. Create GitHub repo
2. Clone repo to iMac
3. Add docs
4. Standardize local Python tooling with `uv`
5. Add local PostgreSQL via `docker-compose.yml`
6. Scaffold backend and frontend
7. Add Dockerfiles
8. Add `docker-compose.prod.yml`
9. Create VPS project directory
10. Clone repo to VPS
11. Configure `.env`
12. Start containers
13. Run migrations
14. Verify app and database
15. Add backup script
16. Add deploy script

---

## 16. Initial Files Codex Should Generate

Strongly recommended next files:
- `infra/scripts/deploy.sh`
- `infra/scripts/backup.sh`
- `README.md`

---

## 17. Recommended Deployment Strategy Summary

Best-fit strategy for this project:
- build locally on iMac with Codex
- commit to GitHub
- deploy to Ubuntu VPS from GitHub
- run app with Docker Compose
- keep Postgres and FIT storage on persistent volumes
- access privately via Tailscale first
