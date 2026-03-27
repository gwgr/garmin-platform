import Link from "next/link";

import { PageShell } from "../components/page-shell";
import { LocalDate } from "../components/localized-time";
import { SportLabel } from "../components/sport";
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
import {
  emptyStateClass,
  fourUpGridClass,
  listMetaClass,
  listRowClass,
  listStackClass,
  listTitleClass,
  listValuesClass,
  panelContentClass,
  panelLabelClass,
  sectionClass,
  sectionHeaderClass,
  sectionTitleClass,
  statusDotClass,
  subtleClass,
  warningClass,
} from "../lib/ui";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

export const dynamic = "force-dynamic";

type WindowSummary = {
  label: string;
  activityCount: number;
  sportSummaries: SportRollupSummary[];
};

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

function syncStateColor(state: string | undefined): string {
  switch (state) {
    case "healthy":
      return "bg-[#2d8a57]";
    case "error":
      return "bg-[#be3e2d]";
    default:
      return "bg-[#d28c1b]";
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
    <PageShell
      description="Rolling training windows, recent sessions, and lightweight health signals from the current sync."
      eyebrow="Dashboard"
      title="Training Overview"
    >
      <section className={sectionClass}>
        <div className={fourUpGridClass}>
          {windowSummaries.map((windowSummary) => (
            <Card className="flex min-h-[20rem] flex-col justify-between xl:min-h-[22rem]" key={windowSummary.label}>
              <CardContent className={`flex h-full flex-col justify-between ${panelContentClass}`}>
                <div>
                  <span className={panelLabelClass}>{windowSummary.label}</span>
                  {windowSummary.sportSummaries.length > 0 ? (
                    <div className={listStackClass}>
                      {windowSummary.sportSummaries.map((summary) => (
                        <div className={listRowClass} key={`${windowSummary.label}-${summary.sport}`}>
                          <div>
                            <p className={listTitleClass}>
                              <SportLabel sport={summary.sport} />
                            </p>
                          </div>
                          <div className={listValuesClass}>
                            <strong className="text-[var(--text)]">
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
                    <p className={emptyStateClass}>No activities in this window yet.</p>
                  )}
                </div>
                <p className={subtleClass}>
                  {windowSummary.activityCount.toLocaleString()} total{" "}
                  {windowSummary.activityCount === 1 ? "activity" : "activities"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <h2 className={sectionTitleClass}>Recent Activities and Health Snapshot</h2>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardContent className={panelContentClass}>
              <span className={panelLabelClass}>Recent Activities</span>
              {recentActivities.length > 0 ? (
                <div className={listStackClass}>
                  {recentActivities.map((activity) => (
                    <article className={listRowClass} key={activity.id}>
                      <div>
                        <p className={listTitleClass}>
                          <Button asChild className="h-auto px-0 py-0 font-semibold" variant="link">
                            <Link href={`/activities/${activity.id}`}>
                              {activity.name ?? "Imported activity"}
                            </Link>
                          </Button>
                        </p>
                        <p className={listMetaClass}>
                          <SportLabel className="align-middle" sport={activity.sport} /> ·{" "}
                          <LocalDate value={activity.start_time} />
                        </p>
                      </div>
                      <div className={listValuesClass}>
                        <strong className="text-[var(--text)]">
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
                <p className={emptyStateClass}>
                  Recent sessions will appear here as activities are imported.
                </p>
              )}
              <p className={`${subtleClass} pt-4`}>
                {recentActivityTotal.toLocaleString()} total recent results available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className={panelContentClass}>
              <span className={panelLabelClass}>Health Snapshot</span>
              {restingHeartRate.length > 0 || dailyMetrics.length > 0 ? (
                <div className={listStackClass}>
                  {restingHeartRate.length > 0 ? (
                    <article className="flex flex-col gap-2 border-t-0 pb-2 text-[var(--muted)]">
                      <p className={listTitleClass}>Resting HR Trend</p>
                      <p className={listMetaClass}>
                        Latest: {restingHeartRate[restingHeartRate.length - 1]?.resting_heart_rate} bpm
                      </p>
                    </article>
                  ) : null}

                  {dailyMetrics.slice(0, 3).map((metric) => (
                    <article className={listRowClass} key={metric.id}>
                      <div>
                        <p className={listTitleClass}>
                          <LocalDate value={metric.metric_date} />
                        </p>
                        <p className={listMetaClass}>
                          {metric.steps ? `${metric.steps.toLocaleString()} steps` : "No step data"}
                        </p>
                      </div>
                      <div className={listValuesClass}>
                        <strong className="text-[var(--text)]">
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
                <p className={emptyStateClass}>
                  Daily health metrics will appear here as they are imported.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className={sectionClass}>
        <Card className="px-5 py-4 sm:px-6">
          <CardContent className="p-0">
            <span className={panelLabelClass}>Sync Status</span>
            <p className="m-0 flex items-center gap-3 text-[0.96rem] capitalize text-[var(--muted)]">
              <span className={`${statusDotClass} ${syncStateColor(syncStatus?.state)}`} />
              {syncStatus?.summary ?? "Sync status is unavailable right now."}
            </p>
            <Button asChild className="mt-2 h-auto px-0 py-0 text-[0.95rem]" variant="link">
              <Link href="/status/sync">View sync details</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {loadError ? (
        <section className={sectionClass}>
          <Card>
            <CardContent className={panelContentClass}>
              <span className={panelLabelClass}>Data Availability</span>
              <p className={warningClass}>
                Dashboard data could not be loaded right now: {loadError}
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </PageShell>
  );
}
