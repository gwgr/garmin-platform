import Link from "next/link";

import { getSyncStatus } from "../../../lib/api";
import { formatDateLabel } from "../../../lib/formatting";

export const dynamic = "force-dynamic";

export default async function SyncStatusPage() {
  const syncStatus = await getSyncStatus();

  return (
    <main className="shell">
      <section className="hero compact-hero">
        <p className="eyebrow">Operations</p>
        <h1>Sync status</h1>
        <p className="lede">
          A lightweight operator view for the Garmin sync pipeline. It shows the latest
          recorded status, timestamps, and any recent error summary from the worker.
        </p>
      </section>

      <section className="section split">
        <div className="panel">
          <span className="panel-label">Current State</span>
          <p className="stat-value sync-status-value">
            <span className={`status-dot status-${syncStatus.state}`} />
            {syncStatus.state}
          </p>
          <p className="warning-text">{syncStatus.summary}</p>
        </div>

        <div className="panel">
          <span className="panel-label">Recent Activity</span>
          <div className="detail-meta-grid">
            <div>
              <span className="metric-label">Last Attempt</span>
              <p>{syncStatus.last_attempted_at ? formatDateLabel(syncStatus.last_attempted_at) : "--"}</p>
            </div>
            <div>
              <span className="metric-label">Last Success</span>
              <p>{syncStatus.last_succeeded_at ? formatDateLabel(syncStatus.last_succeeded_at) : "--"}</p>
            </div>
            <div>
              <span className="metric-label">Last Synced Activity</span>
              <p>{syncStatus.last_synced_at ? formatDateLabel(syncStatus.last_synced_at) : "--"}</p>
            </div>
            <div>
              <span className="metric-label">Last Source ID</span>
              <p>{syncStatus.last_source_id ?? "--"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="panel">
          <span className="panel-label">Failure Detail</span>
          <p>{syncStatus.last_error_summary ?? "No recent error summary is recorded."}</p>
          <p className="list-meta">
            Consecutive failures: {syncStatus.consecutive_failures} · Last run status:{" "}
            {syncStatus.last_run_status ?? "unknown"}
          </p>
          <Link className="text-link" href="/">
            Return to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
