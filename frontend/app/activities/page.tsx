import Link from "next/link";

import { LocalDate } from "../../components/localized-time";
import { type ActivityListItem, getActivities } from "../../lib/api";
import { formatDistance, formatDuration } from "../../lib/formatting";

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
    <main className="shell">
      <section className="section">
        <div className="section-header section-header-row">
          <h2>Activities</h2>
          <Link className="text-link" href="/">
            Back to dashboard
          </Link>
        </div>

        <div className="hero-grid">
          <form className="panel filter-panel" action="/activities" method="get">
            <span className="panel-label">Filters</span>

            <div className="filter-grid">
              <label className="field">
                <span>Sport</span>
                <input
                  defaultValue={sport}
                  name="sport"
                  placeholder="e.g. running"
                  type="text"
                />
              </label>

              <label className="field">
                <span>Start date</span>
                <input defaultValue={startDate} name="start_date" type="date" />
              </label>

              <label className="field">
                <span>End date</span>
                <input defaultValue={endDate} name="end_date" type="date" />
              </label>
            </div>

            <div className="filter-actions">
              <button className="button primary-button" type="submit">
                Apply filters
              </button>
              <Link className="button ghost-button" href="/activities">
                Reset
              </Link>
            </div>
          </form>

          <div className="panel">
            <span className="panel-label">Results Summary</span>
            <p className="list-title">{total.toLocaleString()} matching activities</p>
            <p className="list-meta">
              Page {page} of {totalPages} · sorted by most recent session
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-header section-header-row">
          <div>
            <h2>Activity Results</h2>
          </div>
        </div>

        <div className="panel">
          {loadError ? (
            <p className="warning">
              The activity list could not be loaded: {loadError}
            </p>
          ) : items.length === 0 ? (
            <p className="empty-state">
              No activities matched those filters. Try a wider date range or clear the
              sport filter.
            </p>
          ) : (
            <div className="table-stack">
              {items.map((activity) => (
                <article className="activity-card" key={activity.id}>
                  <div className="activity-main">
                    <div className="activity-heading">
                    <p className="list-title">
                      <Link className="card-link" href={`/activities/${activity.id}`}>
                        {activity.name ?? "Imported activity"}
                      </Link>
                    </p>
                    <span className="sport-badge">{activity.sport}</span>
                    </div>
                    <p className="list-meta">
                      <LocalDate value={activity.start_time} />
                    </p>
                  </div>

                  <div className="activity-metrics">
                    <div>
                      <span className="metric-label">Distance</span>
                      <strong>
                        {activity.distance_meters
                          ? formatDistance(activity.distance_meters)
                          : "--"}
                      </strong>
                    </div>
                    <div>
                      <span className="metric-label">Duration</span>
                      <strong>
                        {activity.duration_seconds
                          ? formatDuration(activity.duration_seconds)
                          : "--"}
                      </strong>
                    </div>
                    <div>
                      <span className="metric-label">Calories</span>
                      <strong>
                        {activity.calories ? activity.calories.toLocaleString() : "--"}
                      </strong>
                    </div>
                  </div>

                  <div className="activity-card-footer">
                    <Link className="text-link" href={`/activities/${activity.id}`}>
                      View details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loadError && total > 0 ? (
            <div className="pagination-row">
              {hasPreviousPage ? (
                <Link
                  className="button ghost-button"
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
                <span className="button ghost-button disabled-button">Previous</span>
              )}

              <p className="pagination-label">
                Page {page} of {totalPages}
              </p>

              {hasNextPage ? (
                <Link
                  className="button primary-button"
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
                <span className="button primary-button disabled-button">Next</span>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
