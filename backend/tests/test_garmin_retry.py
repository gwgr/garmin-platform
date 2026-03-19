from __future__ import annotations

from pathlib import Path

import pytest
from requests import HTTPError, Response

from app.services.garmin import GarthGarminClient


def _http_error(status_code: int) -> HTTPError:
    response = Response()
    response.status_code = status_code
    return HTTPError(response=response)


def test_perform_with_backoff_retries_then_succeeds() -> None:
    sleep_calls: list[float] = []
    client = GarthGarminClient(
        email=None,
        password=None,
        garth_home=Path("data/garth"),
        retry_delays_seconds=(1, 2, 3),
        sleep_func=sleep_calls.append,
    )
    attempts = {"count": 0}

    def flaky_operation():
        attempts["count"] += 1
        if attempts["count"] < 3:
            raise _http_error(429)
        return "ok"

    result = client._perform_with_backoff("garmin.test", flaky_operation, label="demo")

    assert result == "ok"
    assert attempts["count"] == 3
    assert sleep_calls == [1, 2]


def test_perform_with_backoff_raises_after_final_attempt() -> None:
    sleep_calls: list[float] = []
    client = GarthGarminClient(
        email=None,
        password=None,
        garth_home=Path("data/garth"),
        retry_delays_seconds=(4, 5),
        sleep_func=sleep_calls.append,
    )
    attempts = {"count": 0}

    def always_fails():
        attempts["count"] += 1
        raise _http_error(429)

    with pytest.raises(HTTPError):
        client._perform_with_backoff("garmin.test", always_fails, label="demo")

    assert attempts["count"] == 3
    assert sleep_calls == [4, 5]
