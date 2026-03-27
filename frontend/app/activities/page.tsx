import Link from "next/link";

import { LocalDate } from "../../components/localized-time";
import { PageShell } from "../../components/page-shell";
import { SportBadge } from "../../components/sport";
import { type ActivityListItem, getActivities } from "../../lib/api";
import { formatDistance, formatDuration } from "../../lib/formatting";
import {
  cardLinkClass,
  disabledButtonClass,
  emptyStateClass,
  fieldLabelClass,
  filterGridClass,
  listMetaClass,
  listTitleClass,
  panelContentClass,
  panelLabelClass,
  sectionClass,
  sectionHeaderRowClass,
  sectionTitleClass,
  summaryValueClass,
  warningClass,
} from "../../lib/ui";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";

export const dynamic = "force-dynamic";

type ActivityListPageProps = {
  searchParams?: Promise<{
    page?: string;
    sport?: string;
    start_date?: string;
    end_date?: string;
  }>;
};

function buildPageHref({
  page,
  sport,
  startDate,
  endDate,
}: {
  page: number;
  sport?: string;
  startDate?: string;
  endDate?: string;
}): string {
  const params = new URLSearchParams();
  params.set("page", String(page));

  if (sport) {
    params.set("sport", sport);
  }
  if (startDate) {
    params.set("start_date", startDate);
  }
  if (endDate) {
    params.set("end_date", endDate);
  }

  return `/activities?${params.toString()}`;
}

export default async function ActivitiesPage({ searchParams }: ActivityListPageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const page = Math.max(1, Number(resolvedParams.page ?? "1") || 1);
  const sport = resolvedParams.sport?.trim() || undefined;
  const startDate = resolvedParams.start_date?.trim() || undefined;
  const endDate = resolvedParams.end_date?.trim() || undefined;

  let loadError: string | null = null;
  let items: ActivityListItem[] = [];
  let total = 0;
  let pageSize = 12;

  try {
    const response = await getActivities({
      page,
      pageSize,
      sport,
      startDate,
      endDate,
    });
    items = response.items;
    total = response.total;
    pageSize = response.page_size;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unable to load activities.";
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <PageShell
      description="Filter imported sessions by sport and date range, then drill into any activity detail."
      eyebrow="Library"
      title="Activities"
    >
      <section className={sectionClass}>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_minmax(0,1fr)]">
          <Card>
            <CardContent className={`grid gap-5 ${panelContentClass}`}>
              <form className="grid gap-5" action="/activities" method="get">
                <span className={panelLabelClass}>Filters</span>

                <div className={filterGridClass}>
                  <label className="grid gap-2">
                    <span className={fieldLabelClass}>Sport</span>
                    <input
                      className="w-full rounded-xl border border-[color:var(--line)] bg-white/70 px-[14px] py-3 text-[var(--text)] outline-none focus:border-[rgba(31,107,92,0.5)] focus:ring-2 focus:ring-[rgba(31,107,92,0.2)]"
                      defaultValue={sport}
                      name="sport"
                      placeholder="e.g. running"
                      type="text"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={fieldLabelClass}>Start date</span>
                    <input
                      className="w-full rounded-xl border border-[color:var(--line)] bg-white/70 px-[14px] py-3 text-[var(--text)] outline-none focus:border-[rgba(31,107,92,0.5)] focus:ring-2 focus:ring-[rgba(31,107,92,0.2)]"
                      defaultValue={startDate}
                      name="start_date"
                      type="date"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className={fieldLabelClass}>End date</span>
                    <input
                      className="w-full rounded-xl border border-[color:var(--line)] bg-white/70 px-[14px] py-3 text-[var(--text)] outline-none focus:border-[rgba(31,107,92,0.5)] focus:ring-2 focus:ring-[rgba(31,107,92,0.2)]"
                      defaultValue={endDate}
                      name="end_date"
                      type="date"
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="submit">Apply filters</Button>
                  <Button asChild variant="outline">
                    <Link href="/activities">Reset</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className={panelContentClass}>
              <span className={panelLabelClass}>Results Summary</span>
              <p className={summaryValueClass}>{total.toLocaleString()} matching activities</p>
              <p className={listMetaClass}>
                Page {page} of {totalPages} · sorted by most recent session
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderRowClass}>
          <div>
            <h2 className={sectionTitleClass}>Activity Results</h2>
          </div>
        </div>

        <Card>
          <CardContent className={panelContentClass}>
          {loadError ? (
            <p className={warningClass}>
              The activity list could not be loaded: {loadError}
            </p>
          ) : items.length === 0 ? (
            <p className={emptyStateClass}>
              No activities matched those filters. Try a wider date range or clear the
              sport filter.
            </p>
          ) : (
            <div className="grid">
              {items.map((activity) => (
                <article className="grid gap-4 border-t border-[color:var(--line)] py-5 first:border-t-0 first:pt-0" key={activity.id}>
                  <div>
                    <div className="flex flex-wrap items-center gap-[10px]">
                      <p className={listTitleClass}>
                        <Link className={cardLinkClass} href={`/activities/${activity.id}`}>
                          {activity.name ?? "Imported activity"}
                        </Link>
                      </p>
                      <SportBadge sport={activity.sport} />
                    </div>
                    <p className={listMetaClass}>
                      <LocalDate value={activity.start_time} />
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <span className={fieldLabelClass}>Distance</span>
                      <strong className={summaryValueClass}>
                        {activity.distance_meters
                          ? formatDistance(activity.distance_meters)
                          : "--"}
                      </strong>
                    </div>
                    <div>
                      <span className={fieldLabelClass}>Duration</span>
                      <strong className={summaryValueClass}>
                        {activity.duration_seconds
                          ? formatDuration(activity.duration_seconds)
                          : "--"}
                      </strong>
                    </div>
                    <div>
                      <span className={fieldLabelClass}>Calories</span>
                      <strong className={summaryValueClass}>
                        {activity.calories ? activity.calories.toLocaleString() : "--"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex justify-start sm:justify-end">
                    <Button asChild variant="link">
                      <Link href={`/activities/${activity.id}`}>View details</Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loadError && total > 0 ? (
            <div className="mt-[18px] flex flex-col gap-3 border-t border-[color:var(--line)] pt-[18px] sm:flex-row sm:items-center sm:justify-between">
              {hasPreviousPage ? (
                <Button
                  asChild
                  variant="outline"
                >
                  <Link
                    href={buildPageHref({
                      page: page - 1,
                      sport,
                      startDate,
                      endDate,
                    })}
                  >
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button className={disabledButtonClass} disabled variant="outline">
                  Previous
                </Button>
              )}

              <p className={listMetaClass}>
                Page {page} of {totalPages}
              </p>

              {hasNextPage ? (
                <Button asChild>
                  <Link
                    href={buildPageHref({
                      page: page + 1,
                      sport,
                      startDate,
                      endDate,
                    })}
                  >
                    Next
                  </Link>
                </Button>
              ) : (
                <Button className={disabledButtonClass} disabled>
                  Next
                </Button>
              )}
            </div>
          ) : null}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
