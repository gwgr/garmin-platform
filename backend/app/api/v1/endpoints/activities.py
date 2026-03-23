from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, field_serializer
from sqlalchemy.orm import Session

from app.api.v1.serialization import normalize_datetime_for_json
from app.db import get_db_session
from app.models import Activity, ActivityLap, ActivityRecord
from app.services import (
    ActivityDetailResult,
    ActivityListFilters,
    ActivityListResult,
    ActivityQueryService,
)

router = APIRouter()


class ActivityListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_activity_id: str
    name: str | None
    sport: str
    start_time: datetime
    duration_seconds: float | None
    distance_meters: float | None
    calories: int | None
    raw_file_path: str | None
    created_at: datetime
    updated_at: datetime

    @field_serializer("start_time", "created_at", "updated_at", when_used="json")
    def serialize_datetimes(self, value: datetime) -> str:
        return normalize_datetime_for_json(value) or ""


class ActivityListResponse(BaseModel):
    items: list[ActivityListItem]
    total: int
    page: int
    page_size: int


class ActivityLapItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    lap_index: int
    start_time: datetime | None
    duration_seconds: float | None
    distance_meters: float | None
    average_heart_rate: int | None
    max_heart_rate: int | None
    calories: int | None

    @field_serializer("start_time", when_used="json")
    def serialize_start_time(self, value: datetime | None) -> str | None:
        return normalize_datetime_for_json(value)


class ActivityRecordItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    record_time: datetime
    elapsed_seconds: float | None
    distance_meters: float | None
    latitude_degrees: float | None
    longitude_degrees: float | None
    altitude_meters: float | None
    heart_rate: int | None
    cadence: int | None
    speed_mps: float | None
    power_watts: int | None
    temperature_celsius: float | None

    @field_serializer("record_time", when_used="json")
    def serialize_record_time(self, value: datetime) -> str:
        return normalize_datetime_for_json(value) or ""


class ActivityDetailResponse(BaseModel):
    activity: ActivityListItem
    laps: list[ActivityLapItem]
    records: list[ActivityRecordItem]


def _map_items(items: list[Activity]) -> list[ActivityListItem]:
    return [ActivityListItem.model_validate(activity) for activity in items]


def _map_laps(laps: list[ActivityLap]) -> list[ActivityLapItem]:
    return [ActivityLapItem.model_validate(lap) for lap in laps]


def _map_records(records: list[ActivityRecord]) -> list[ActivityRecordItem]:
    return [ActivityRecordItem.model_validate(record) for record in records]


@router.get("/activities", response_model=ActivityListResponse, tags=["activities"])
def list_activities(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    sport: str | None = Query(default=None),
    session: Session = Depends(get_db_session),
) -> ActivityListResponse:
    filters = ActivityListFilters(
        page=page,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date,
        sport=sport,
    )
    result: ActivityListResult = ActivityQueryService(session).list_activities(filters)
    return ActivityListResponse(
        items=_map_items(result.items),
        total=result.total,
        page=result.page,
        page_size=result.page_size,
    )


@router.get("/activities/{activity_id}", response_model=ActivityDetailResponse, tags=["activities"])
def get_activity_detail(
    activity_id: int,
    session: Session = Depends(get_db_session),
) -> ActivityDetailResponse:
    result: ActivityDetailResult | None = ActivityQueryService(session).get_activity_detail(activity_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Activity not found.")

    return ActivityDetailResponse(
        activity=ActivityListItem.model_validate(result.activity),
        laps=_map_laps(result.laps),
        records=_map_records(result.records),
    )
