import Link from "next/link";
import { notFound } from "next/navigation";

import { ElevationChart, HeartRateChart, PaceChart } from "../../../components/charts";
import { InlineNotice, InlineState, StatePanel } from "../../../components/feedback";
import { LocalDate, LocalDateTime } from "../../../components/localized-time";
import { RouteMap } from "../../../components/maps";
import { PageShell } from "../../../components/page-shell";
import { SportBadge, SportLabel } from "../../../components/sport";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { getActivityDetail } from "../../../lib/api";
import { formatDistance, formatDuration } from "../../../lib/formatting";
import {
  detailMetaGridClass,
  fieldLabelClass,
  listMetaClass,
  listTitleClass,
  panelContentClass,
  panelLabelClass,
  pageTitleClass,
  sectionClass,
  sectionHeaderClass,
  sectionTitleClass,
  statSupportClass,
  statValueClass,
  summaryValueClass,
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
    const hasSparseData = laps.length === 0 || records.length === 0;

    return (
      <PageShell
        actions={
          <Button asChild variant="outline">
            <Link href="/activities">Back to activity list</Link>
          </Button>
        }
        description={
          <>
            <SportLabel className="align-middle" sport={activity.sport} /> ·{" "}
            <LocalDateTime value={activity.start_time} />
          </>
        }
        eyebrow="Activity Detail"
        title={activity.name ?? "Imported activity"}
        titleClassName={pageTitleClass}
      >
        {hasSparseData ? (
          <InlineNotice
            detail={[
              laps.length === 0 ? "Lap data is not available for this activity yet." : null,
              records.length === 0
                ? "Record samples are missing, so charts and route coverage may be limited."
                : null,
            ]
              .filter(Boolean)
              .join(" ")}
            title="Some activity data is still sparse"
            tone="warning"
          />
        ) : null}

        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass}>Session Summary</h2>
          </div>

          <div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-3">
            <Card className="flex min-h-[182px] flex-col justify-between">
              <CardContent className={`flex h-full flex-col justify-between ${panelContentClass}`}>
                <span className={panelLabelClass}>Distance</span>
                <p className={statValueClass}>
                  {activity.distance_meters ? formatDistance(activity.distance_meters) : "--"}
                </p>
                <p className={statSupportClass}>
                  <LocalDate value={activity.start_time} />
                </p>
              </CardContent>
            </Card>

            <Card className="flex min-h-[182px] flex-col justify-between">
              <CardContent className={`flex h-full flex-col justify-between ${panelContentClass}`}>
                <span className={panelLabelClass}>Duration</span>
                <p className={statValueClass}>
                  {activity.duration_seconds ? formatDuration(activity.duration_seconds) : "--"}
                </p>
                <p className={statSupportClass}>Recorded moving time</p>
              </CardContent>
            </Card>

            <Card className="flex min-h-[182px] flex-col justify-between">
              <CardContent className={`flex h-full flex-col justify-between ${panelContentClass}`}>
                <span className={panelLabelClass}>Calories</span>
                <p className={statValueClass}>
                  {activity.calories ? activity.calories.toLocaleString() : "--"}
                </p>
                <div className={statSupportClass}>
                  <SportBadge compact sport={activity.sport} />
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass}>Route and Laps</h2>
          </div>
        </section>

        <section className={`${sectionClass} grid items-start gap-[18px] xl:grid-cols-2`}>
          <RouteMap records={records} />

          <Card>
            <CardContent className={panelContentClass}>
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
                <InlineState
                  message="Lap data is not available for this activity yet."
                  title="Laps"
                  tone="warning"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className={panelContentClass}>
              <span className={panelLabelClass}>Session Info</span>
              <div className={detailMetaGridClass}>
                <div>
                  <span className={fieldLabelClass}>Source ID</span>
                  <p className={summaryValueClass}>{activity.source_activity_id}</p>
                </div>
                <div>
                  <span className={fieldLabelClass}>Created</span>
                  <p className={summaryValueClass}>
                    <LocalDateTime value={activity.created_at} />
                  </p>
                </div>
                <div>
                  <span className={fieldLabelClass}>Updated</span>
                  <p className={summaryValueClass}>
                    <LocalDateTime value={activity.updated_at} />
                  </p>
                </div>
                <div>
                  <span className={fieldLabelClass}>Stored FIT File</span>
                  <p className={`${listMetaClass} break-all`}>{activity.raw_file_path ?? "Not available"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass}>Detailed View</h2>
          </div>

          <Tabs defaultValue="charts">
            <TabsList>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              <TabsTrigger value="records">Record Samples</TabsTrigger>
            </TabsList>

            <TabsContent value="charts">
              <div className="grid gap-[18px] xl:grid-cols-3">
                <PaceChart records={records} />
                <HeartRateChart records={records} />
                <ElevationChart records={records} />
              </div>
            </TabsContent>

            <TabsContent value="records">
              <Card>
                <CardContent className={panelContentClass}>
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className={panelLabelClass}>Record Samples</span>
                    <p className={listMetaClass}>
                      Showing {recordPreview.length} of {records.length} samples
                    </p>
                  </div>

                  {recordPreview.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Distance</TableHead>
                            <TableHead>HR</TableHead>
                            <TableHead>Cadence</TableHead>
                            <TableHead>Altitude</TableHead>
                            <TableHead>Speed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recordPreview.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell><LocalDateTime value={record.record_time} /></TableCell>
                              <TableCell>
                                {record.distance_meters ? formatDistance(record.distance_meters) : "--"}
                              </TableCell>
                              <TableCell>{record.heart_rate ? `${record.heart_rate}` : "--"}</TableCell>
                              <TableCell>{record.cadence ? `${record.cadence}` : "--"}</TableCell>
                              <TableCell>
                                {record.altitude_meters ? `${record.altitude_meters.toFixed(1)} m` : "--"}
                              </TableCell>
                              <TableCell>
                                {record.speed_mps ? `${record.speed_mps.toFixed(2)} m/s` : "--"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <InlineState
                      message="Record samples are not available for this activity yet."
                      title="Record Samples"
                      tone="warning"
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </PageShell>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) {
      notFound();
    }

    return (
      <PageShell
        actions={
          <Button asChild variant="outline">
            <Link href="/activities">Back to activity list</Link>
          </Button>
        }
        eyebrow="Activity Detail"
        title="Unable to load activity"
        titleClassName={sectionTitleClass}
      >
        <section className={sectionClass}>
          <StatePanel
            detail={error instanceof Error ? error.message : "An unexpected error occurred."}
            message="This activity could not be loaded right now."
            title="Activity Detail"
            tone="error"
          />
        </section>
      </PageShell>
    );
  }
}
