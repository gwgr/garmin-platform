# Version 2 Dashboard Research

## Purpose

Define what "best in class" should mean for Garmin Platform before deeper frontend and analytics work.

This note focuses on products that are strong at turning health/training data into a daily-use experience, not just products that look polished.

## Reference products reviewed

- WHOOP
- Oura
- Strava
- Garmin Connect

## What the strongest products do well

### 1. They answer a daily decision question

The best products do not begin with "here is your data."
They begin with "what should you do today?"

Patterns seen:
- WHOOP centers recovery, strain, and guidance
- Oura centers readiness, sleep, and activity balance
- Strava centers training load, fitness trend, and progress

Implication for Garmin Platform:
- the home dashboard should answer a small set of high-value questions first
- example questions:
  - how ready am I today?
  - how much have I trained recently?
  - am I building, maintaining, or overreaching?
  - what changed compared with my baseline?

### 2. They translate metrics into a small opinionated model

The best experiences reduce many raw metrics into a few stable concepts:
- readiness / recovery
- load / strain
- sleep quality / sleep need
- trend and baseline deviation

They still allow drill-down, but the top layer is synthesized rather than raw.

Implication for Garmin Platform:
- Version 2 should avoid a dashboard that is only cards of independent numbers
- the dashboard should evolve toward a small number of opinionated summary models built from Garmin data

### 3. They emphasize baseline and change, not only absolute values

WHOOP and Oura both make heavy use of personal baseline thinking.
Strava does this more through trend and load direction over time.

Implication for Garmin Platform:
- "today vs your usual"
- "this week vs recent average"
- "sleep/recovery/load trend"
should be first-class patterns

### 4. They connect behaviors to outcomes

WHOOP's Journal is especially strong here:
- behaviors are logged
- outcomes are tracked
- the app closes the loop by showing which habits correlate with better recovery

Implication for Garmin Platform:
- even if behavior logging is not immediate Version 2 scope, the product target should leave room for "what seems to help or hurt me?"
- this is a meaningful differentiator versus a dashboard that only stores activity files

### 5. They use progressive disclosure

Best-in-class products tend to have:
- a high-signal summary layer
- a focused drill-down layer
- then detailed raw data if the user wants it

Implication for Garmin Platform:
- the current route, laps, records, and metadata views are useful, but they are too close to the top level
- Version 2 should move toward:
  - summary first
  - supporting explanation second
  - raw details third

## What not to copy blindly

### WHOOP

Do not copy:
- heavy lifestyle-coaching tone without enough supporting data
- closed-score systems that appear authoritative without transparent inputs

Worth borrowing:
- daily guidance framing
- relationship between recovery and training target
- behavior-to-outcome loop

### Oura

Do not copy:
- sleep/recovery-first framing as the only lens

Worth borrowing:
- clarity of readiness presentation
- strong baseline/trend thinking
- calm, high-signal hierarchy

### Strava

Do not copy:
- overly social framing
- segment/community emphasis that does not fit this product

Worth borrowing:
- training load and long-window trend views
- clear progress/history framing
- sport-specific training context

### Garmin Connect

Do not copy:
- broad but scattered information architecture
- dense data surfaces without enough prioritization

Worth borrowing:
- breadth of source data
- useful health/training categories

## Recommended Garmin Platform target

Garmin Platform should aim to be:

"A private, local-first training and recovery dashboard that turns Garmin data into clear daily guidance, interpretable long-term trends, and trustworthy drill-down detail."

That target is closer to:
- WHOOP in guidance and daily framing
- Oura in clarity and baseline-driven interpretation
- Strava in training trend analysis

It should be less like:
- a raw Garmin mirror
- a database viewer with charts
- a generic BI dashboard for workouts

## Pressure test against actual Garmin Platform data

The target above needs to be constrained by what the product can actually support today and in the near-term roadmap.

### What we have strongly today

- detailed activity data
  - start time
  - sport
  - duration
  - distance
  - calories
  - laps
  - record streams
  - route coordinates
- long-window activity history
- sync-health and data-freshness visibility

### What we have partially or structurally, but not yet as a finished product capability

- early daily-health groundwork exists in the schema/API surface, but it is not yet a mature implemented product area for Version 2
- sleep-session storage exists in the schema for richer sleep detail
- the roadmap already anticipates broader health/physiology expansion, but those signals should not be treated as a current strength until the ingestion and UX are real

### What we do not currently have strongly enough

- a trustworthy recovery/readiness model
- a mature daily-health experience built around reliable live ingestion and interpretation
- HRV in the current live ingestion path
- VO2 max or lactate-threshold trends in the current live ingestion path
- reliable behavior/context logging such as alcohol, meals, screens, supplements, or other manual journal inputs
- evidence-backed causal language about why recovery is up or down

### What this means

Garmin Platform can credibly compete first on:
- training trend clarity
- private/local-first data ownership
- clean daily overview of training plus health signals
- trustworthy drill-down into activities and historical patterns

