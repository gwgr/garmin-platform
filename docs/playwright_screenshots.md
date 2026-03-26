# Playwright Screenshots

## Purpose

Provide repeatable screenshot coverage for the main frontend pages using the deterministic fixture dataset.

The goal is to catch layout regressions while the Version 2 dashboard evolves.

## What it covers

- dashboard
- activities list
- activity detail
- sync status

## How it works

The Playwright setup starts:
- a deterministic mock API server on `127.0.0.1:8010`
- an isolated frontend server on `127.0.0.1:3010`

The mock API serves a repeatable dataset shaped to match the main dashboard and activity-page flows, so screenshots do not depend on local Python, Docker, or live Garmin sync state.

The frontend uses a native isolated Next server flow with a separate build directory under `.next-playwright/` so the screenshot flow does not compete with a normal local dev server using `.next/`.

This means the screenshots do not depend on whatever happens to be in your normal local development Postgres database.

## Commands

From `frontend/`:

```bash
npm run test:screenshots
```

To create or refresh the screenshot baselines:

```bash
npm run test:screenshots:update
```

## Verified local workflow

The screenshot flow was verified locally with host Node `22.x`.

If the mock API and isolated frontend server are already running, you can skip Playwright's server orchestration and drive the screenshot run against those live ports:

```bash
PLAYWRIGHT_USE_EXTERNAL_SERVERS=1 ./node_modules/.bin/playwright test tests/screenshots.spec.ts --update-snapshots
```

That mode expects:
- mock API on `127.0.0.1:8010`
- frontend on `127.0.0.1:3010`

The most reliable manual sequence is:

```bash
# terminal 1
cd frontend
node tests/mock-api-server.mjs

# terminal 2
cd frontend
NEXT_TELEMETRY_DISABLED=1 PLAYWRIGHT_DIST_DIR=.next-playwright NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8010/api/v1 INTERNAL_API_BASE_URL=http://127.0.0.1:8010/api/v1 npm run dev -- --hostname 127.0.0.1 --port 3010

# terminal 3
cd frontend
PLAYWRIGHT_USE_EXTERNAL_SERVERS=1 ./node_modules/.bin/playwright test tests/screenshots.spec.ts --update-snapshots
```

## Notes

- the activity-detail screenshot masks the Leaflet tile container to avoid unstable map-tile imagery in the baseline
- the screenshot tests intentionally avoid `networkidle` waits because the isolated Next dev server keeps background activity alive long enough to make those waits flaky
- the screenshot suite is intentionally focused on the high-value main pages rather than every component
- this is a frontend-regression tool, not a substitute for normal API/backend tests

## Troubleshooting

- if the local UI does not reflect a recent frontend source change, rebuild the local frontend container with `docker compose up -d --build frontend`
- if Playwright starts failing locally before it can launch or parse args, refresh the frontend install with `cd frontend && npm ci`
