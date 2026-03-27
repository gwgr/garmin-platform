import Link from "next/link";

import { LocalDate } from "../../../components/localized-time";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { getSyncStatus } from "../../../lib/api";
import {
  detailMetaGridClass,
  listMetaClass,
  listTitleClass,
  panelLabelClass,
  sectionClass,
  sectionHeaderClass,
  sectionHeaderRowClass,
  sectionTitleClass,
  shellClass,
  statusDotClass,
  subtleClass,
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
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">State guide</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sync state guide</DialogTitle>
                  <DialogDescription>
                    A quick operator-friendly summary of what each sync state means in practice.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 grid gap-4 text-sm leading-6 text-[var(--muted)]">
                  <div>
                    <p className="m-0 font-semibold text-[var(--text)]">Healthy</p>
                    <p className="m-0">Recent sync activity is succeeding and no immediate attention is needed.</p>
                  </div>
                  <div>
                    <p className="m-0 font-semibold text-[var(--text)]">Warning</p>
                    <p className="m-0">The sync is stale or incomplete and should be checked before it drifts further.</p>
                  </div>
                  <div>
                    <p className="m-0 font-semibold text-[var(--text)]">Error</p>
                    <p className="m-0">Recent runs are failing and the sync likely needs intervention.</p>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button asChild variant="link">
              <Link href="/">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className={`${sectionClass} grid gap-[18px] xl:grid-cols-2`}>
        <Card>
          <CardContent className="p-[22px]">
            <span className={panelLabelClass}>Current State</span>
            <p className="m-0 flex items-center gap-3 text-[clamp(2rem,5vw,3.4rem)] capitalize [font-family:var(--font-metric-serif)] leading-[0.95] text-[var(--text)]">
              <span className={`${statusDotClass} ${syncStateColor(syncStatus.state)}`} />
              {syncStatus.state}
            </p>
            <p className={syncStatus.state === "error" ? warningClass : subtleClass}>
              {syncStatus.summary}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-[22px]">
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
          </CardContent>
        </Card>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <h2 className={sectionTitleClass}>Run Detail</h2>
        </div>
        <Card>
          <CardContent className="p-[22px]">
            <p className={syncStatus.last_error_summary ? warningClass : listMetaClass}>
              {syncStatus.last_error_summary ?? "No recent error summary is recorded."}
            </p>
            <p className={listMetaClass}>
              Consecutive failures: {syncStatus.consecutive_failures} · Last run status:{" "}
              {syncStatus.last_run_status ?? "unknown"}
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
