import type { ReactNode } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import { ElevationChart, HeartRateChart, PaceChart } from "../../../components/charts";
import { InlineNotice, InlineState, StatePanel } from "../../../components/feedback";
import { LocalDate, LocalDateTime } from "../../../components/localized-time";
import { RouteMap } from "../../../components/maps";
import { PageShell } from "../../../components/page-shell";
import { SportLabel } from "../../../components/sport";
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
import {
  type ActivityDetail,
  type ActivityLap,
  type ActivityListItem,
  type ActivityRecord,
  getActivities,
  getActivityDetail,
} from "../../../lib/api";
import {
  formatDistance,
  formatDuration,
  formatPaceMinutesPer100Meters,
  formatPaceMinutesPerKilometer,
  formatSpeedKilometersPerHour,
} from "../../../lib/formatting";
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
  summaryValueClass,
} from "../../../lib/ui";

export const dynamic = "force-dynamic";

type ActivityDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ActivityNeighbors = {
  previous: ActivityListItem | null;
  next: ActivityListItem | null;
};

type SummaryCard = {
  label: string;
  value: string;
};

type LapMetricKind = "pace" | "swim-pace" | "speed";

type LapMetricSummary = {
  heading: string;
  helper: string;
  kind: LapMetricKind;
};

type ScoredLap = {
  lap: ActivityLap;
  displayValue: string;
  meta: string;
  score: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function deriveAverageHeartRate(records: ActivityRecord[], laps: ActivityLap[]): number | null {
  const recordRates = records
    .map((record) => record.heart_rate)
    .filter((value): value is number => value !== null);
  if (recordRates.length > 0) {
    return average(recordRates);
  }

  const lapRates = laps
    .map((lap) => lap.average_heart_rate)
    .filter((value): value is number => value !== null);
  return average(lapRates);
}

function getAverageSpeedKph(distanceMeters: number | null, durationSeconds: number | null): number | null {
  if (!distanceMeters || !durationSeconds || distanceMeters <= 0 || durationSeconds <= 0) {
    return null;
  }

  return (distanceMeters / durationSeconds) * 3.6;
}

function getAveragePaceMinutesPerKilometer(
  distanceMeters: number | null,
  durationSeconds: number | null,
): number | null {
  if (!distanceMeters || !durationSeconds || distanceMeters <= 0 || durationSeconds <= 0) {
    return null;
  }

  return durationSeconds / 60 / (distanceMeters / 1000);
}

function getAveragePaceMinutesPer100Meters(
  distanceMeters: number | null,
  durationSeconds: number | null,
): number | null {
  if (!distanceMeters || !durationSeconds || distanceMeters <= 0 || durationSeconds <= 0) {
    return null;
  }

  return durationSeconds / 60 / (distanceMeters / 100);
}

function isSwimmingSport(sport: string): boolean {
  return sport.includes("swim");
}

function isCyclingSport(sport: string): boolean {
  return sport.includes("cycling") || sport.includes("biking");
}

function getPrimaryMetricCard(activity: ActivityListItem, averageHeartRate: number | null): SummaryCard[] {
  const averageSpeedKph = getAverageSpeedKph(activity.distance_meters, activity.duration_seconds);
  const averagePaceMinKm = getAveragePaceMinutesPerKilometer(activity.distance_meters, activity.duration_seconds);
  const averagePaceMin100m = getAveragePaceMinutesPer100Meters(
    activity.distance_meters,
    activity.duration_seconds,
  );

  const effortCard = isSwimmingSport(activity.sport)
    ? {
        label: "Average Pace",
        value: averagePaceMin100m ? formatPaceMinutesPer100Meters(averagePaceMin100m) : "--",
      }
    : isCyclingSport(activity.sport)
      ? {
          label: "Average Speed",
          value: averageSpeedKph ? formatSpeedKilometersPerHour(averageSpeedKph) : "--",
        }
      : {
          label: "Average Pace",
          value: averagePaceMinKm ? formatPaceMinutesPerKilometer(averagePaceMinKm) : "--",
        };

  return [
    {
      label: "Distance",
      value: activity.distance_meters ? formatDistance(activity.distance_meters) : "--",
    },
    {
      label: "Duration",
      value: activity.duration_seconds ? formatDuration(activity.duration_seconds) : "--",
    },
    effortCard,
    {
      label: "Average Heart Rate",
      value: averageHeartRate ? `${Math.round(averageHeartRate)} bpm` : "--",
    },
    {
      label: "Calories",
      value: activity.calories ? activity.calories.toLocaleString() : "--",
    },
  ];
}

function getLapMetricSummary(sport: string): LapMetricSummary {
  if (isSwimmingSport(sport)) {
    return {
      heading: "Average Pace per Lap",
      helper: "Bars compare lap efficiency, with faster swims extending further.",
      kind: "swim-pace",
    };
  }

  if (isCyclingSport(sport)) {
    return {
      heading: "Average Speed per Lap",
      helper: "Bars compare lap speed, which works better than pace for ride-style sessions.",
      kind: "speed",
    };
  }

  return {
    heading: "Average Pace per Lap",
    helper: "Bars compare lap efficiency, with faster laps extending further.",
    kind: "pace",
  };
}

function scoreLaps(sport: string, laps: ActivityLap[]): ScoredLap[] {
  const metric = getLapMetricSummary(sport);

  return laps.map((lap) => {
    const speedKph = getAverageSpeedKph(lap.distance_meters, lap.duration_seconds);
    const paceMinKm = getAveragePaceMinutesPerKilometer(lap.distance_meters, lap.duration_seconds);
    const paceMin100m = getAveragePaceMinutesPer100Meters(lap.distance_meters, lap.duration_seconds);

    const displayValue =
      metric.kind === "speed"
        ? speedKph
          ? formatSpeedKilometersPerHour(speedKph)
          : "--"
        : metric.kind === "swim-pace"
          ? paceMin100m
            ? formatPaceMinutesPer100Meters(paceMin100m)
            : "--"
          : paceMinKm
            ? formatPaceMinutesPerKilometer(paceMinKm)
            : "--";

    const meta = [
      lap.distance_meters ? formatDistance(lap.distance_meters) : "Distance unavailable",
      lap.duration_seconds ? formatDuration(lap.duration_seconds) : "Duration unavailable",
      lap.average_heart_rate ? `${lap.average_heart_rate} avg HR` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return {
      lap,
      displayValue,
      meta,
      score: speedKph,
    };
  });
}

async function getActivityNeighbors(activityId: number): Promise<ActivityNeighbors> {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  let previousPageItems: ActivityListItem[] | null = null;

  while (page <= totalPages) {
    const response = await getActivities({ page, pageSize });
    totalPages = Math.max(1, Math.ceil(response.total / response.page_size));
    const currentIndex = response.items.findIndex((activity) => activity.id === activityId);

    if (currentIndex !== -1) {
      const previous =
        currentIndex < response.items.length - 1
          ? response.items[currentIndex + 1]
          : page < totalPages
            ? (await getActivities({ page: page + 1, pageSize })).items[0] ?? null
            : null;
      const next =
        currentIndex > 0
          ? response.items[currentIndex - 1]
          : previousPageItems?.[previousPageItems.length - 1] ?? null;

      return { previous, next };
    }

    previousPageItems = response.items;
    page += 1;
  }

  return { previous: null, next: null };
}

function buildSessionInfoItems(detail: ActivityDetail): Array<{ label: string; value: ReactNode }> {
  const { activity, laps, records } = detail;

  return [
    { label: "Sport", value: <SportLabel className="align-middle" sport={activity.sport} /> },
    { label: "Source ID", value: activity.source_activity_id },
    { label: "Laps", value: laps.length.toLocaleString() },
    { label: "Record Samples", value: records.length.toLocaleString() },
    {
      label: "Created",
      value: <LocalDateTime value={activity.created_at} />,
    },
    {
      label: "Updated",
      value: <LocalDateTime value={activity.updated_at} />,
    },
    {
      label: "Stored FIT File",
      value: activity.raw_file_path ?? "Not available",
    },
  ];
}

export default async function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { id } = await params;
  const activityId = Number(id);

  if (!Number.isInteger(activityId) || activityId < 1) {
    notFound();
  }

  try {
    const [detail, neighbors] = await Promise.all([
      getActivityDetail(activityId),
      getActivityNeighbors(activityId),
    ]);
    const { activity, laps, records } = detail;
    const recordPreview = records.slice(0, 120);
    const hasSparseData = laps.length === 0 || records.length === 0;
    const averageHeartRate = deriveAverageHeartRate(records, laps);
    const summaryCards = getPrimaryMetricCard(activity, averageHeartRate);
    const lapMetric = getLapMetricSummary(activity.sport);
    const scoredLaps = scoreLaps(activity.sport, laps);
    const maxLapScore = Math.max(...scoredLaps.map((entry) => entry.score ?? 0), 0);
    const sessionInfoItems = buildSessionInfoItems(detail);

    return (
      <PageShell
        actions={
          <>
            {neighbors.previous ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/activities/${neighbors.previous.id}`}>Previous activity</Link>
              </Button>
            ) : (
              <Button disabled size="sm" variant="outline">
                Previous activity
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/activities">Back to activity list</Link>
            </Button>
            {neighbors.next ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/activities/${neighbors.next.id}`}>Next activity</Link>
              </Button>
            ) : (
              <Button disabled size="sm" variant="outline">
                Next activity
              </Button>
            )}
          </>
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

          <div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-5">
            {summaryCards.map((card) => (
              <Card className="flex min-h-[184px] flex-col justify-between" key={card.label}>
                <CardContent className={`flex h-full flex-col justify-center gap-6 ${panelContentClass}`}>
                  <span className={panelLabelClass}>{card.label}</span>
                  <p className="m-0 whitespace-nowrap text-[clamp(1.22rem,1.9vw,1.72rem)] font-semibold leading-[1.08] text-[var(--text)]">
                    {card.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <h2 className={sectionTitleClass}>Route and Laps</h2>
          </div>
        </section>

        <section className={`${sectionClass} grid items-start gap-[18px] xl:grid-cols-[1.15fr_0.85fr]`}>
          <RouteMap records={records} />

          <Card>
            <CardContent className={panelContentClass}>
              <div className="mb-4">
                <span className={panelLabelClass}>Laps</span>
                <p className={listTitleClass}>{lapMetric.heading}</p>
                <p className={listMetaClass}>{lapMetric.helper}</p>
              </div>

              {scoredLaps.length > 0 ? (
                <div className="grid gap-4">
                  {scoredLaps.map((entry) => {
                    const width =
                      entry.score && maxLapScore > 0
                        ? Math.max(14, (entry.score / maxLapScore) * 100)
                        : 0;

                    return (
                      <article className="grid gap-2 border-t border-[color:var(--line)] pt-4 first:border-t-0 first:pt-0" key={entry.lap.id}>
                        <div className="flex items-baseline justify-between gap-4">
                          <div>
                            <p className={listTitleClass}>Lap {entry.lap.lap_index}</p>
                            <p className={listMetaClass}>{entry.meta}</p>
                          </div>
                          <p className="m-0 text-right text-base font-semibold text-[var(--text)]">
                            {entry.displayValue}
                          </p>
                        </div>
                        <div className="h-3 rounded-full bg-[rgba(122,109,94,0.12)]">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#1f6b5c_0%,#bb7142_100%)]"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </article>
                    );
                  })}
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

        <section className={sectionClass}>
          <Card>
            <CardContent className={`${panelContentClass} grid gap-4`}>
              <span className={panelLabelClass}>Session Info</span>
              <div className="grid gap-4 border-t border-[color:var(--line)] pt-4 md:grid-cols-2 xl:grid-cols-7">
                {sessionInfoItems.map((item) => (
                  <div className="min-w-0" key={item.label}>
                    <span className={fieldLabelClass}>{item.label}</span>
                    <div className="mt-1 break-all text-sm leading-6 text-[var(--muted)]">
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
