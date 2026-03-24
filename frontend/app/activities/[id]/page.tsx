import Link from "next/link";
import { notFound } from "next/navigation";

import { ElevationChart, HeartRateChart, PaceChart } from "../../../components/charts";
import { LocalDate, LocalDateTime } from "../../../components/localized-time";
import { RouteMap } from "../../../components/maps";
import { SportBadge, SportLabel } from "../../../components/sport";
import { getActivityDetail } from "../../../lib/api";
import { formatDistance, formatDuration } from "../../../lib/formatting";

export const dynamic = "force-dynamic";

type ActivityDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { id } = await params;
  const activityId = Number(id);

  if (!Number.isInteger(activityId) || activityId < 1) {
    notFound();
  }

  try {
    const detail = await getActivityDetail(activityId);
    const { activity, laps, records } = detail;
    const recordPreview = records.slice(0, 120);

    return (
      <main className="shell">
        <section className="section">
          <div className="section-header section-header-row">
            <div>
              <h2>{activity.name ?? "Imported activity"}</h2>
              <p className="lede">
                <SportLabel className="sport-label-inline" sport={activity.sport} /> ·{" "}
                <LocalDateTime value={activity.start_time} />
              </p>
            </div>
            <div className="detail-links">
              <Link className="text-link" href="/">
                Back to dashboard
              </Link>
              <Link className="text-link" href="/activities">
                Back to activity list
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>Session Summary</h2>
          </div>

          <div className="stat-grid">
            <article className="panel stat-card">
              <span className="panel-label">Distance</span>
              <p className="stat-value">
                {activity.distance_meters ? formatDistance(activity.distance_meters) : "--"}
              </p>
              <p className="stat-subtle">
                <LocalDate value={activity.start_time} />
              </p>
            </article>

            <article className="panel stat-card">
              <span className="panel-label">Duration</span>
              <p className="stat-value">
                {activity.duration_seconds ? formatDuration(activity.duration_seconds) : "--"}
              </p>
              <p className="stat-subtle">Recorded moving time</p>
            </article>

            <article className="panel stat-card">
              <span className="panel-label">Calories</span>
              <p className="stat-value">
                {activity.calories ? activity.calories.toLocaleString() : "--"}
              </p>
              <div className="stat-subtle">
                <SportBadge className="sport-badge-compact" sport={activity.sport} />
              </div>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>Route and Laps</h2>
          </div>
        </section>

        <section className="section split detail-split">
          <RouteMap records={records} />

          <div className="panel">
            <span className="panel-label">Laps</span>
            {laps.length > 0 ? (
              <div className="table-stack">
                {laps.map((lap) => (
                  <article className="lap-row" key={lap.id}>
                    <div>
                      <p className="list-title">Lap {lap.lap_index}</p>
                      <p className="list-meta">
                        {lap.start_time ? <LocalDateTime value={lap.start_time} /> : "No start time"}
                      </p>
                    </div>
                    <div className="lap-metrics">
                      <span>{lap.distance_meters ? formatDistance(lap.distance_meters) : "--"}</span>
                      <span>{lap.duration_seconds ? formatDuration(lap.duration_seconds) : "--"}</span>
                      <span>
                        {lap.average_heart_rate ? `${lap.average_heart_rate} avg HR` : "--"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Lap data is not available for this activity yet.</p>
            )}
          </div>

          <div className="panel">
            <span className="panel-label">Session Info</span>
            <div className="detail-meta-grid">
              <div>
                <span className="metric-label">Source ID</span>
                <p className="list-title">{activity.source_activity_id}</p>
              </div>
              <div>
                <span className="metric-label">Created</span>
                <p className="list-title">
                  <LocalDateTime value={activity.created_at} />
                </p>
              </div>
              <div>
                <span className="metric-label">Updated</span>
                <p className="list-title">
                  <LocalDateTime value={activity.updated_at} />
                </p>
              </div>
              <div>
                <span className="metric-label">Stored FIT File</span>
                <p className="list-meta detail-path">{activity.raw_file_path ?? "Not available"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <h2>Charts</h2>
          </div>

          <div className="chart-grid">
            <PaceChart records={records} />
            <HeartRateChart records={records} />
            <ElevationChart records={records} />
          </div>
        </section>

        <section className="section">
          <div className="section-header section-header-row">
            <div>
              <h2>Record Samples</h2>
            </div>
            <p className="pagination-label">
              Showing {recordPreview.length} of {records.length} samples
            </p>
          </div>

          <div className="panel">
            {recordPreview.length > 0 ? (
              <div className="record-table-wrapper">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Distance</th>
                      <th>HR</th>
                      <th>Cadence</th>
                      <th>Altitude</th>
                      <th>Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordPreview.map((record) => (
                      <tr key={record.id}>
                        <td><LocalDateTime value={record.record_time} /></td>
                        <td>
                          {record.distance_meters ? formatDistance(record.distance_meters) : "--"}
                        </td>
                        <td>{record.heart_rate ? `${record.heart_rate}` : "--"}</td>
                        <td>{record.cadence ? `${record.cadence}` : "--"}</td>
                        <td>
                          {record.altitude_meters ? `${record.altitude_meters.toFixed(1)} m` : "--"}
                        </td>
                        <td>
                          {record.speed_mps ? `${record.speed_mps.toFixed(2)} m/s` : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="empty-state">
                Record samples are not available for this activity yet.
              </p>
            )}
          </div>
        </section>
      </main>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      notFound();
    }

    return (
      <main className="shell">
        <section className="section">
          <div className="panel">
            <h2>Unable to load activity</h2>
            <p className="warning">
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
            <div className="detail-links">
              <Link className="text-link" href="/">
                Back to dashboard
              </Link>
              <Link className="text-link" href="/activities">
                Back to activity list
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }
}
