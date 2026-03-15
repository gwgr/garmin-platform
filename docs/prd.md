# PRD --- Local Garmin Data Platform

Author: Greg Rowntree Version: 1.0 Status: Draft

## 1. Product Overview

Build a local‑first system that syncs Garmin Connect data, stores raw
activity files, and provides flexible analytics and visualization
through a web application.

Primary principles: - Local data ownership - Extensible analytics - Raw
data preservation - Fast visualization

## 2. Goals

1.  Maintain a complete local archive of Garmin activity and health
    data.
2.  Provide fast visualization of activities and trends.
3.  Enable custom analysis beyond Garmin Connect.
4.  Preserve original FIT files for reproducibility.

## 3. Non‑Goals (MVP)

-   Social features
-   Multi‑user support
-   Mobile app
-   Device‑level integration
-   Workout planning

## 4. Success Metrics

-   Full historical import of Garmin activities
-   Sync latency \< 10 seconds for new activity
-   Activity detail page loads \< 2 seconds
-   Dashboard queries \< 1 second

## 5. Architecture

Garmin Connect → Sync Worker → Raw Storage → Parser Pipeline →
PostgreSQL → API Server → Web UI

## 6. Technology Stack

Backend: Python + FastAPI Database: PostgreSQL Frontend: Next.js Charts:
ECharts Maps: Leaflet or MapLibre Workers: Cron + Python async workers

## 7. Data Storage

Two storage layers are required.

Raw files: /data/raw/activities/YYYY/MM/activity.fit

Processed storage: PostgreSQL tables storing normalized metrics.

## 8. Database Tables

activities activity_laps activity_records daily_metrics sleep_sessions
devices

## 9. Data Pipeline

Step 1: Sync Garmin activities and download FIT files. Step 2: Parse FIT
files to extract summary, laps, and records. Step 3: Normalize units and
insert into database.

Units: distance = meters speed = m/s time = seconds temperature =
Celsius

## 10. API

Base path: /api/v1

Endpoints: GET /activities GET /activities/{id} GET /metrics/daily GET
/analytics/trends

## 11. Frontend Features

Dashboard: - weekly mileage - resting HR trend - recent activities

Activity List: - filtering - sorting - pagination

Activity Detail: - route map - pace chart - HR chart - elevation chart

## 12. Derived Metrics

Running: - pace zones - HR zones

Cycling: - power zones - normalized power

Training: - rolling weekly load

## 13. Sync Logic

Run every 6 hours. Avoid duplicates via activity ID. Retry failures
automatically.

## 14. Security

-   Encrypt Garmin credentials
-   Restrict API access
-   Prefer local deployment

## 15. Backup

Daily backups must include: - PostgreSQL database - raw FIT file storage

## 16. Roadmap

Phase 1: - Activity sync - FIT storage - Activity viewer - Dashboard
charts

Phase 2: - Health metrics - Gear tracking - Advanced analytics

Phase 3: - AI insights - Custom dashboards

## 17. Acceptance Criteria

System must: - Import historical Garmin data - Sync new activities
automatically - Display activity detail - Render trends dashboard -
Preserve raw FIT files
