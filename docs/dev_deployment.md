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
- the initial schema models and migrations for `activities`, `activity_laps`, `activity_records`, `daily_metrics`, `sleep_sessions`, and `devices` are present and applied locally
- query indexes are applied locally for activity start time, sport, distance, and record timestamp
- frontend app code has not been scaffolded yet

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
1. SSH into VPS
2. Pull latest code
3. Rebuild containers
4. Run migrations
5. Verify health
6. Check logs

Example:
```bash
cd /opt/garmin-platform
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs --tail=100
```

Note:
- the current backend container is a placeholder and does not yet run migrations
- add the Alembic command back once the real backend app is scaffolded

Wrap this later in:
```bash
./deploy.sh
```

---

## 8. Persistent Storage

Use persistent storage on the VPS for:

### PostgreSQL data
Suggested path:
```text
./data/postgres
```

### Raw Garmin files
Suggested path:
```text
./data/raw
```

Requirements:
- do not store important data only inside containers
- raw FIT files must persist across redeploys
- database must persist across container rebuilds

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
- `GARMIN_PASSWORD` or token variables
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

---

## 10. Reverse Proxy and Access

Recommended initial access model:
- use Tailscale
- keep app private initially
- avoid broad public exposure until auth is in place

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
