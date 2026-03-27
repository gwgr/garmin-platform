# IMPLEMENTATION_SPEC.md

## Project Structure

garmin-platform/ backend/ app/ api/ models/ services/ parsers/ workers/
analytics/ config/ main.py frontend/ pages/ components/ charts/ maps/
storage/ raw/ scripts/ docker/

## Backend Responsibilities

API Layer - expose REST endpoints - authentication - request validation

Services - activity service - metrics service - analytics service

Parsers - FIT file parser - normalization logic

Workers - Garmin sync worker - parsing worker

Analytics - derived metrics - trend computation - rolling windows

## Database Migrations

Use Alembic.

Initial migration should create: - activities - activity_laps -
activity_records - daily_metrics - sleep_sessions - devices

## Sync Worker

Responsibilities: - fetch activity list - detect new activities -
download FIT files - update sync checkpoint

Retry strategy: - exponential backoff - max 5 retries

Operational visibility:
- expose recent sync success/failure state in an operator-friendly way

## FIT Parser

Library suggestion: fitparse

Extract: - summary - laps - record streams

Insert normalized data into database.

Reprocessing note:
- preserve raw FIT files as immutable inputs
- support rebuilding normalized activity summaries, laps, and records from stored FIT files after parser or schema improvements

## API Contract

GET /api/v1/activities Returns paginated list of activities.

GET /api/v1/activities/{id} Returns activity summary, laps, and stream
samples.

GET /api/v1/metrics/daily Returns daily health metrics.

GET /api/v1/analytics/trends Returns computed trend data.

Operational/API note:
- the MVP API is private and should sit behind a real access-control boundary in deployment

## Frontend

Framework: Next.js App Router

Key pages: Dashboard ActivityList ActivityDetail SyncStatus

Styling/layout system:
- Tailwind CSS v4 for layout, spacing, and design-token application
- shared local UI primitives for cards, buttons, tabs, tables, and dialogs

Charts: lightweight SVG chart components

Maps: Leaflet or MapLibre

## Performance

Activity queries should be indexed on: - start_time - sport - distance

activity_records table should be partitioned by month.

Version 2 note:
- revisit partitioning only in the context of observed single-user growth and real query patterns

## Logging

Use structured logging.

Log events: - sync runs - parser errors - API errors

## Testing

Unit tests: - FIT parsing - analytics calculations - API responses

Integration tests: - full sync pipeline - activity ingestion

Frontend/regression note:
- add deterministic fixture data for frontend development and screenshot-based regression coverage
- keep the local Playwright screenshot workflow aligned with the current frontend stack and host Node 22 runtime

## Deployment

Option 1: Local machine

Option 2: Docker deployment

Containers: - backend - postgres - frontend

Operational hardening:
- verify backup restore in a clean environment
- document and surface sync health/state for operators

## Future Work

-   weather correlation
-   gear tracking
-   AI training insights
