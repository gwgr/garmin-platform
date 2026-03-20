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
-   Comprehensive Garmin health/physiology ingestion such as HRV, VO2 max,
    lactate threshold, endurance metrics, and richer sleep detail

## 4. Success Metrics

-   Full historical import of Garmin activities
-   Sync latency \< 10 seconds for new activity
-   Activity detail page loads \< 2 seconds
-   Dashboard queries \< 1 second

## 5. Architecture

Garmin Connect → Sync Worker → Raw Storage → Parser Pipeline →
PostgreSQL → API Server → Web UI

Operational deployment note:
- the current MVP deployment publishes the frontend over the private tailnet and keeps the backend API private to the Docker network
- frontend server-side requests call the backend over the internal service network rather than exposing the API directly on a host port

## 6. Technology Stack

Backend: Python + FastAPI Database: PostgreSQL Frontend: Next.js Charts:
ECharts Maps: Leaflet Workers: one-shot Python worker via `systemd` timer in production, scheduled Python loop for local/dev convenience

## 7. Data Storage

Two storage layers are required.

Raw files: /data/raw/activities/YYYY/MM/activity.fit

Processed storage: PostgreSQL tables storing normalized metrics.

## 8. Database Tables

activities activity_laps activity_records daily_metrics sleep_sessions
devices

Note for future expansion:
- keep `daily_metrics` focused on lightweight daily rollups
- add specialized tables later for richer physiology/performance and sleep data
- retain provenance fields and raw-source references for reprocessing
- treat `devices` as captured device metadata for now, not as full gear tracking
- handle future gear tracking as a separate Version 2+ concern with its own schema and UX

## 9. Data Pipeline

Step 1: Sync Garmin activities and download FIT files. Step 2: Parse FIT
files to extract summary, laps, and records. Step 3: Normalize units and
insert into database.

Version 2 extension:
- fetch Garmin health/physiology endpoints separately from activity FIT ingestion
- preserve raw JSON snapshots for future health-metric reprocessing
- keep ingestion, normalization, and analytics as separate layers

Units: distance = meters speed = m/s time = seconds temperature =
Celsius

## 10. API

Base path: /api/v1

Endpoints:
- GET /health
- GET /activities
- GET /activities/{id}
- GET /metrics/daily
- GET /analytics/trends
- GET /sync/status

Operational note:
- the MVP API is intended for private access only
- deployment should enforce a real access boundary such as Tailscale-only exposure or equivalent private access controls
- current MVP enforcement is: frontend published privately over Tailscale, backend API kept private to the internal container network, and operational health checks performed from inside the stack

## 11. Frontend Features

Dashboard:
- weekly and monthly distance summaries
- resting HR trend
- recent activities
- daily metric snapshot
- sync-status card with click-through details

Activity List:
- filtering
- pagination
- sorted by most recent activity

Activity Detail:
- route map
- pace chart
- HR chart
- elevation chart
- lap breakdown
- per-record stream detail

## 12. Derived Metrics

Running: - pace zones - HR zones

Cycling: - power zones - normalized power

Training: - rolling weekly load

## 13. Sync Logic

Run every 6 hours. Avoid duplicates via activity ID. Retry failures
automatically.

Operational note:
- raw FIT files remain the source of truth for later reprocessing
- the system should support rebuilding normalized activity data from preserved raw FIT files after parser improvements
- operators should be able to see when sync has last succeeded or failed

## 14. Security

-   Treat Garmin password as bootstrap/recovery-only rather than always-present runtime config
-   Persist Garmin session state in protected local/VPS storage
-   Restrict API access
-   Prefer local-first/private deployment
-   Use dependency, Trivy, and GitHub-native security checks as the MVP release baseline

## 15. Backup

Daily backups must include: - PostgreSQL database - raw FIT file storage

Operational note:
- backup success alone is not sufficient; the restore path should be tested in a clean environment

## 16. Roadmap

Phase 1: - Activity sync - FIT storage - Activity viewer - Dashboard
charts

Phase 2: - Health metrics - Gear tracking - Advanced analytics

Version 2 health metrics focus:
- HRV history
- VO2 max history
- richer sleep metrics and summaries
- lactate threshold
- endurance-related metrics
- expanded health trend visualizations

Version 2 gear/device note:
- distinguish device identification from gear tracking
- device identification covers which Garmin device recorded an activity
- gear tracking covers owned gear, usage history, and lifecycle tracking

Version 2+ enrichment ideas:
- weather correlation for activities and trend analysis
- additional external-context enrichment should remain separate from core ingestion

Version 2 frontend/platform note:
- introduce a shared frontend layout/component system with consistent spacing, typography, and state handling
- support deterministic fixture data for frontend regression and screenshot testing
- review long-term `activity_records` scaling strategy as the archive grows

Phase 3: - AI insights - Custom dashboards

## 17. Acceptance Criteria

System must:
- Import historical Garmin data
- Sync new activities automatically
- Display activity detail with charts and route map when GPS data is available
- Render the dashboard and activity list views from live backend data
- Preserve raw FIT files
- Support rebuilding normalized activity data from preserved raw FIT files
