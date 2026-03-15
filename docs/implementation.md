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

## FIT Parser

Library suggestion: fitparse

Extract: - summary - laps - record streams

Insert normalized data into database.

## API Contract

GET /api/v1/activities Returns paginated list of activities.

GET /api/v1/activities/{id} Returns activity summary, laps, and stream
samples.

GET /api/v1/metrics/daily Returns daily health metrics.

GET /api/v1/analytics/trends Returns computed trend data.

## Frontend

Framework: Next.js

Key pages: Dashboard ActivityList ActivityDetail

Charts: ECharts

Maps: Leaflet or MapLibre

## Performance

Activity queries should be indexed on: - start_time - sport - distance

activity_records table should be partitioned by month.

## Logging

Use structured logging.

Log events: - sync runs - parser errors - API errors

## Testing

Unit tests: - FIT parsing - analytics calculations - API responses

Integration tests: - full sync pipeline - activity ingestion

## Deployment

Option 1: Local machine

Option 2: Docker deployment

Containers: - backend - postgres - frontend

## Future Work

-   weather correlation
-   gear tracking
-   AI training insights
