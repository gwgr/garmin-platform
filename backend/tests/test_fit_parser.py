from __future__ import annotations

from pathlib import Path

from app.parsers import FitParserService


FIXTURE_FIT_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "raw" / "activities" / "2026" / "03" / "22198027348.fit"
)


def test_parse_activity_summary_reads_expected_fixture_values() -> None:
    summary = FitParserService().parse_activity_summary(FIXTURE_FIT_PATH)

    assert summary.name == "session"
    assert summary.sport == "walking"
    assert summary.start_time.isoformat() == "2026-03-17T00:17:57"
    assert summary.duration_seconds == 2899.633
    assert summary.distance_meters == 3301.6
    assert summary.calories == 194


def test_parse_activity_laps_returns_expected_lap_metrics() -> None:
    laps = FitParserService().parse_activity_laps(FIXTURE_FIT_PATH)

    assert len(laps) == 4
    assert laps[0].lap_index == 1
    assert laps[0].distance_meters == 1000.0
    assert laps[0].duration_seconds == 771.881
    assert laps[0].average_heart_rate == 64
    assert laps[0].max_heart_rate == 83
    assert laps[-1].lap_index == 4
    assert laps[-1].distance_meters == 301.6


def test_parse_activity_records_normalizes_coordinates_to_degrees() -> None:
    records = FitParserService().parse_activity_records(FIXTURE_FIT_PATH)
    records_with_coordinates = [
        record
        for record in records
        if record.latitude_degrees is not None and record.longitude_degrees is not None
    ]

    assert len(records) == 481
    assert len(records_with_coordinates) == 478
    assert records[0].record_time.isoformat() == "2026-03-17T00:17:57"
    assert records[0].heart_rate == 83
    assert records[0].latitude_degrees is None
    assert records[0].longitude_degrees is None

    first_with_coordinates = records_with_coordinates[0]
    assert -90.0 <= first_with_coordinates.latitude_degrees <= 90.0
    assert -180.0 <= first_with_coordinates.longitude_degrees <= 180.0
    assert round(first_with_coordinates.latitude_degrees or 0.0, 6) == -37.773852
    assert round(first_with_coordinates.longitude_degrees or 0.0, 6) == 145.278261
