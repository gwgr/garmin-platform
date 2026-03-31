# ORIGINAL_SCHEMA.md

## Purpose

This document captures the original MVP database schema as implemented before the Version 2 health and physiology expansion work.

It is intended to be the baseline reference for:

- the current production/local normalized data model
- Task 92 schema-extension design work
- future migrations that need to distinguish the original tables from later additions

## Source of truth

The original schema is defined by:

- the SQLAlchemy models under `backend/app/models/`
- the Alembic migrations under `backend/alembic/versions/`

Key initial migrations:

- `20260316_0001_create_activities_table.py`
- `20260316_0002_create_activity_laps_table.py`
- `20260316_0003_create_activity_records_table.py`
- `20260316_0004_create_daily_metrics_table.py`
- `20260316_0005_create_sleep_sessions_table.py`
- `20260316_0006_create_devices_table.py`
- `20260316_0007_add_activity_indexes.py`
- `20260317_0008_create_sync_checkpoints_table.py`
- `20260319_0009_add_sync_status_fields.py`
- `20260321_0010_add_backfill_offset_to_sync_checkpoints.py`

## Original tables

### `activities`

Purpose:
- store the canonical normalized activity summary record for each Garmin activity

Key fields:
- `id`
- `source_activity_id`
- `name`
- `sport`
- `start_time`
- `duration_seconds`
- `distance_meters`
- `calories`
- `raw_file_path`
- `created_at`
- `updated_at`

Important constraints and indexes:
- unique `source_activity_id`
- index on `start_time`
- index on `sport`
- index on `distance_meters`

### `activity_laps`

Purpose:
- store per-lap summary data for an activity

Key fields:
- `id`
- `activity_id`
- `lap_index`
- `start_time`
- `duration_seconds`
- `distance_meters`
- `average_heart_rate`
- `max_heart_rate`
- `calories`
- `created_at`

Important constraints:
- foreign key to `activities.id` with cascade delete
- unique on `activity_id`, `lap_index`

### `activity_records`

Purpose:
- store high-frequency time-series samples for an activity

Key fields:
- `id`
- `activity_id`
- `record_time`
- `elapsed_seconds`
- `distance_meters`
- `latitude_degrees`
- `longitude_degrees`
- `altitude_meters`
- `heart_rate`
- `cadence`
- `speed_mps`
- `power_watts`
- `temperature_celsius`

Important constraints and indexes:
- foreign key to `activities.id` with cascade delete
- index on `record_time`

### `daily_metrics`

Purpose:
- store lightweight daily health rollups for dashboard-style summaries

Key fields:
- `id`
- `metric_date`
- `resting_heart_rate`
- `body_battery`
- `stress_score`
- `steps`
- `floors_climbed`
- `calories_burned`
- `sleep_seconds`

Important constraints:
- unique `metric_date`

### `sleep_sessions`

Purpose:
- store normalized nightly sleep-session summaries

Key fields:
- `id`
- `source_sleep_id`
- `sleep_start`
- `sleep_end`
- `duration_seconds`
- `deep_sleep_seconds`
- `light_sleep_seconds`
- `rem_sleep_seconds`
- `awake_seconds`
- `sleep_score`

Important constraints:
- unique `source_sleep_id`

### `devices`

Purpose:
- store normalized device metadata for Garmin devices associated with activities

Key fields:
- `id`
- `source_device_id`
- `name`
- `manufacturer`
- `model`
- `serial_number`
- `first_seen_at`
- `last_synced_at`

Important constraints:
- unique `source_device_id`

### `sync_checkpoints`

Purpose:
- store ingestion and sync state for long-running Garmin fetch workflows

Key fields:
- `id`
- `sync_key`
- `last_synced_at`
- `last_source_id`
- `backfill_offset`
- `last_attempted_at`
- `last_succeeded_at`
- `last_run_status`
- `consecutive_failures`
- `last_error_summary`
- `updated_at`

Important constraints:
- unique `sync_key`

## Relationships

The original schema relationships are intentionally simple:

- one `activities` row can have many `activity_laps`
- one `activities` row can have many `activity_records`
- `activity_laps` and `activity_records` both cascade-delete with the parent activity
- `devices` is a standalone metadata table in the original schema and is not yet linked directly from `activities`
- `daily_metrics`, `sleep_sessions`, and `sync_checkpoints` are standalone tables in the MVP schema

## Original schema boundaries

The original MVP schema intentionally did not yet include:

- raw JSON snapshot storage for Garmin health endpoints
- specialized HRV tables
- training readiness tables
- Garmin score or endurance-score tables
- weight/body-composition history tables
- profile-style VO2 max or lactate-threshold snapshot tables

Those are all Version 2 additions proposed later in `docs/task_92_schema_design.md`.

## Summary

The original schema is centered on:

- activity summaries
- activity lap summaries
- activity record streams
- lightweight daily health rollups
- nightly sleep summaries
- device metadata
- sync checkpoint state

It is a compact MVP schema designed to support:

- Garmin activity sync
- FIT-file preservation and reprocessing
- dashboard and activity-detail APIs
- basic daily health summaries
- operational sync monitoring
