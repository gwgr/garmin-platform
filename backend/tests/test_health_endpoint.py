from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_returns_ok_status() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")
        payload = response.json()

    assert response.status_code == 200
    assert payload["status"] == "ok"
    assert payload["environment"] in {"development", "production", "test"}