It should not yet try to compete through:
- heavy behavior journaling
- pseudo-precise recovery coaching without enough supporting data
- opaque proprietary scoring systems that the product cannot justify

## Explicit non-goals for this target

To keep the target honest, the following should not be part of the immediate "best in class" standard for Garmin Platform:

- WHOOP-style heavy lifestyle logging as a core product mechanic
- mandatory daily journal workflows
- recovery or readiness scores that are presented as authoritative before the underlying inputs are strong enough
- social/community mechanics as a primary dashboard driver

This does not mean those ideas are impossible later.
It means they should not shape the near-term dashboard target.

## Primary user jobs

### Daily

- know whether today looks like a push, maintain, or recover day
- see whether sleep/recovery/body signals are supportive or concerning
- understand whether sync/data freshness is trustworthy

### Weekly

- understand training mix and volume
- see whether load is building sensibly
- compare current week against recent normal

### Long-term

- understand trend direction across months
- relate health signals to training quality and consistency
- review meaningful changes in baseline, not just isolated high/low values

## Recommended Version 2 dashboard structure

### 1. Daily Overview

Top of dashboard should prioritize:
- recovery/readiness summary
- recent sleep summary
- current training load / recent strain summary
- one-line guidance or interpretation

### 2. Training Trend Section

Should show:
- week / month / 6-month / 12-month summaries
- per-sport mix
- load direction
- consistency and recent trend movement

### 3. Health Trend Section

Should show:
- resting heart rate trend
- HRV if available
- sleep duration / sleep quality trend
- other high-value physiology data when reliable

### 4. Activity Detail

Should evolve toward:
- summary and interpretation first
- route/charts/laps second
- raw records and file metadata last

### 5. Behavior / context layer

Future-oriented but worth planning for:
- tags, notes, or behavior logging
- ability to relate behaviors to recovery/sleep/performance trends

## Implications for the roadmap

### Highest-value near-term work

- define the Garmin-specific dashboard blueprint
- create stable fixture data for design iteration
- add screenshot coverage for layout comparisons
- improve shared layout, typography, and state handling

### Likely data priorities after the blueprint

The following Version 2 data areas are likely important if the target standard above holds:
- HRV
- richer sleep summaries
- VO2 max and readiness-adjacent signals if available and trustworthy
- performance/load views that connect activities across time

These may be higher priority than:
- weather enrichment
- device display

unless the blueprint shows otherwise.

## Prioritized gap list

### Tier 1: define and stabilize the target experience

- define the Garmin-specific dashboard blueprint
- create deterministic fixture data for design iteration
- add screenshot coverage for layout regression checks
- establish shared layout, typography, and UI-state patterns

Related tasks:
- Task 76B
- Tasks 78-85

### Tier 2: strengthen the current dashboard’s interpretation layer

- expand long-window and multi-sport trend views
- improve how training load and historical comparison are shown
- make activity detail pages feel clearly subordinate to the top-level summary model

Related tasks:
- Task 76
- Task 77A already completed
- Task 94

### Tier 3: add the health/recovery data needed for a stronger daily view

- research which Garmin health signals are both available and reliable
- design the schema and raw snapshot strategy for those signals
- ingest HRV, richer sleep, VO2 max, and related performance signals only once the data path is trustworthy

Related tasks:
- Tasks 89-93

### Tier 4: add secondary enrichment

- device identification
- weather
- HTTPS hardening and broader private-access polish

Related tasks:
- Tasks 86-88

## Working recommendation

Use the next task to turn this into a Garmin-specific product blueprint.

That blueprint should define:
- the exact home-dashboard hierarchy
- the few core summary models to emphasize
- which metrics belong in default view
- which metrics belong in secondary drill-down views

Working recommendation after this pressure test:
- complete Task 76B next
- then move through fixture data, screenshots, and frontend-system tasks before committing to deeper health-data ingestion priorities

## Sources

- WHOOP: How WHOOP works  
  https://www.whoop.com/us/en/how-it-works
- WHOOP: How WHOOP Strain Target Works  
  https://www.whoop.com/us/en/thelocker/strain-coach/
- WHOOP: The WHOOP Journal  
  https://www.whoop.com/eu/en/thelocker/the-whoop-journal/
- Oura: Readiness Score  
  https://support.ouraring.com/hc/en-us/articles/360025589793-An-Introduction-to-Your-Readiness-Score
- Oura: Using Trends  
  https://support.ouraring.com/hc/en-us/articles/360055983614-How-to-Use-Trends
- Strava: Fitness & Freshness  
  https://support.strava.com/hc/en-us/articles/216918477-Fitness-Freshness
- Strava: Subscription Features  
  https://support.strava.com/hc/en-us/articles/216917657-Strava-Subscription-Features
- Garmin Connect: Health Status  
  https://support.garmin.com/en-US/?faq=hCW4HgpoXc06XQol8EiYC6
