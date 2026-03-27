import Link from "next/link";

import { LocalDate } from "../../../components/localized-time";
import { getSyncStatus } from "../../../lib/api";
import {
  detailMetaGridClass,
  listMetaClass,
  listTitleClass,
  panelClass,
  panelLabelClass,
  sectionClass,
  sectionHeaderClass,
  sectionHeaderRowClass,
  sectionTitleClass,
  shellClass,
  statusDotClass,
  subtleClass,
  textLinkClass,
  warningClass,
} from "../../../lib/ui";

export const dynamic = "force-dynamic";

function syncStateColor(state: string): string {
  switch (state) {
    case "healthy":
      return "bg-[#2d8a57]";
    case "error":
      return "bg-[#be3e2d]";
    default:
      return "bg-[#d28c1b]";
  }
}

export default async function SyncStatusPage() {
  const syncStatus = await getSyncStatus();

  return (
    <main className={shellClass}>
      <section className={sectionClass}>
        <div className={sectionHeaderRowClass}>
          <h2 className={sectionTitleClass}>Sync Status</h2>
          <Link className={textLinkClass} href="/">
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className={`${sectionClass} grid gap-[18px] xl:grid-cols-2`}>
        <div className={panelClass}>
          <span className={panelLabelClass}>Current State</span>
          <p className="m-0 flex items-center gap-3 text-[clamp(2rem,5vw,3.4rem)] capitalize [font-family:var(--font-metric-serif)] leading-[0.95] text-[var(--text)]">
            <span className={`${statusDotClass} ${syncStateColor(syncStatus.state)}`} />
            {syncStatus.state}
          </p>
          <p className={syncStatus.state === "error" ? warningClass : subtleClass}>
            {syncStatus.summary}
          </p>
        </div>

        <div className={panelClass}>
          <span className={panelLabelClass}>Recent Activity</span>
          <div className={detailMetaGridClass}>
            <div>
              <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                Last Attempt
              </span>
              <p className={listTitleClass}>
                {syncStatus.last_attempted_at ? <LocalDate value={syncStatus.last_attempted_at} /> : "--"}
              </p>
            </div>
            <div>
              <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                Last Success
              </span>
              <p className={listTitleClass}>
                {syncStatus.last_succeeded_at ? <LocalDate value={syncStatus.last_succeeded_at} /> : "--"}
              </p>
            </div>
            <div>
              <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                Last Synced Activity
              </span>
              <p className={listTitleClass}>
                {syncStatus.last_synced_at ? <LocalDate value={syncStatus.last_synced_at} /> : "--"}
              </p>
            </div>
            <div>
              <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                Last Source ID
              </span>
              <p className={listTitleClass}>{syncStatus.last_source_id ?? "--"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <h2 className={sectionTitleClass}>Run Detail</h2>
        </div>
        <div className={panelClass}>
          <p className={syncStatus.last_error_summary ? warningClass : listMetaClass}>
            {syncStatus.last_error_summary ?? "No recent error summary is recorded."}
          </p>
          <p className={listMetaClass}>
            Consecutive failures: {syncStatus.consecutive_failures} · Last run status:{" "}
            {syncStatus.last_run_status ?? "unknown"}
          </p>
        </div>
      </section>
    </main>
  );
}
