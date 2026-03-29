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
- when using direct Docker port publishing for the frontend, bind it to the VPS Tailscale IP rather than `0.0.0.0`; the current production Compose file supports this with `FRONTEND_BIND_IP=<tailscale-ip>` in `/opt/garmin-platform/.env`

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

Current production access note:
- the frontend should be published only on the VPS Tailscale IP, for example `FRONTEND_BIND_IP=100.80.139.125`, so the app is not reachable on the public VPS interface
- the backend should remain unpublished on host ports and only be reachable on the internal Compose network
- deploys that change host publish settings should recreate the app containers so Docker actually reapplies the bind address

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
APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data docker compose -f docker-compose.prod.yml --env-file /opt/garmin-platform/.env exec -T backend python -m app.workers
sudo APP_USER="$(whoami)" APP_BASE_DIR=/opt/garmin-platform APP_ENV_FILE=/opt/garmin-platform/.env APP_DATA_DIR=/opt/garmin-platform/data /opt/garmin-platform/app/infra/scripts/install_sync_timer.sh
sudo systemctl enable --now garmin-sync.timer
```

Fresh-VPS credential handling:
- `bootstrap_vps.sh` now prompts for the Garmin email address and writes `GARMIN_EMAIL` into `/opt/garmin-platform/.env`
- `deploy.sh` now prompts securely for the Garmin password only when it needs to bootstrap a fresh Garmin session
- that password is not written back into `/opt/garmin-platform/.env`

Note:
- the backend image now runs the real FastAPI app and can execute Alembic and Garmin bootstrap commands inside the container
- production app services should live under `/opt/garmin-platform/app`
- protect the production env file at `/opt/garmin-platform/.env`
- current VPS shell convenience setup can now be installed with `infra/scripts/install_vps_helpers.sh`
- that installer writes a versioned helper block into `~/.bashrc`
- the installed set includes `gp-help`, `gp-env`, `gp-app`, `gp-gitpull`, `gp-deploy`, `gp-backup`, `gp-sync-once`, `gp-sync-status`, `gp-reprocess`, `gp-ps`, `gp-logs`, `gp-logs-backend`, `gp-logs-frontend`, `gp-logs-postgres`, `gp-backend-health`, and `gp-timer-status`
- the helper block includes comments above each function describing what it does
- `gp-help` prints the full VPS helper list with a one-line description of each command
- `gp-sync-once` now runs the one-shot worker inside the already-running backend container, which keeps it aligned with the live production environment
- `gp-sync-status` prints the current persisted Garmin sync checkpoint summary from the running production backend, and supports `--json` for machine-readable output
- `gp-reprocess` now runs inside the already-running backend container and forwards options such as `--limit` or `--source-activity-id`
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
- it now passes the current VPS user's UID/GID into the backend image build so container-written files under `/opt/garmin-platform/data` map back to the expected host owner
- it installs Docker packages, prepares `/opt/garmin-platform`, configures Docker group access, and clones or updates the repo into the target app path
- the deploy wrapper now also supports `SKIP_GARMIN_BOOTSTRAP=1` for VPSes where valid `GARTH_HOME` session files are already seeded
- `GARMIN_EMAIL` can remain in the protected env file for bootstrap/recovery convenience, while `GARMIN_PASSWORD` should be treated as prompt-only bootstrap input whenever possible

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
- the production deploy script keeps `/opt/garmin-platform/.env` aligned so `DATABASE_URL` uses the Compose service name `postgres`
- Docker Compose still parses the production `.env`, so literal `$` characters in VPS secret values should remain escaped as `$$`
- the deploy script decodes those escaped `POSTGRES_*` values when it rewrites `DATABASE_URL`

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
- backend API kept off the host network and reachable only on the private Compose network
- backend health checked from inside the stack with `docker compose exec` rather than through a public host port

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
- keep the MVP API privately accessible rather than broadly public, with Tailscale-first access as the current baseline
- enforce that private API boundary in production by not publishing the backend container port on the host at all; the frontend uses the internal Docker network instead

Current repo state:
- `infra/systemd/garmin-sync.service` runs the one-shot worker by executing it inside the running backend container
- `infra/systemd/garmin-sync.timer` triggers that service every 6 hours
- `infra/scripts/install_sync_timer.sh` installs the unit files and reloads `systemd`
- enable/start is now explicit via `ENABLE_SYNC_TIMER=1` or `systemctl enable --now garmin-sync.timer`
- for the initial large historical import, prefer manual one-shot worker runs before enabling the timer so Garmin rate limits and long-running backfill behavior can be observed directly
- recommended manual backfill command: `docker compose -f docker-compose.prod.yml --env-file /opt/garmin-platform/.env exec -T backend python -m app.workers`
- repeated manual runs now continue paging backward through older Garmin activity pages even when the newest page is already present locally
- `gp-sync-status` now exposes `Backfill offset` so operators can tell whether the historical import still has older pages left to inspect
- current recommended order is: install timer files first, keep them disabled during backfill, then enable `garmin-sync.timer` for steady-state syncs
- the backend now exposes `GET /api/v1/sync/status`, and the frontend dashboard links through to `/status/sync` for a lightweight operator-facing sync view
- `python -m app.print_sync_status` now provides the same sync checkpoint state in a shell-friendly operator summary, with `--json` available for structured output
- `docker-compose.prod.yml` now exposes only the frontend on the host; backend and Postgres stay private to the Compose network in the default production topology
- a raw FIT reprocessing command is now available at `python -m app.reprocess_fit_files` for rebuilding normalized activity data from stored FIT files after parser or schema changes

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
- leave raw FIT files intact so they remain the source of truth for later reprocessing

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
- Garmin session archive for faster disaster recovery when a valid session already exists

Restore expectation:
- backup work is not complete until a clean restore has been exercised and documented
- restore verification should confirm the app boots and serves expected data after database and raw-file recovery

Suggested backup locations:
- local mounted backup directory
- Synology or other secondary storage
- optional cloud backup later

Repo-owned commands:
- local backup: `./infra/scripts/backup.sh`
- local/VPS restore into a clean environment: `BACKUP_SOURCE=/path/to/snapshot ./infra/scripts/restore_backup.sh`

Current backup artifact set:
- `postgres.dump`
- `raw-data.tar.gz`
- `garth-data.tar.gz`
- `metadata.json`

Current restore-verification baseline:
- restore into an empty target data directory
- start PostgreSQL in the target environment
- restore the Postgres dump into the newly created database
- restore raw FIT storage and Garmin session state from the backup archives
- start the backend and verify health plus expected activity data presence
- bring the frontend back separately after restore verification, or rerun the normal steady-state deploy flow if you want the full stack online immediately

Current recovery guidance:
- if a VPS reset is needed, keep `/opt/garmin-platform/data/raw` and `/opt/garmin-platform/data/garth`, recreate only `/opt/garmin-platform/data/postgres`, then restore from the latest backup snapshot
- prefer production secrets that do not contain `$` so Docker Compose interpolation does not complicate steady-state operations or disaster recovery

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
- running security checks such as `pip-audit`, `npm audit`, and Trivy scans

Security baseline to add:
- `pip-audit` for Python dependency vulnerability checks
- `npm audit` for frontend dependency vulnerability checks
- Trivy scanning for repository filesystem, leaked secrets, and built backend/frontend images
- GitHub Dependabot alerts/security updates and repository code scanning such as CodeQL
- treat these checks as a release gate where practical, while acknowledging they reduce risk rather than guaranteeing zero vulnerabilities

Current dependency-audit workflow:
- run `uv export --frozen --no-dev --format requirements-txt | uv run pip-audit -r /dev/stdin` from the repo root for backend/runtime Python dependencies
- run `cd frontend && npm run audit` for frontend npm dependencies
- use `./infra/scripts/dependency_audit.sh` as the combined command locally and as the intended command to reuse in future CI
- the backend runtime dependency set now explicitly includes `requests>=2.33.0` to avoid the current `requests 2.32.5` advisory path
- this keeps dev-only Python tooling packages such as `pytest` and `rich` out of the backend vulnerability gate while still leaving them visible in normal dependency maintenance

Current Trivy workflow:
- run `./infra/scripts/trivy_scan.sh` from the repo root
- that script scans the repository filesystem for vulnerabilities, secrets, and configuration issues
- it then scans the built backend and frontend images
- by default it scans `garmin-platform-backend:latest` and `garmin-platform-frontend:latest`, but image references can be overridden with `TRIVY_BACKEND_IMAGE_REF` and `TRIVY_FRONTEND_IMAGE_REF`
- it uses a local `trivy` binary when present and otherwise falls back to the official Trivy Docker image
- it suppresses progress noise and focuses on `MEDIUM`, `HIGH`, and `CRITICAL` findings unless `TRIVY_SEVERITIES` is overridden
- it skips the known local runtime session directory at `data/garth` by default so expected Garmin session tokens do not dominate repo secret scans; override with `TRIVY_SKIP_DIRS=` if needed

Current Docker hardening baseline:
- the backend and frontend Dockerfiles now run their application processes as non-root users
- both Dockerfiles now include container-level `HEALTHCHECK` instructions
- the production frontend now runs the Next.js standalone output on a distroless Node 22 image rather than shipping the full local dev-oriented `npm` runtime
- remaining image vulnerability findings should be assessed separately from these Dockerfile-level hardening wins

Current accepted risk:
- `npm audit` currently reports one moderate Next.js advisory affecting `next/image` disk-cache growth
- the current MVP accepts that risk temporarily because the app is privately accessed and does not currently use `next/image`
- do not hide this finding; revisit it before public exposure or a major frontend upgrade cycle

Current frontend Trivy posture:
- the frontend image hardening pass substantially reduced the earlier Node/npm vulnerability noise and removed the prior frontend-image `CRITICAL` finding
- the remaining notable frontend image item is currently a `HIGH` `libc6` finding inherited from the distroless/Debian runtime base, so frontend Trivy cleanup is improved but not fully complete yet

Current repository-level security automation:
- `.github/dependabot.yml` now configures weekly Dependabot version-update checks for Python/`uv`, frontend `npm`, and GitHub Actions dependencies
- `.github/workflows/codeql.yml` now runs CodeQL for Python and JavaScript/TypeScript on pushes, pull requests, and a weekly schedule
- `.github/workflows/ci.yml` now runs backend tests and frontend build checks on push and pull request, with dependency-audit and Trivy checks included as an advisory CI job
- the repo-owned CI setup actions have now been updated to newer maintained majors (`actions/setup-python@v6`, `actions/setup-node@v6`, `astral-sh/setup-uv@v7`), and the follow-up CI run completed successfully
- GitHub-native alerts and automatic security update pull requests may still require repository security settings to be enabled in the GitHub UI

Current CI posture:
- backend tests and frontend build are the required regression gates
- dependency-audit and Trivy checks run in CI as advisory signals for now, because the current accepted Next.js audit finding and the remaining frontend Trivy items are still being tracked separately
- once the remaining accepted security findings are reduced, the advisory security job can be tightened into a blocking gate

Security verification checklist before production deploy:
- run `./infra/scripts/dependency_audit.sh`
- run `./infra/scripts/trivy_scan.sh`
- confirm the backend/frontend verification checks are green
- confirm CodeQL is not reporting fresh blocking findings
- review current Dependabot PRs and security alerts before deciding what to merge or defer
- verify no unexpected secrets are present in scan output
- verify any remaining findings are understood, documented, and acceptable for the current private deployment scope

Current release-gate expectation:
- no unresolved `CRITICAL` findings
- no unresolved unexpected `HIGH` findings in repository/config/container setup
- accepted temporary risks must be explicitly documented

Known limitation:
- these checks are best-effort risk reduction, not proof that the deployed code or images contain zero vulnerabilities

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
- `infra/scripts/restore_backup.sh`
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
