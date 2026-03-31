# Task 92 Schema Design: Version 2 Health And Physiology Data

## Purpose

This note defines the proposed normalized schema additions for the validated Version 2 Garmin health and physiology data identified in Task 91.

The design goals are:

- keep `daily_metrics` lightweight and useful for coarse dashboard rollups
- preserve a clear boundary between day-level summaries and timestamped event/snapshot data
- support raw JSON linkage for future reprocessing without forcing raw payload shape into normalized tables
- keep device- and account-dependent fields optional

## Existing tables to keep

### `daily_metrics`

Keep `daily_metrics` focused on simple dashboard-friendly daily rollups such as:

- resting heart rate
- body battery
- stress score
- steps
- floors climbed
- calories burned
- sleep seconds

Do not turn `daily_metrics` into a dumping ground for every Garmin health field. It should remain the thin daily-summary layer that the dashboard can query cheaply.

### `sleep_sessions`

Keep `sleep_sessions` as the canonical nightly sleep-session table, but extend it to hold richer summary-level sleep fields that already map naturally to one sleep session.

Good candidates for extension:

- `calendar_date`
- `nap_seconds`
- `awake_count`
- `unmeasurable_sleep_seconds`
- `average_spo2`
- `lowest_spo2`
- `highest_spo2`
- `average_respiration`
- `lowest_respiration`
- `highest_respiration`
- `average_sleep_stress`
- `sleep_result_type`
- `sleep_quality_type`
- `sleep_window_confirmed`
- `sleep_window_confirmation_type`
- `source_device_rem_capable`
- `raw_snapshot_id`

Rationale:

- the current Garmin sleep payload is still fundamentally one nightly session with richer summary attributes
- these additions preserve the existing table’s purpose without creating needless fragmentation

Optional later extension:

- add a separate `sleep_movements` table only if the movement timeline becomes product-relevant

## New proposed tables

### `hrv_daily_summaries`

Purpose:
- store the canonical day-level HRV summary record

Proposed columns:
- `id`
- `calendar_date` unique
- `weekly_avg`
- `last_night_avg`
- `last_night_5_min_high`
- `status`
- `feedback_phrase`
- `baseline_low_upper`
- `baseline_balanced_low`
- `baseline_balanced_upper`
- `baseline_marker_value`
- `summary_created_at`
- `raw_snapshot_id`
- `created_at`
- `updated_at`

Rationale:
- HRV daily summary data is calendar-date oriented and distinct from the detailed reading stream

### `hrv_readings`

Purpose:
- store detailed HRV readings linked to a day

Proposed columns:
- `id`
- `calendar_date`
- `reading_time_gmt`
- `reading_time_local`
- `hrv_value`
- `raw_snapshot_id`

Recommended uniqueness:
- unique on `reading_time_gmt`

Rationale:
- detailed HRV readings are timestamped events, not day-level rollups
- keeping them separate avoids overloading the summary table

### `garmin_score_daily`

Purpose:
- store daily Garmin score outputs such as endurance and hill scores

Proposed columns:
- `id`
- `calendar_date` unique
- `endurance_score`
- `endurance_classification`
- `endurance_classification_lower_limit_elite`
- `endurance_classification_lower_limit_superior`
- `endurance_classification_lower_limit_expert`
- `endurance_classification_lower_limit_well_trained`
- `endurance_classification_lower_limit_trained`
- `endurance_classification_lower_limit_intermediate`
- `hill_score`
- `hill_endurance_score`
- `hill_strength_score`
- `vo2_max`
- `vo2_max_precise_value`
- `raw_snapshot_id`
- `created_at`
- `updated_at`

Rationale:
- this data is daily and score-oriented
- it does not belong in `daily_metrics`, but it also does not need a high-frequency event table

### `training_readiness_snapshots`

Purpose:
- store timestamped training-readiness events and factor breakdowns

