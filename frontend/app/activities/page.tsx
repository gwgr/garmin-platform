import Link from "next/link";

import { LocalDate } from "../../components/localized-time";
import { SportBadge } from "../../components/sport";
import { type ActivityListItem, getActivities } from "../../lib/api";
import { formatDistance, formatDuration } from "../../lib/formatting";
import {
  cardLinkClass,
  detailMetaGridClass,
  disabledButtonClass,
  emptyStateClass,
  filterGridClass,
  ghostButtonClass,
  listMetaClass,
  listTitleClass,
  panelClass,
  panelLabelClass,
  primaryButtonClass,
  sectionClass,
  sectionHeaderRowClass,
  sectionTitleClass,
  shellClass,
  textLinkClass,
  warningClass,
} from "../../lib/ui";

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
    <main className={shellClass}>
      <section className={sectionClass}>
        <div className={sectionHeaderRowClass}>
          <h2 className={sectionTitleClass}>Activities</h2>
          <Link className={textLinkClass} href="/">
            Back to dashboard
          </Link>
        </div>

        <div className="mt-7 grid gap-[18px] lg:grid-cols-[1.4fr_minmax(0,1fr)]">
          <form className={`${panelClass} grid gap-[18px]`} action="/activities" method="get">
            <span className={panelLabelClass}>Filters</span>

            <div className={filterGridClass}>
              <label className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Sport
                </span>
                <input
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white/70 px-[14px] py-3 text-[var(--text)] outline-none focus:border-[rgba(31,107,92,0.5)] focus:ring-2 focus:ring-[rgba(31,107,92,0.2)]"
                  defaultValue={sport}
                  name="sport"
                  placeholder="e.g. running"
                  type="text"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  Start date
                </span>
                <input
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white/70 px-[14px] py-3 text-[var(--text)] outline-none focus:border-[rgba(31,107,92,0.5)] focus:ring-2 focus:ring-[rgba(31,107,92,0.2)]"
                  defaultValue={startDate}
                  name="start_date"
                  type="date"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                  End date
                </span>
                <input
                  className="w-full rounded-xl border border-[color:var(--line)] bg-white/70 px-[14px] py-3 text-[var(--text)] outline-none focus:border-[rgba(31,107,92,0.5)] focus:ring-2 focus:ring-[rgba(31,107,92,0.2)]"
                  defaultValue={endDate}
                  name="end_date"
                  type="date"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button className={primaryButtonClass} type="submit">
                Apply filters
              </button>
              <Link className={ghostButtonClass} href="/activities">
                Reset
              </Link>
            </div>
          </form>

          <div className={panelClass}>
            <span className={panelLabelClass}>Results Summary</span>
            <p className={`${listTitleClass} text-[1.2rem]`}>{total.toLocaleString()} matching activities</p>
            <p className={listMetaClass}>
              Page {page} of {totalPages} · sorted by most recent session
            </p>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderRowClass}>
          <div>
            <h2 className={sectionTitleClass}>Activity Results</h2>
          </div>
        </div>

        <div className={panelClass}>
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
                <article
                  className="grid gap-[18px] border-t border-[color:var(--line)] py-[18px] first:border-t-0 first:pt-0"
                  key={activity.id}
                >
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
                      <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                        Distance
                      </span>
                      <strong className="mt-1.5 block text-[1.05rem] text-[var(--text)]">
                        {activity.distance_meters
                          ? formatDistance(activity.distance_meters)
                          : "--"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                        Duration
                      </span>
                      <strong className="mt-1.5 block text-[1.05rem] text-[var(--text)]">
                        {activity.duration_seconds
                          ? formatDuration(activity.duration_seconds)
                          : "--"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[0.78rem] uppercase tracking-[0.08em] text-[var(--muted)]">
                        Calories
                      </span>
                      <strong className="mt-1.5 block text-[1.05rem] text-[var(--text)]">
                        {activity.calories ? activity.calories.toLocaleString() : "--"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex justify-start sm:justify-end">
                    <Link className={textLinkClass} href={`/activities/${activity.id}`}>
                      View details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loadError && total > 0 ? (
            <div className="mt-[18px] flex flex-col gap-3 border-t border-[color:var(--line)] pt-[18px] sm:flex-row sm:items-center sm:justify-between">
              {hasPreviousPage ? (
                <Link
                  className={ghostButtonClass}
                  href={buildPageHref({
                    page: page - 1,
                    sport,
                    startDate,
                    endDate,
                  })}
                >
                  Previous
                </Link>
              ) : (
                <span className={`${ghostButtonClass} ${disabledButtonClass}`}>Previous</span>
              )}

              <p className={listMetaClass}>
                Page {page} of {totalPages}
              </p>

              {hasNextPage ? (
                <Link
                  className={primaryButtonClass}
                  href={buildPageHref({
                    page: page + 1,
                    sport,
                    startDate,
                    endDate,
                  })}
                >
                  Next
                </Link>
              ) : (
                <span className={`${primaryButtonClass} ${disabledButtonClass}`}>Next</span>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
