# Task 91 Research: Garmin Health And Physiology Retrieval

## Purpose

This note captures the current Garmin retrieval options for Version 2 health and physiology metrics, with a focus on what appears practical through the existing `garth`-based integration.

## Current library position

- the repo already depends on `garth>=0.6.3`
- the current `uv.lock` resolves to `garth 0.6.3`
- `garth 0.6.3` appears to be the latest published PyPI release in the current dependency set

Implication:
- Task 91 does not currently require a `garth` upgrade before research or prototyping
- the main work is validating which metrics are exposed reliably for this specific account and device mix

## Real-account validation snapshot

Local probing against the current Garmin account and saved `GARTH_HOME` session confirmed that the following sections returned usable payloads:

- `settings`
- `garmin_scores`
- `training_readiness`
- `weight`
- HRV and sleep probing support is available through the same probe command and should remain first-pass targets

Important confirmed fields from the real-account validation include:

- `settings.user_data.vo_2_max_running`
- Garmin training-readiness scores and factor breakdowns with per-snapshot timestamps
- Garmin score data support through `GarminScoresData`, including endurance-oriented metrics
- weight history entries with timestamps, `source_type`, and optional body-composition fields

Implication:

- training readiness is now a validated Version 2 candidate, not just an exploratory idea
- endurance-related metrics have moved from speculative to validated-on-this-account, though schema design should still respect device/account variability
- VO2 max is validated at least as current-value/profile data and may also appear through score-oriented metric payloads

## Candidate metric assessment

### HRV

Status:
- available and recommended

Why:
- `garth` documents both daily HRV summaries and detailed HRV readings
- this looks like a strong fit for the planned raw-snapshot-plus-normalized-ingestion model

Likely raw sources to preserve:
- daily HRV summary responses
- per-day detailed HRV responses

Notes:
- likely suitable for both trend views and drill-down detail
- needs validation against the real account to confirm history depth and any device-dependent gaps

### Richer sleep metrics

Status:
- available and recommended

Why:
- `garth` documents both daily sleep quality summaries and detailed sleep payloads
- the documented detailed payload includes sleep stages, timestamps, movement, respiration, SpO2, and stress-related fields

Likely raw sources to preserve:
- daily sleep summary responses
- detailed sleep responses by date

Notes:
- this looks like the strongest Version 2 health-data candidate after HRV
- some subfields appear device-capability-dependent and should remain optional in schema design

### VO2 max

Status:
- available and recommended

Why:
- `garth` examples show `vo_2_max_running` and `vo_2_max_cycling` in user settings/profile-style data
- real-account validation confirmed `settings.user_data.vo_2_max_running`
- score-oriented payloads also make it plausible that Garmin exposes richer derived VO2-related context than the profile value alone

Likely raw sources to preserve:
- user settings or profile responses that contain current VO2 max values
- Garmin score-oriented responses when they include VO2-related values
- any additional history endpoint found during further account-level validation

Notes:
- suitable for active Version 2 scope
- current-value versus historical-series handling should still be distinguished explicitly in schema design

### Lactate threshold

Status:
- available but risky or partial

Why:
- `garth` examples show lactate-threshold-related values in user settings/profile-style data
- as with VO2 max, the current documentation suggests current assessment data is available, but does not clearly prove a robust historical endpoint

Likely raw sources to preserve:
- user settings or profile responses containing threshold-related values and timestamps
- any additional assessment endpoint discovered during validation

Notes:
- likely better treated as a lower-frequency performance metric than a daily metric
- schema should model effective dates and optional availability

### Endurance-related metrics

Status:
- available and recommended

Why:
- the installed `garth 0.6.3` package includes `GarminScoresData`, which calls Garmin endurance-score and hill-score endpoints directly
- real-account validation confirmed that the `garmin_scores` probe returns usable payloads for this account
- availability may still vary across devices and accounts, but it is now clearly in-scope for this setup

Likely raw sources to preserve:
- Garmin endurance-score responses
- Garmin hill-score responses

Notes:
- still worth modeling with optional/device-aware handling and explicit effective dates or calendar dates

### Training readiness

Status:
- available and recommended

Why:
- the installed `garth 0.6.3` package includes `TrainingReadinessData`
- real-account validation confirmed rich per-snapshot payloads containing:
  - score and level
  - HRV factors
  - sleep and sleep-history factors
  - recovery-time factors
  - acute-load and stress-history factors
  - timestamped contexts such as `AFTER_WAKEUP_RESET` and `AFTER_POST_EXERCISE_RESET`

Likely raw sources to preserve:
- training readiness metric responses keyed by day

Notes:
- this is a strong candidate for a dedicated normalized table rather than squeezing it into `daily_metrics`
- multiple snapshots can occur on the same day, so schema design should preserve timestamped events rather than only calendar-date rollups

### Weight and body composition

Status:
- available and recommended

Why:
- the installed `garth 0.6.3` package includes `WeightData` with both day and range endpoints
- the model includes timestamped weight history plus optional body-composition fields such as BMI, body fat, body water, muscle mass, visceral fat, and metabolic age
- the current account settings payload already confirms a current weight value
- real-account validation confirmed a manual weight entry returning through the historical weight endpoint

Likely raw sources to preserve:
- weight dayview responses
- weight range responses with historical measurement entries

Notes:
- this is a stronger candidate than fitness age based on the current package surface
- manual entries may populate only a subset of fields, so body-composition columns should remain optional
- whether it belongs in the next Version 2 phase still depends on product priorities, not data availability alone

## Probe command

Use the local probe command to validate which payloads your current account/device mix actually exposes:

```bash
PYTHONPATH=backend ./.venv/bin/python -m app.probe_garmin_health --days 7
```

Useful narrower probes:

```bash
PYTHONPATH=backend ./.venv/bin/python -m app.probe_garmin_health --section hrv_detail --section sleep_detail --days 7
PYTHONPATH=backend ./.venv/bin/python -m app.probe_garmin_health --section settings --section garmin_scores --section training_readiness --days 7
PYTHONPATH=backend ./.venv/bin/python -m app.probe_garmin_health --section weight --days 30
```

The probe reuses the existing `GARTH_HOME` session and reports both successful payloads and per-section errors, which makes it suitable for Task 91 validation without changing the production setup.

## Recommended next steps

1. Treat HRV, richer sleep, training readiness, Garmin score data, and weight history as active Version 2 candidates.
2. Treat VO2 max as validated for current/profile use, while still separating current-value handling from true historical-series handling.
3. Treat lactate threshold as the main remaining partial candidate pending direct payload confirmation and history validation.
4. For Tasks 92 through 95, design around raw JSON preservation before normalized ingestion.
5. During validation, capture representative raw payloads for:
   - one recent HRV day
   - one recent detailed sleep day
   - one current settings/profile source
   - one Garmin scores day
   - one training readiness day
   - one recent weight-history range if present
   - one current lactate-threshold source if present

## Task handoff

Recommended label summary for follow-on tasks:

- HRV: available and recommended
- richer sleep metrics: available and recommended
- VO2 max: available and recommended
- lactate threshold: available but risky or partial
- endurance-related metrics: available and recommended
- training readiness: available and recommended
- weight and body composition: available and recommended
