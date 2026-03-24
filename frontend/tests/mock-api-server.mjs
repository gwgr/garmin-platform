import { createServer } from "node:http";

const port = 8010;

function iso(value) {
  return new Date(value).toISOString();
}

const activities = [
  {
    id: 101,
    source_activity_id: "fixture-run-001",
    name: "Yarra River Tempo",
    sport: "running",
    start_time: iso("2026-03-22T06:15:00Z"),
    duration_seconds: 3120,
    distance_meters: 10250,
    calories: 812,
    raw_file_path: "fixtures/2026/03/fixture-run-001.fit",
    created_at: iso("2026-03-22T07:20:00Z"),
    updated_at: iso("2026-03-22T07:20:00Z"),
  },
  {
    id: 102,
    source_activity_id: "fixture-ride-002",
    name: "Dandenongs Endurance Ride",
    sport: "cycling",
    start_time: iso("2026-03-20T21:10:00Z"),
    duration_seconds: 8100,
    distance_meters: 68400,
    calories: 1540,
    raw_file_path: "fixtures/2026/03/fixture-ride-002.fit",
    created_at: iso("2026-03-20T23:40:00Z"),
    updated_at: iso("2026-03-20T23:40:00Z"),
  },
  {
    id: 103,
    source_activity_id: "fixture-run-003",
    name: "Track Intervals",
    sport: "running",
    start_time: iso("2026-03-19T08:05:00Z"),
    duration_seconds: 2760,
    distance_meters: 8600,
    calories: 655,
    raw_file_path: "fixtures/2026/03/fixture-run-003.fit",
    created_at: iso("2026-03-19T09:05:00Z"),
    updated_at: iso("2026-03-19T09:05:00Z"),
  },
  {
    id: 104,
    source_activity_id: "fixture-strength-004",
    name: "Garage Strength Session",
    sport: "strength_training",
    start_time: iso("2026-03-18T07:00:00Z"),
    duration_seconds: 3000,
    distance_meters: null,
    calories: 420,
    raw_file_path: "fixtures/2026/03/fixture-strength-004.fit",
    created_at: iso("2026-03-18T08:00:00Z"),
    updated_at: iso("2026-03-18T08:00:00Z"),
  },
  {
    id: 105,
    source_activity_id: "fixture-run-005",
    name: "Easy Shakeout",
    sport: "running",
    start_time: iso("2026-03-16T06:40:00Z"),
    duration_seconds: 1980,
    distance_meters: 5200,
    calories: 382,
    raw_file_path: "fixtures/2026/03/fixture-run-005.fit",
    created_at: iso("2026-03-16T07:30:00Z"),
    updated_at: iso("2026-03-16T07:30:00Z"),
  },
  {
    id: 106,
    source_activity_id: "fixture-swim-006",
    name: "Masters Swim",
    sport: "swimming",
    start_time: iso("2026-03-15T19:00:00Z"),
    duration_seconds: 2700,
    distance_meters: 2400,
    calories: 510,
    raw_file_path: "fixtures/2026/03/fixture-swim-006.fit",
    created_at: iso("2026-03-15T20:00:00Z"),
    updated_at: iso("2026-03-15T20:00:00Z"),
  },
  {
    id: 107,
    source_activity_id: "fixture-ride-007",
    name: "Recovery Spin",
    sport: "cycling",
    start_time: iso("2026-03-13T21:25:00Z"),
    duration_seconds: 3300,
    distance_meters: 22100,
    calories: 470,
    raw_file_path: "fixtures/2026/03/fixture-ride-007.fit",
    created_at: iso("2026-03-13T22:15:00Z"),
    updated_at: iso("2026-03-13T22:15:00Z"),
  },
  {
    id: 108,
    source_activity_id: "fixture-run-008",
    name: "Long Run",
    sport: "running",
    start_time: iso("2026-03-10T05:55:00Z"),
    duration_seconds: 5580,
    distance_meters: 18100,
    calories: 1220,
    raw_file_path: "fixtures/2026/03/fixture-run-008.fit",
    created_at: iso("2026-03-10T07:45:00Z"),
    updated_at: iso("2026-03-10T07:45:00Z"),
  },
  {
    id: 109,
    source_activity_id: "fixture-hike-009",
    name: "Cathedral Range Hike",
    sport: "hiking",
    start_time: iso("2026-03-05T23:30:00Z"),
    duration_seconds: 11400,
    distance_meters: 14300,
    calories: 980,
    raw_file_path: "fixtures/2026/03/fixture-hike-009.fit",
    created_at: iso("2026-03-06T03:10:00Z"),
    updated_at: iso("2026-03-06T03:10:00Z"),
  },
  {
    id: 110,
    source_activity_id: "fixture-run-010",
    name: "Threshold Blocks",
    sport: "running",
    start_time: iso("2026-02-25T06:20:00Z"),
    duration_seconds: 4020,
    distance_meters: 12200,
    calories: 901,
    raw_file_path: "fixtures/2026/02/fixture-run-010.fit",
    created_at: iso("2026-02-25T07:35:00Z"),
    updated_at: iso("2026-02-25T07:35:00Z"),
  },
  {
    id: 111,
    source_activity_id: "fixture-ride-011",
    name: "Gravel Adventure",
    sport: "cycling",
    start_time: iso("2026-02-14T22:00:00Z"),
    duration_seconds: 9600,
    distance_meters: 74200,
    calories: 1680,
    raw_file_path: "fixtures/2026/02/fixture-ride-011.fit",
    created_at: iso("2026-02-15T01:10:00Z"),
    updated_at: iso("2026-02-15T01:10:00Z"),
  },
  {
    id: 112,
    source_activity_id: "fixture-run-012",
    name: "Parkrun Tune-Up",
    sport: "running",
    start_time: iso("2026-01-31T21:45:00Z"),
    duration_seconds: 1530,
    distance_meters: 5000,
    calories: 401,
    raw_file_path: "fixtures/2026/01/fixture-run-012.fit",
    created_at: iso("2026-01-31T22:20:00Z"),
    updated_at: iso("2026-01-31T22:20:00Z"),
  },
];

