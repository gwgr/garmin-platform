import Link from "next/link";

import {
  type ActivityListItem,
  type AnalyticsTrends,
  type DailyMetricItem,
  type SyncStatus,
  getActivities,
  getAnalyticsTrends,
  getDailyMetrics,
  getSyncStatus,
} from "../lib/api";
import { formatDateLabel, formatDistance, formatDuration } from "../lib/formatting";

export const dynamic = "force-dynamic";

type SportSummary = {
  sport: string;
  count: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
};

type WindowSummary = {
  label: string;
  activities: ActivityListItem[];
  sportSummaries: SportSummary[];
};

function formatSportLabel(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildSportSummaries(activities: ActivityListItem[]): SportSummary[] {
  const sportMap = new Map<string, SportSummary>();

  for (const activity of activities) {
    const sport = activity.sport?.trim() || "unknown";
    const current = sportMap.get(sport) ?? {
      sport,
      count: 0,
      totalDistanceMeters: 0,
      totalDurationSeconds: 0,
    };

    current.count += 1;
    current.totalDistanceMeters += activity.distance_meters ?? 0;
    current.totalDurationSeconds += activity.duration_seconds ?? 0;
    sportMap.set(sport, current);
  }

  return Array.from(sportMap.values()).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return right.totalDistanceMeters - left.totalDistanceMeters;
  });
}

function isWithinDays(startTime: string, days: number, now: Date): boolean {
  const activityDate = new Date(startTime);
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  windowStart.setDate(windowStart.getDate() - days + 1);
  return activityDate >= windowStart;
}

function isWithinCurrentMonth(startTime: string, now: Date): boolean {
  const activityDate = new Date(startTime);
  return (
    activityDate.getFullYear() === now.getFullYear() &&
    activityDate.getMonth() === now.getMonth()
  );
}

function buildWindowSummaries(activities: ActivityListItem[]): WindowSummary[] {
  const now = new Date();

  const windows: Array<{ label: string; predicate: (activity: ActivityListItem) => boolean }> = [
    {
      label: "This week",
      predicate: (activity) => isWithinDays(activity.start_time, 7, now),
    },
    {
      label: "This month",
      predicate: (activity) => isWithinCurrentMonth(activity.start_time, now),
    },
    {
      label: "Last 6 months",
      predicate: (activity) => isWithinDays(activity.start_time, 183, now),
    },
    {
      label: "Last 12 months",
      predicate: (activity) => isWithinDays(activity.start_time, 366, now),
    },
  ];

  return windows.map(({ label, predicate }) => {
    const windowActivities = activities.filter(predicate);

    return {
      label,
      activities: windowActivities,
      sportSummaries: buildSportSummaries(windowActivities).slice(0, 4),
    };
  });
}

async function loadDashboardData(): Promise<{
  trends: AnalyticsTrends | null;
  allActivities: ActivityListItem[];
  recentActivities: ActivityListItem[];
  recentActivityTotal: number;
  dailyMetrics: DailyMetricItem[];
  syncStatus: SyncStatus | null;
  loadError: string | null;
}> {
  try {
    const [trends, activitiesResponse, metricsResponse, syncStatus] = await Promise.all([
      getAnalyticsTrends(),
      getActivities({ page: 1, pageSize: 100 }),
      getDailyMetrics({ page: 1, pageSize: 5 }),
      getSyncStatus(),
    ]);

    return {
      trends,
      allActivities: activitiesResponse.items,
      recentActivities: activitiesResponse.items.slice(0, 5),
      recentActivityTotal: activitiesResponse.total,
      dailyMetrics: metricsResponse.items,
      syncStatus,
      loadError: null,
    };
  } catch (error) {
    return {
      trends: null,
      allActivities: [],
      recentActivities: [],
      recentActivityTotal: 0,
      dailyMetrics: [],
      syncStatus: null,
      loadError: error instanceof Error ? error.message : "Unable to load dashboard data.",
    };
  }
}

