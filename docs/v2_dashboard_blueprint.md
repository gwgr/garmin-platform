# Version 2 Dashboard Blueprint

## Purpose

Translate the dashboard research into a Garmin-specific target experience for Garmin Platform.

This blueprint defines:
- what the home dashboard should optimize for
- which modules belong in the default experience
- which details should be secondary or tertiary
- what should explicitly stay out of scope for now

## Product position

Garmin Platform should become:

"A private, local-first training dashboard that helps a single user understand daily status, recent training load, and long-term trend direction, while preserving trustworthy drill-down into the underlying activity data."

This is not:
- a Garmin Connect clone
- a WHOOP-style lifestyle logging product
- a generic database viewer with charts

## Core user questions

### Daily

- what does today look like?
- am I trending toward push, maintain, or recover?
- is my data current enough to trust the answer?

### Weekly

- how much have I trained recently?
- what is the mix across sports?
- is current load increasing, stable, or backing off?

### Long-term

- what has changed over the last 6-12 months?
- are the training and health trends moving in the right direction?
- what patterns deserve a deeper look?

## Home dashboard hierarchy

The home dashboard should move from the current "summary cards plus lists" model toward a clearer three-layer structure.

### Layer 1: Daily Overview

This should be the first thing visible above the fold.

Primary goals:
- orient the user quickly
- answer the daily decision question
- avoid turning into a wall of unrelated metrics

Recommended modules:
- readiness / daily status summary
  - if recovery-style scoring is not trustworthy yet, use a simpler interpretation layer such as:
    - recent sleep signal
    - recent resting-HR signal
    - recent training load signal
    - sync freshness
- short guidance line
  - example tone:
    - "Recent training load is elevated while sleep/recovery signals are mixed."
    - "Training load has been light and recent signals look stable."
- sync/data freshness indicator
  - must remain visible, but should feel like trust infrastructure rather than the main story

### Layer 2: Training Trend

This should be the second major block and is likely Garmin Platform's strongest near-term advantage.

Recommended modules:
- recent training windows
  - week
  - month
  - 6 months
  - 12 months
- per-sport mix inside those windows
- trend/comparison treatment
  - this week vs recent average
  - this month vs prior month or rolling baseline
- consistency/load signal
  - not necessarily an opaque score
  - could be framed as:
    - building
    - maintaining
    - backing off

### Layer 3: Health Trend

This should exist, but should not pretend to be more complete than the current data supports.

Near-term modules:
- resting heart rate trend
- sleep duration trend once reliable
- lightweight daily metric snapshot

Future modules once real data exists:
- HRV trend
- VO2 max history
- richer sleep/recovery views

### Layer 4: Recent Sessions

This should remain accessible, but should support the summary rather than dominate the page.

Recommended role:
- quick entry into recent activity detail
- a small list, not the primary visual anchor of the dashboard

## Activity list blueprint

The activity list should feel like a browsable training log, not an admin table.

Default priorities:
- clear date/time
- sport
- distance
- duration
- activity name

Secondary:
- calories
- device/weather only if later proven useful

Design direction:
- easier scanning across sessions
- stronger sport distinction
- less visual weight on controls than on results

## Activity detail blueprint

The activity detail page should become more clearly layered.

### Level 1: Session Summary

Must answer:
- what was this session?
- how long and how far?
- what matters most at a glance?

Near-term summary modules:
- sport, date/time
- distance
- duration
- calories
- a concise interpretation area later if/when we support it

### Level 2: Supporting visual analysis

Recommended modules:
- route
- pace
- heart rate
- elevation
- lap breakdown

These are important, but should remain subordinate to the top summary.

### Level 3: Technical/raw detail

Keep, but demote:
- source ID
- stored FIT path
- raw record samples

This layer is valuable for trust and debugging, but should not compete with the main story of the session.

## Information that should be default vs secondary

### Default on the dashboard

- daily status / interpretation
- recent training windows
- per-sport mix
- long-window trend direction
- key health trend(s) that are actually trustworthy
- sync/data freshness confidence

### Secondary on the dashboard

- long recent-activity list
- raw daily metric tables
- detailed sync metadata

### Default on activity detail

- summary
- route and primary charts
- lap overview

### Secondary on activity detail

- technical metadata
- record table
- raw storage provenance

## What to explicitly leave out for now

- heavy manual lifestyle logging
- behavior journaling as a required daily workflow
- opaque readiness/recovery scores that imply more precision than the current data supports
- social/community mechanics
- highly granular health surfaces that look impressive but are not yet backed by live, reliable ingestion

## Design principles for implementation

- summary before detail
- interpretation before raw metric density
- calm hierarchy over card sprawl
- trend and baseline over isolated absolute values
- trust and transparency over pseudo-scientific confidence
- polish should support clarity, not obscure it

## Recommended implementation sequence

### Step 1: make the target testable

- deterministic fixture dataset
- screenshot coverage

### Step 2: build the visual system

- sport icons
- shared shell/layout
- typography/spacing system
- loading/empty/error patterns

### Step 3: do framework/system refactors only once the target is clear

- Tailwind adoption
- `shadcn/ui` primitives where genuinely useful

### Step 4: deepen the product once the shell is strong

- stronger trend modules
- clearer daily-status interpretation
- health-data expansion once real ingestion supports it

## Task mapping

### Immediate next tasks

- Task 78: fixture dataset
- Task 79: screenshot coverage
- Task 80: sport icons
- Task 83: shared shell/layout
- Task 84: typography/spacing
- Task 85: loading/empty/error states

### Follow-on tasks once the shell is stronger

- Task 77: richer analytics/dashboard views
- Tasks 89-93: additional health-data research, schema, and ingestion

### Lower-priority supporting tasks

- Task 86: device identification
- Task 87: weather enrichment
- Task 88: private HTTPS access

## Working recommendation

Treat this blueprint as the product target for the next dashboard iteration cycle.

That means:
- do not jump straight to "more cards"
- do not jump straight to framework churn
- first create the stable dataset and screenshot baseline
- then shape the dashboard around daily overview, training trend, and trustworthy supporting health signals