const dailyMetrics = [
  { id: 1, metric_date: "2026-03-23", resting_heart_rate: 47, body_battery: 81, stress_score: 21, steps: 10452, floors_climbed: 14, calories_burned: 2480, sleep_seconds: 28200 },
  { id: 2, metric_date: "2026-03-22", resting_heart_rate: 48, body_battery: 76, stress_score: 28, steps: 15488, floors_climbed: 18, calories_burned: 3010, sleep_seconds: 27000 },
  { id: 3, metric_date: "2026-03-21", resting_heart_rate: 49, body_battery: 72, stress_score: 33, steps: 8840, floors_climbed: 10, calories_burned: 2320, sleep_seconds: 26100 },
  { id: 4, metric_date: "2026-03-20", resting_heart_rate: 47, body_battery: 79, stress_score: 24, steps: 12022, floors_climbed: 16, calories_burned: 2890, sleep_seconds: 28800 },
  { id: 5, metric_date: "2026-03-19", resting_heart_rate: 50, body_battery: 68, stress_score: 39, steps: 13204, floors_climbed: 11, calories_burned: 2955, sleep_seconds: 25200 },
  { id: 6, metric_date: "2026-03-18", resting_heart_rate: 48, body_battery: 74, stress_score: 26, steps: 9650, floors_climbed: 9, calories_burned: 2410, sleep_seconds: 27300 },
  { id: 7, metric_date: "2026-03-17", resting_heart_rate: 46, body_battery: 84, stress_score: 18, steps: 11010, floors_climbed: 12, calories_burned: 2360, sleep_seconds: 29400 },
];

const laps = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  lap_index: index + 1,
  start_time: iso(new Date(Date.parse("2026-03-22T06:15:00Z") + index * 8 * 60 * 1000)),
  duration_seconds: index === 5 ? 720 : 480,
  distance_meters: index === 5 ? 2250 : 1600,
  average_heart_rate: 148 + index * 2,
  max_heart_rate: 160 + index * 3,
  calories: 118 + index * 10,
}));

const records = Array.from({ length: 132 }, (_, index) => {
  const elapsedSeconds = index * 24;
  return {
    id: index + 1,
    record_time: iso(new Date(Date.parse("2026-03-22T06:15:00Z") + elapsedSeconds * 1000)),
    elapsed_seconds: elapsedSeconds,
    distance_meters: Math.min(10250, index * 78),
    latitude_degrees: -37.817 + index * 0.00018,
    longitude_degrees: 144.967 + index * 0.00022,
    altitude_meters: 18 + Math.sin(index / 10) * 6,
    heart_rate: 136 + (index % 18),
    cadence: 164 + (index % 8),
    speed_mps: 3.1 + (index % 6) * 0.12,
    power_watts: null,
    temperature_celsius: 17 + (index % 4),
  };
});

const activityDetails = new Map([
  [
    101,
    {
      activity: activities[0],
      laps,
      records,
    },
  ],
]);

