const defaultBrowserApiBaseUrl = "http://localhost:8000/api/v1";
const defaultServerApiBaseUrl = "http://backend:8000/api/v1";

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};

export type ActivityListItem = {
  id: number;
  source_activity_id: string;
  name: string | null;
  sport: string;
  start_time: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories: number | null;
  average_heart_rate: number | null;
  raw_file_path: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLap = {
  id: number;
  lap_index: number;
  start_time: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  average_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
};

export type ActivityRecord = {
  id: number;
  record_time: string;
  elapsed_seconds: number | null;
  distance_meters: number | null;
  latitude_degrees: number | null;
  longitude_degrees: number | null;
  altitude_meters: number | null;
  heart_rate: number | null;
  cadence: number | null;
  speed_mps: number | null;
  power_watts: number | null;
  temperature_celsius: number | null;
};

export type ActivityDetail = {
  activity: ActivityListItem;
  laps: ActivityLap[];
  records: ActivityRecord[];
};

export type DailyMetricItem = {
  id: number;
  metric_date: string;
  resting_heart_rate: number | null;
  body_battery: number | null;
  stress_score: number | null;
  steps: number | null;
  floors_climbed: number | null;
  calories_burned: number | null;
  sleep_seconds: number | null;
};

export type TrendWindowSummary = {
  label: string;
  start_date: string;
  end_date: string;
  activity_count: number;
  total_distance_meters: number;
  total_duration_seconds: number;
  sport_rollups: SportRollupSummary[];
};

export type SportRollupSummary = {
  sport: string;
  activity_count: number;
  total_distance_meters: number;
  total_duration_seconds: number;
};

export type RecentActivityCounts = {
  last_7_days: number;
  last_30_days: number;
  last_90_days: number;
};

export type RestingHeartRatePoint = {
  metric_date: string;
  resting_heart_rate: number;
};

export type AnalyticsTrends = {
  current_week: TrendWindowSummary;
  last_30_days: TrendWindowSummary;
  last_6_months: TrendWindowSummary;
  last_1_year: TrendWindowSummary;
  recent_activity_counts: RecentActivityCounts;
  resting_heart_rate_trend: RestingHeartRatePoint[];
};

export type SyncStatus = {
  sync_key: string;
  state: "healthy" | "warning" | "error";
  summary: string;
  is_stale: boolean;
  last_attempted_at: string | null;
  last_succeeded_at: string | null;
  last_synced_at: string | null;
  last_source_id: string | null;
  last_run_status: string | null;
  consecutive_failures: number;
  last_error_summary: string | null;
};

export type ActivityListParams = {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  sport?: string;
};

export type DailyMetricsParams = {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
};

function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.INTERNAL_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultServerApiBaseUrl;
  }

  return process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultBrowserApiBaseUrl;
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${getApiBaseUrl()}${path}`);

  if (!params) {
    return url.toString();
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function fetchJson<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const response = await fetch(buildUrl(path, params), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getFrontendApiBaseUrl(): string {
  return getApiBaseUrl();
}

export async function getActivities(
  params: ActivityListParams = {},
): Promise<PaginatedResponse<ActivityListItem>> {
  return fetchJson<PaginatedResponse<ActivityListItem>>("/activities", {
    page: params.page,
    page_size: params.pageSize,
    start_date: params.startDate,
    end_date: params.endDate,
    sport: params.sport,
  });
}

export async function getActivityDetail(activityId: number): Promise<ActivityDetail> {
  return fetchJson<ActivityDetail>(`/activities/${activityId}`);
}

export async function getDailyMetrics(
  params: DailyMetricsParams = {},
): Promise<PaginatedResponse<DailyMetricItem>> {
  return fetchJson<PaginatedResponse<DailyMetricItem>>("/metrics/daily", {
    page: params.page,
    page_size: params.pageSize,
    start_date: params.startDate,
    end_date: params.endDate,
  });
}

export async function getAnalyticsTrends(): Promise<AnalyticsTrends> {
  return fetchJson<AnalyticsTrends>("/analytics/trends");
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return fetchJson<SyncStatus>("/sync/status");
}
