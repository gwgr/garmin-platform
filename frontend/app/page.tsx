import Link from "next/link";

import {
  type ActivityListItem,
  type AnalyticsTrends,
  type DailyMetricItem,
  type SyncStatus,
  getActivities,
  getAnalyticsTrends,
  getDailyMetrics,
  getFrontendApiBaseUrl,
  getSyncStatus,
} from "../lib/api";
import { formatDateLabel, formatDistance, formatDuration } from "../lib/formatting";

export const dynamic = "force-dynamic";

const apiBaseUrl = getFrontendApiBaseUrl();

async function loadDashboardData(): Promise<{
  trends: AnalyticsTrends | null;
  recentActivities: ActivityListItem[];
  dailyMetrics: DailyMetricItem[];
  syncStatus: SyncStatus | null;
  loadError: string | null;
}> {
  try {
    const [trends, activitiesResponse, metricsResponse, syncStatus] = await Promise.all([
      getAnalyticsTrends(),
      getActivities({ page: 1, pageSize: 5 }),
      getDailyMetrics({ page: 1, pageSize: 5 }),
      getSyncStatus(),
    ]);

    return {
      trends,
      recentActivities: activitiesResponse.items,
      dailyMetrics: metricsResponse.items,
      syncStatus,
      loadError: null,
    };
  } catch (error) {
    return {
      trends: null,
      recentActivities: [],
      dailyMetrics: [],
      syncStatus: null,
      loadError: error instanceof Error ? error.message : "Unable to load dashboard data.",
    };
  }
}

export default async function HomePage() {
  const { trends, recentActivities, dailyMetrics, syncStatus, loadError } = await loadDashboardData();
  const currentWeek = trends?.current_week;
  const currentMonth = trends?.current_month;
  const recentCounts = trends?.recent_activity_counts;
  const restingHeartRate = trends?.resting_heart_rate_trend ?? [];

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Dashboard</p>
        <h1>Your Garmin data is now landing in a real dashboard.</h1>
        <p className="lede">
          This page is the first frontend that actually consumes the backend API.
          It focuses on the essentials for the MVP: current activity volume, recent
          sessions, and a light health snapshot when daily metrics exist.
        </p>

        <div className="hero-grid">
          <div className="panel accent-panel">
            <span className="panel-label">API Base URL</span>
            <code>{apiBaseUrl}</code>
            <p>
              Set <code>NEXT_PUBLIC_API_BASE_URL</code> in <code>.env</code> if you
              want the frontend to point somewhere else.
            </p>
          </div>

          <div className="panel">
            <span className="panel-label">Current Focus</span>
            <ul>
              <li>Use live backend analytics for the dashboard.</li>
              <li>Keep the UI readable before charts arrive.</li>
              <li>Set up the next activity list and detail pages.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <p className="eyebrow">Snapshot</p>
          <h2>Current training picture</h2>
        </div>

        <div className="stat-grid four-up">
          <article className="panel stat-card sync-status-card">
            <span className="panel-label">Sync Status</span>
            <p className="stat-value sync-status-value">
              <span className={`status-dot status-${syncStatus?.state ?? "warning"}`} />
              {syncStatus?.state ?? "warning"}
            </p>
            <p className="stat-subtle">
              {syncStatus?.summary ?? "Sync status is unavailable right now."}
            </p>
            <Link className="text-link" href="/status/sync">
              View sync details
            </Link>
          </article>

          <article className="panel stat-card">
            <span className="panel-label">This Week</span>
            <p className="stat-value">
              {currentWeek ? formatDistance(currentWeek.total_distance_meters) : "--"}
            </p>
            <p className="stat-subtle">
              {currentWeek ? `${currentWeek.activity_count} activities` : "Waiting for backend data"}
            </p>
          </article>

          <article className="panel stat-card">
            <span className="panel-label">This Month</span>
            <p className="stat-value">
              {currentMonth ? formatDistance(currentMonth.total_distance_meters) : "--"}
            </p>
            <p className="stat-subtle">
              {currentMonth
                ? formatDuration(currentMonth.total_duration_seconds)
                : "No duration data yet"}
            </p>
          </article>

          <article className="panel stat-card">
            <span className="panel-label">Recent Activity Count</span>
            <p className="stat-value">
              {recentCounts ? recentCounts.last_30_days : "--"}
            </p>
            <p className="stat-subtle">Last 30 days</p>
          </article>
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
              No recent activities are available yet. Once sync runs populate the
              database, they will show up here.
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
              Daily health metrics have not been ingested yet, so this section will
              stay intentionally light for now.
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="panel">
          <span className="panel-label">Build Notes</span>
          {loadError ? (
            <p className="warning">
              The frontend loaded, but backend data could not be fetched: {loadError}
            </p>
          ) : (
            <p>
              The dashboard is now using the shared frontend API client and live
              backend endpoints. Charts, richer comparisons, and maps are the next
              layer on top of this foundation.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
