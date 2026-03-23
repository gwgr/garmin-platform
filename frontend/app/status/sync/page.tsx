import Link from "next/link";

import { LocalDate } from "../../../components/localized-time";
import { getSyncStatus } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function SyncStatusPage() {
  const syncStatus = await getSyncStatus();

  return (
    <main className="shell">
      <section className="section">
        <div className="section-header section-header-row">
          <h2>Sync Status</h2>
          <Link className="text-link" href="/">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="section split">
        <div className="panel">
          <span className="panel-label">Current State</span>
          <p className="stat-value sync-status-value">
            <span className={`status-dot status-${syncStatus.state}`} />
            {syncStatus.state}
          </p>
          <p className={syncStatus.state === "error" ? "warning-text" : "stat-subtle"}>
            {syncStatus.summary}
          </p>
        </div>

        <div className="panel">
          <span className="panel-label">Recent Activity</span>
          <div className="detail-meta-grid">
            <div>
              <span className="metric-label">Last Attempt</span>
              <p>{syncStatus.last_attempted_at ? <LocalDate value={syncStatus.last_attempted_at} /> : "--"}</p>
            </div>
            <div>
              <span className="metric-label">Last Success</span>
              <p>{syncStatus.last_succeeded_at ? <LocalDate value={syncStatus.last_succeeded_at} /> : "--"}</p>
            </div>
            <div>
              <span className="metric-label">Last Synced Activity</span>
              <p>{syncStatus.last_synced_at ? <LocalDate value={syncStatus.last_synced_at} /> : "--"}</p>
            </div>
            <div>
              <span className="metric-label">Last Source ID</span>
              <p>{syncStatus.last_source_id ?? "--"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2>Run Detail</h2>
        </div>
        <div className="panel">
          <p>{syncStatus.last_error_summary ?? "No recent error summary is recorded."}</p>
          <p className="list-meta">
            Consecutive failures: {syncStatus.consecutive_failures} · Last run status:{" "}
            {syncStatus.last_run_status ?? "unknown"}
          </p>
        </div>
      </section>
    </main>
  );
}