Proposed columns:
- `id`
- `calendar_date`
- `captured_at`
- `captured_at_local`
- `device_id` nullable FK to `devices.id`
- `input_context`
- `level`
- `score`
- `feedback_short`
- `feedback_long`
- `valid_sleep`
- `sleep_score`
- `sleep_score_factor_percent`
- `sleep_score_factor_feedback`
- `sleep_history_factor_percent`
- `sleep_history_factor_feedback`
- `hrv_weekly_average`
- `hrv_factor_percent`
- `hrv_factor_feedback`
- `recovery_time_hours`
- `recovery_time_factor_percent`
- `recovery_time_factor_feedback`
- `recovery_time_change_phrase`
- `acute_load`
- `acwr_factor_percent`
- `acwr_factor_feedback`
- `stress_history_factor_percent`
- `stress_history_factor_feedback`
- `primary_activity_tracker`
- `raw_snapshot_id`
- `created_at`

Recommended uniqueness:
- unique on `captured_at`, `input_context`, and `device_id`

Rationale:
- real-account probing confirmed multiple readiness snapshots can appear on the same day
- this must be modeled as event/snapshot data, not as a single daily row

### `weight_measurements`

Purpose:
- store timestamped weight history and optional body-composition measurements

Proposed columns:
- `id`
- `source_sample_id` unique
- `calendar_date`
- `measured_at`
- `measured_at_local`
- `source_type`
- `weight_grams`
- `weight_delta_grams`
- `bmi`
- `body_fat_percent`
- `body_water_percent`
- `bone_mass_grams`
- `muscle_mass_grams`
- `physique_rating`
- `visceral_fat`
- `metabolic_age`
- `raw_snapshot_id`
- `created_at`

Rationale:
- weight is clearly a timestamped history stream
- body-composition fields should remain optional because manual entries may only include weight

### `performance_profile_snapshots`

Purpose:
- store current/profile-style physiology values whose historical endpoint support is uncertain

Proposed columns:
- `id`
- `captured_at`
- `vo2_max_running`
- `vo2_max_cycling`
- `lactate_threshold_speed`
- `lactate_threshold_heart_rate`
- `firstbeat_running_lt_timestamp`
- `firstbeat_cycling_lt_timestamp`
- `raw_snapshot_id`

Rationale:
- VO2 max is validated for current/profile use
- lactate threshold appears accessible but still looks more like current assessment data than a proven historical stream
- storing snapshots over time gives us durable history without pretending Garmin already provides a canonical time series

## Raw snapshot linkage

Task 93 should introduce the raw snapshot store, but Task 92 should design for it now.

Each new normalized table should support nullable linkage to a future raw snapshot record:

- `raw_snapshot_id`

The normalized tables should not duplicate every raw field. They only need the curated fields required for product use, analytics, and stable downstream APIs.

## Canonical versus optional fields

Canonical fields are the ones the product is most likely to rely on:

- HRV summary values and statuses
- nightly sleep totals and score
- training readiness score and major factors
- Garmin endurance/hill scores
- weight and timestamp
- current/profile VO2 max values

Optional Garmin-specific extras should remain nullable and treated as enrichment:

- sleep respiration and SpO2 fields
- body-composition measurements
- less-stable Garmin explanation strings
- classification lower-bound fields
- device-specific or account-specific extras

## Recommended implementation sequence

1. Extend `sleep_sessions` for richer nightly summary fields.
2. Add `hrv_daily_summaries` and `hrv_readings`.
3. Add `garmin_score_daily`.
4. Add `training_readiness_snapshots`.
5. Add `weight_measurements`.
6. Add `performance_profile_snapshots`.
7. Add raw snapshot storage in Task 93 and thread `raw_snapshot_id` through the new ingestion flows.

## Summary

Recommended table strategy:

- keep: `daily_metrics`
- extend: `sleep_sessions`
- add: `hrv_daily_summaries`
- add: `hrv_readings`
- add: `garmin_score_daily`
- add: `training_readiness_snapshots`
- add: `weight_measurements`
- add: `performance_profile_snapshots`

This keeps the schema aligned with the observed Garmin payload shapes and avoids forcing fundamentally different data types into the same table.
