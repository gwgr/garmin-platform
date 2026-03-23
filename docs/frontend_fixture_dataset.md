# Frontend Fixture Dataset

## Purpose

Provide a deterministic local dataset for frontend development and future screenshot testing.

This dataset is intended to make dashboard and activity-page work easier without depending on live Garmin sync state.

## What it seeds

The seed command creates a stable fixture set containing:
- 12 activities across multiple sports
- lap data and record-stream samples for route/chart views
- 7 daily-metric rows
- 7 sleep sessions
- a healthy sync checkpoint state

The fixture records are clearly labeled with the prefix `fixture-`.

## What it does not do

- it does not download or modify real Garmin FIT files
- it does not rely on Garmin credentials or live sync
- it does not delete arbitrary user data

On rerun, it replaces only its own fixture records plus the matching fixture health/sleep window it manages.

## Command

From the repo root:

```bash
PYTHONPATH=backend ./.venv/bin/python -m app.seed_frontend_fixture
```

If you are using the local Docker/Postgres stack, make sure:
- local services are up
- Alembic migrations have already been applied

## Recommended local workflow

```bash
gp-local-up-bg
gp-local-alembic-upgrade
PYTHONPATH=backend ./.venv/bin/python -m app.seed_frontend_fixture
```

Then refresh:
- `/`
- `/activities`
- one activity detail page
- `/status/sync`

## Verifying the seed

The command prints the fixture counts it created, for example:

```text
Frontend fixture seed completed: {'activity_count': 12, 'lap_count': 30, 'record_count': 132, 'daily_metric_count': 7, 'sleep_session_count': 7}
```

Important:
- the total number of activities in your local database may be higher than `12`
- this is expected when you already have real locally synced/imported activities
- the seed only replaces its own `fixture-*` records; it does not wipe unrelated local data

So the authoritative verification is:
- the seed command completes successfully
- the printed fixture counts match the expected deterministic dataset
- the UI now has a stable known set of fixture-backed records available for dashboard and page development

## Notes

- the dataset is deterministic by content so the same command produces the same fixture shape every time
- it is designed for stable UI development and future screenshot baselines
- later screenshot work may still freeze the app clock to a known reference date for perfectly repeatable visual output
