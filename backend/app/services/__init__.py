"""Service layer helpers."""

from app.services.activity_deduper import ActivityDeduplicationResult, ActivityDeduper
from app.services.activity_fit_downloader import ActivityFitDownloadResult, ActivityFitDownloader
from app.services.activity_lap_ingest import ActivityLapIngestService
from app.services.activity_queries import (
    ActivityDetailResult,
    ActivityListFilters,
    ActivityListResult,
    ActivityQueryService,
)
from app.services.activity_record_ingest import ActivityRecordIngestService
from app.services.activity_summary_ingest import ActivitySummaryIngestService
from app.services.analytics_queries import (
    ActivityTrendsResult,
    AnalyticsQueryService,
    RecentActivityCounts,
    RestingHeartRatePoint,
    TrendWindowSummary,
)
from app.services.daily_metric_queries import (
    DailyMetricListFilters,
    DailyMetricListResult,
    DailyMetricQueryService,
)
from app.services.garmin import (
    GarminActivitySummary,
    GarminClient,
    GarminDownloadError,
    GarminClientNotConfiguredError,
    GarthGarminClient,
    PlaceholderGarminClient,
    get_garmin_client,
)
from app.services.garmin_activity_fetcher import (
    GARMIN_ACTIVITY_SYNC_KEY,
    GarminActivityFetcher,
    GarminActivityFetchResult,
)
from app.services.sync_checkpoint import SyncCheckpointService, SyncCheckpointState
from app.services.raw_file_storage import RawFileSaveResult, RawFileStorageService

__all__ = [
    "ActivityDeduplicationResult",
    "ActivityDeduper",
    "ActivityFitDownloadResult",
    "ActivityFitDownloader",
    "ActivityLapIngestService",
    "ActivityDetailResult",
    "ActivityListFilters",
    "ActivityListResult",
    "ActivityQueryService",
    "ActivityRecordIngestService",
    "ActivitySummaryIngestService",
    "ActivityTrendsResult",
    "AnalyticsQueryService",
    "DailyMetricListFilters",
    "DailyMetricListResult",
    "DailyMetricQueryService",
    "GARMIN_ACTIVITY_SYNC_KEY",
    "GarminActivityFetcher",
    "GarminActivityFetchResult",
    "GarminActivitySummary",
    "GarminClient",
    "GarminClientNotConfiguredError",
    "GarminDownloadError",
    "GarthGarminClient",
    "PlaceholderGarminClient",
    "RawFileSaveResult",
    "RawFileStorageService",
    "RecentActivityCounts",
    "RestingHeartRatePoint",
    "SyncCheckpointService",
    "SyncCheckpointState",
    "TrendWindowSummary",
    "get_garmin_client",
]