export default async function HomePage() {
  const {
    trends,
    allActivities,
    recentActivities,
    recentActivityTotal,
    dailyMetrics,
    syncStatus,
    loadError,
  } = await loadDashboardData();
  const restingHeartRate = trends?.resting_heart_rate_trend ?? [];
  const windowSummaries = buildWindowSummaries(allActivities);

  return (
    <main className="shell">
      <section className="section">
        <div className="section-header">
          <h2>Training Overview</h2>
        </div>
      </section>

      <section className="section">
        <div className="stat-grid four-up">
          {windowSummaries.map((windowSummary) => (
            <article className="panel stat-card" key={windowSummary.label}>
              <span className="panel-label">{windowSummary.label}</span>
              {windowSummary.sportSummaries.length > 0 ? (
                <div className="list-stack">
                  {windowSummary.sportSummaries.map((summary) => (
                    <div className="list-row" key={`${windowSummary.label}-${summary.sport}`}>
                      <div>
                        <p className="list-title">{formatSportLabel(summary.sport)}</p>
                      </div>
                      <div className="list-values">
                        <strong>
                          {summary.totalDistanceMeters > 0
                            ? formatDistance(summary.totalDistanceMeters)
                            : `${summary.count}`}
                        </strong>
                        <span>{formatDuration(summary.totalDurationSeconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No activities in this window yet.</p>
              )}
              <p className="stat-subtle">
                {windowSummary.activities.length.toLocaleString()} total{" "}
                {windowSummary.activities.length === 1 ? "activity" : "activities"}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Recent Activities and Health Snapshot</h2>
        </div>
      </section>

      <section className="section split">
        <div className="panel">
          <span className="panel-label">Recent Activities</span>
          {recentActivities.length > 0 ? (
            <div className="list-stack">
              {recentActivities.map((activity) => (
                <article className="list-row" key={activity.id}>
                  <div>
                    <p className="list-title">
                      <Link className="card-link" href={`/activities/${activity.id}`}>
                        {activity.name ?? "Imported activity"}
                      </Link>
                    </p>
                    <p className="list-meta">
                      {activity.sport} · {formatDateLabel(activity.start_time)}
                    </p>
                  </div>
                  <div className="list-values">
                    <strong>
                      {activity.distance_meters
                        ? formatDistance(activity.distance_meters)
                        : "--"}
                    </strong>
                    <span>
                      {activity.duration_seconds
                        ? formatDuration(activity.duration_seconds)
                        : "--"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              Recent sessions will appear here as activities are imported.
            </p>
          )}
        </div>

        <div className="panel">
          <span className="panel-label">Health Snapshot</span>
          {restingHeartRate.length > 0 || dailyMetrics.length > 0 ? (
            <div className="list-stack">
              {restingHeartRate.length > 0 ? (
                <article className="health-callout">
                  <p className="list-title">Resting HR Trend</p>
                  <p className="list-meta">
                    Latest: {restingHeartRate[restingHeartRate.length - 1]?.resting_heart_rate} bpm
                  </p>
                </article>
              ) : null}

              {dailyMetrics.slice(0, 3).map((metric) => (
                <article className="list-row" key={metric.id}>
                  <div>
                    <p className="list-title">{formatDateLabel(metric.metric_date)}</p>
                    <p className="list-meta">
                      {metric.steps ? `${metric.steps.toLocaleString()} steps` : "No step data"}
                    </p>
                  </div>
                  <div className="list-values">
                    <strong>
                      {metric.resting_heart_rate ? `${metric.resting_heart_rate} bpm` : "--"}
                    </strong>
                    <span>
                      {metric.sleep_seconds
                        ? formatDuration(metric.sleep_seconds)
                        : "No sleep"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              Daily health metrics will appear here as they are imported.
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="panel compact-panel">
          <span className="panel-label">Sync Status</span>
          <p className="compact-status-line">
            <span className={`status-dot status-${syncStatus?.state ?? "warning"}`} />{" "}
            {syncStatus?.summary ?? "Sync status is unavailable right now."}
          </p>
          <Link className="text-link compact-status-link" href="/status/sync">
            View sync details
          </Link>
        </div>
      </section>

      {loadError ? (
        <section className="section">
          <div className="panel">
            <span className="panel-label">Data Availability</span>
            <p className="warning">
              Dashboard data could not be loaded right now: {loadError}
            </p>
          </div>
        </section>
      ) : null}
    </main>
  );
}
