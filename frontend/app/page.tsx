import Link from "next/link";

import { LocalDate } from "../components/localized-time";
import {
  type ActivityListItem,
  type AnalyticsTrends,
  type DailyMetricItem,
  type SportRollupSummary,
  type TrendWindowSummary,
  type SyncStatus,
  getActivities,
  getAnalyticsTrends,
  getDailyMetrics,
  getSyncStatus,
} from "../lib/api";
import { formatDistance, formatDuration } from "../lib/formatting";

export const dynamic = "force-dynamic";

type WindowSummary = {
  label: string;
  activityCount: number;
  sportSummaries: SportRollupSummary[];
};

function formatSportLabel(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildWindowSummaries(trends: AnalyticsTrends | null): WindowSummary[] {
  if (!trends) {
    return [
      { label: "This week", activityCount: 0, sportSummaries: [] },
      { label: "This month", activityCount: 0, sportSummaries: [] },
      { label: "Last 6 months", activityCount: 0, sportSummaries: [] },
      { label: "Last 12 months", activityCount: 0, sportSummaries: [] },
    ];
  }

  const windows: TrendWindowSummary[] = [
    trends.current_week,
    trends.current_month,
    trends.last_6_months,
    trends.last_1_year,
  ];

  return windows.map((window) => ({
    label: window.label
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
      .replace("Current Week", "This week")
      .replace("Current Month", "This month")
      .replace("Last 6 Months", "Last 6 months")
      .replace("Last 1 Year", "Last 12 months"),
    activityCount: window.activity_count,
    sportSummaries: window.sport_rollups.slice(0, 4),
  }));
}

async function loadDashboardData(): Promise<{
  trends: AnalyticsTrends | null;
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
      recentActivities: activitiesResponse.items.slice(0, 5),
      recentActivityTotal: activitiesResponse.total,
      dailyMetrics: metricsResponse.items,
      syncStatus,
      loadError: null,
    };
  } catch (error) {
    return {
      trends: null,
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
    recentActivities,
    recentActivityTotal,
    dailyMetrics,
    syncStatus,
    loadError,
  } = await loadDashboardData();
  const restingHeartRate = trends?.resting_heart_rate_trend ?? [];
  const windowSummaries = buildWindowSummaries(trends);

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
                          {summary.total_distance_meters > 0
                            ? formatDistance(summary.total_distance_meters)
                            : `${summary.activity_count}`}
                        </strong>
                        <span>{formatDuration(summary.total_duration_seconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No activities in this window yet.</p>
              )}
              <p className="stat-subtle">
                {windowSummary.activityCount.toLocaleString()} total{" "}
                {windowSummary.activityCount === 1 ? "activity" : "activities"}
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
                      {activity.sport} · <LocalDate value={activity.start_time} />
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
                    <p className="list-title">
                      <LocalDate value={metric.metric_date} />
                    </p>
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
