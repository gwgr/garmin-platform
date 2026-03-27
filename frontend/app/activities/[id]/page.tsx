import Link from "next/link";
import { notFound } from "next/navigation";

import { ElevationChart, HeartRateChart, PaceChart } from "../../../components/charts";
import { LocalDate, LocalDateTime } from "../../../components/localized-time";
import { RouteMap } from "../../../components/maps";
import { SportBadge, SportLabel } from "../../../components/sport";
import { getActivityDetail } from "../../../lib/api";
import { formatDistance, formatDuration } from "../../../lib/formatting";
import {
  chartGridClass,
  detailMetaGridClass,
  emptyStateClass,
  listMetaClass,
  listTitleClass,
  panelClass,
  panelLabelClass,
  pageTitleClass,
  sectionClass,
  sectionHeaderClass,
  sectionHeaderRowClass,
  sectionTitleClass,
  shellClass,
  statValueClass,
  subtleClass,
  textLinkClass,
  warningClass,
} from "../../../lib/ui";

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
      <main className={shellClass}>
        <section className={sectionClass}>
          <div className={sectionHeaderRowClass}>
            <div>
              <h2 className={pageTitleClass}>{activity.name ?? "Imported activity"}</h2>
              <p className="mt-[18px] max-w-[56rem] text-[1.08rem] leading-[1.65] text-[var(--muted)]">
                <SportLabel className="align-middle" sport={activity.sport} /> ·{" "}
                <LocalDateTime value={activity.start_time} />
              </p>
            </div>
            <div className="grid gap-[10px]">
              <Link className={textLinkClass} href="/">
                Back to dashboard
              </Link>
              <Link className={textLinkClass} href="/activities">
                Back to activity list
              </Link>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass}>Session Summary</h2>
          </div>

          <div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-3">
            <article className={`${panelClass} flex min-h-[182px] flex-col justify-between`}>
              <span className={panelLabelClass}>Distance</span>
              <p className={statValueClass}>
                {activity.distance_meters ? formatDistance(activity.distance_meters) : "--"}
              </p>
              <p className={subtleClass}>
                <LocalDate value={activity.start_time} />
              </p>
            </article>

            <article className={`${panelClass} flex min-h-[182px] flex-col justify-between`}>
              <span className={panelLabelClass}>Duration</span>
              <p className={statValueClass}>
                {activity.duration_seconds ? formatDuration(activity.duration_seconds) : "--"}
              </p>
              <p className={subtleClass}>Recorded moving time</p>
            </article>

            <article className={`${panelClass} flex min-h-[182px] flex-col justify-between`}>
              <span className={panelLabelClass}>Calories</span>
              <p className={statValueClass}>
                {activity.calories ? activity.calories.toLocaleString() : "--"}
              </p>
              <div className={subtleClass}>
                <SportBadge compact sport={activity.sport} />
              </div>
            </article>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass}>Route and Laps</h2>
          </div>
        </section>

        <section className={`${sectionClass} grid items-start gap-[18px] xl:grid-cols-2`}>
          <RouteMap records={records} />

          <div className={panelClass}>
            <span className={panelLabelClass}>Laps</span>
            {laps.length > 0 ? (
              <div className="grid">
                {laps.map((lap) => (
                  <article
                    className="grid gap-3 border-t border-[color:var(--line)] py-4 first:border-t-0 first:pt-0"
                    key={lap.id}
                  >
                    <div>
                      <p className={listTitleClass}>Lap {lap.lap_index}</p>
                      <p className={listMetaClass}>
                        {lap.start_time ? <LocalDateTime value={lap.start_time} /> : "No start time"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[var(--muted)]">
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
              <p className={emptyStateClass}>Lap data is not available for this activity yet.</p>
            )}
          </div>

          <div className={panelClass}>
            <span className={panelLabelClass}>Session Info</span>
            <div className={detailMetaGridClass}>
              <div>
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Source ID
                </span>
                <p className={listTitleClass}>{activity.source_activity_id}</p>
              </div>
              <div>
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Created
                </span>
                <p className={listTitleClass}>
                  <LocalDateTime value={activity.created_at} />
                </p>
              </div>
              <div>
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Updated
                </span>
                <p className={listTitleClass}>
                  <LocalDateTime value={activity.updated_at} />
                </p>
              </div>
              <div>
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Stored FIT File
                </span>
                <p className={`${listMetaClass} break-all`}>{activity.raw_file_path ?? "Not available"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass}>Charts</h2>
          </div>

          <div className={chartGridClass}>
            <PaceChart records={records} />
            <HeartRateChart records={records} />
            <ElevationChart records={records} />
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionHeaderRowClass}>
            <div>
              <h2 className={sectionTitleClass}>Record Samples</h2>
            </div>
            <p className={listMetaClass}>
              Showing {recordPreview.length} of {records.length} samples
            </p>
          </div>

          <div className={panelClass}>
            {recordPreview.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[0.95rem]">
                  <thead>
                    <tr>
                      <th className="border-t-0 px-[10px] py-3 text-left text-[0.76rem] uppercase tracking-[0.08em] whitespace-nowrap text-[var(--muted)]">
                        Time
                      </th>
                      <th className="border-t-0 px-[10px] py-3 text-left text-[0.76rem] uppercase tracking-[0.08em] whitespace-nowrap text-[var(--muted)]">
                        Distance
                      </th>
                      <th className="border-t-0 px-[10px] py-3 text-left text-[0.76rem] uppercase tracking-[0.08em] whitespace-nowrap text-[var(--muted)]">
                        HR
                      </th>
                      <th className="border-t-0 px-[10px] py-3 text-left text-[0.76rem] uppercase tracking-[0.08em] whitespace-nowrap text-[var(--muted)]">
                        Cadence
                      </th>
                      <th className="border-t-0 px-[10px] py-3 text-left text-[0.76rem] uppercase tracking-[0.08em] whitespace-nowrap text-[var(--muted)]">
                        Altitude
                      </th>
                      <th className="border-t-0 px-[10px] py-3 text-left text-[0.76rem] uppercase tracking-[0.08em] whitespace-nowrap text-[var(--muted)]">
                        Speed
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recordPreview.map((record) => (
                      <tr key={record.id}>
                        <td className="border-t border-[color:var(--line)] px-[10px] py-3 whitespace-nowrap">
                          <LocalDateTime value={record.record_time} />
                        </td>
                        <td className="border-t border-[color:var(--line)] px-[10px] py-3 whitespace-nowrap">
                          {record.distance_meters ? formatDistance(record.distance_meters) : "--"}
                        </td>
                        <td className="border-t border-[color:var(--line)] px-[10px] py-3 whitespace-nowrap">
                          {record.heart_rate ? `${record.heart_rate}` : "--"}
                        </td>
                        <td className="border-t border-[color:var(--line)] px-[10px] py-3 whitespace-nowrap">
                          {record.cadence ? `${record.cadence}` : "--"}
                        </td>
                        <td className="border-t border-[color:var(--line)] px-[10px] py-3 whitespace-nowrap">
                          {record.altitude_meters ? `${record.altitude_meters.toFixed(1)} m` : "--"}
                        </td>
                        <td className="border-t border-[color:var(--line)] px-[10px] py-3 whitespace-nowrap">
                          {record.speed_mps ? `${record.speed_mps.toFixed(2)} m/s` : "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={emptyStateClass}>
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
      <main className={shellClass}>
        <section className={sectionClass}>
          <div className={panelClass}>
            <h2 className={sectionTitleClass}>Unable to load activity</h2>
            <p className={warningClass}>
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
            <div className="mt-4 grid gap-[10px]">
              <Link className={textLinkClass} href="/">
                Back to dashboard
              </Link>
              <Link className={textLinkClass} href="/activities">
                Back to activity list
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }
}