const analyticsTrends = {
  current_week: {
    label: "current_week",
    start_date: "2026-03-17",
    end_date: "2026-03-23",
    activity_count: 4,
    total_distance_meters: 89450,
    total_duration_seconds: 16980,
    sport_rollups: [
      { sport: "running", activity_count: 2, total_distance_meters: 18850, total_duration_seconds: 5880 },
      { sport: "cycling", activity_count: 1, total_distance_meters: 68400, total_duration_seconds: 8100 },
      { sport: "strength_training", activity_count: 1, total_distance_meters: 0, total_duration_seconds: 3000 },
    ],
  },
  current_month: {
    label: "current_month",
    start_date: "2026-03-01",
    end_date: "2026-03-23",
    activity_count: 9,
    total_distance_meters: 149350,
    total_duration_seconds: 43940,
    sport_rollups: [
      { sport: "running", activity_count: 4, total_distance_meters: 42150, total_duration_seconds: 13440 },
      { sport: "cycling", activity_count: 2, total_distance_meters: 90500, total_duration_seconds: 11400 },
      { sport: "swimming", activity_count: 1, total_distance_meters: 2400, total_duration_seconds: 2700 },
      { sport: "hiking", activity_count: 1, total_distance_meters: 14300, total_duration_seconds: 11400 },
    ],
  },
  last_6_months: {
    label: "last_6_months",
    start_date: "2025-10-01",
    end_date: "2026-03-23",
    activity_count: 12,
    total_distance_meters: 240550,
    total_duration_seconds: 69090,
    sport_rollups: [
      { sport: "cycling", activity_count: 3, total_distance_meters: 164700, total_duration_seconds: 21000 },
      { sport: "running", activity_count: 6, total_distance_meters: 59350, total_duration_seconds: 17010 },
      { sport: "hiking", activity_count: 1, total_distance_meters: 14300, total_duration_seconds: 11400 },
      { sport: "swimming", activity_count: 1, total_distance_meters: 2400, total_duration_seconds: 2700 },
    ],
  },
  last_1_year: {
    label: "last_1_year",
    start_date: "2025-03-24",
    end_date: "2026-03-23",
    activity_count: 12,
    total_distance_meters: 240550,
    total_duration_seconds: 69090,
    sport_rollups: [
      { sport: "cycling", activity_count: 3, total_distance_meters: 164700, total_duration_seconds: 21000 },
      { sport: "running", activity_count: 6, total_distance_meters: 59350, total_duration_seconds: 17010 },
      { sport: "hiking", activity_count: 1, total_distance_meters: 14300, total_duration_seconds: 11400 },
      { sport: "swimming", activity_count: 1, total_distance_meters: 2400, total_duration_seconds: 2700 },
    ],
  },
  recent_activity_counts: {
    last_7_days: 4,
    last_30_days: 10,
    last_90_days: 12,
  },
  resting_heart_rate_trend: dailyMetrics
    .slice()
    .reverse()
    .map((metric) => ({
      metric_date: metric.metric_date,
      resting_heart_rate: metric.resting_heart_rate,
    })),
};

const syncStatus = {
  sync_key: "garmin_activities",
  state: "healthy",
  summary: "Latest Garmin sync completed successfully this morning.",
  is_stale: false,
  last_attempted_at: iso("2026-03-23T05:58:00Z"),
  last_succeeded_at: iso("2026-03-23T05:58:00Z"),
  last_synced_at: activities[0].start_time,
  last_source_id: activities[0].source_activity_id,
  last_run_status: "success",
  consecutive_failures: 0,
  last_error_summary: null,
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function handleActivities(requestUrl, response) {
  const page = Math.max(1, Number(requestUrl.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.max(1, Number(requestUrl.searchParams.get("page_size") ?? "12") || 12);
  const sport = requestUrl.searchParams.get("sport")?.trim().toLowerCase();
  const startDate = requestUrl.searchParams.get("start_date");
  const endDate = requestUrl.searchParams.get("end_date");

  const filtered = activities.filter((activity) => {
    if (sport && activity.sport.toLowerCase() !== sport) {
      return false;
    }
    if (startDate && activity.start_time.slice(0, 10) < startDate) {
      return false;
    }
    if (endDate && activity.start_time.slice(0, 10) > endDate) {
      return false;
    }
    return true;
  });

  sendJson(response, 200, {
    items: paginate(filtered, page, pageSize),
    total: filtered.length,
    page,
    page_size: pageSize,
  });
}

function handler(request, response) {
  const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const { pathname } = requestUrl;

  if (pathname === "/api/v1/health") {
    return sendJson(response, 200, { status: "ok", environment: "test" });
  }

  if (pathname === "/api/v1/activities") {
    return handleActivities(requestUrl, response);
  }

  if (pathname.startsWith("/api/v1/activities/")) {
    const activityId = Number(pathname.split("/").pop());
    const detail = activityDetails.get(activityId);
    if (!detail) {
      return sendJson(response, 404, { detail: "Activity not found" });
    }
    return sendJson(response, 200, detail);
  }

  if (pathname === "/api/v1/metrics/daily") {
    const page = Math.max(1, Number(requestUrl.searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.max(1, Number(requestUrl.searchParams.get("page_size") ?? "5") || 5);
    return sendJson(response, 200, {
      items: paginate(dailyMetrics, page, pageSize),
      total: dailyMetrics.length,
      page,
      page_size: pageSize,
    });
  }

  if (pathname === "/api/v1/analytics/trends") {
    return sendJson(response, 200, analyticsTrends);
  }

  if (pathname === "/api/v1/sync/status") {
    return sendJson(response, 200, syncStatus);
  }

  return sendJson(response, 404, { detail: "Not found" });
}

createServer(handler).listen(port, "127.0.0.1", () => {
  console.log(`Mock screenshot API listening on http://127.0.0.1:${port}`);
});
