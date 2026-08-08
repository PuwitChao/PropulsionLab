import re

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)

_MISSION_PAYLOAD = {
    "aircraft_data": {"k": 0.1, "cd0": 0.02, "cl_max": 2.0},
    "constraints": [{"type": "level", "label": "Cruise", "alt": 10000, "mach": 0.8}],
    "ws_min": 1000.0,
    "ws_max": 5000.0,
    "ws_steps": 10,
}


def test_validation_errors_use_structured_422_envelope():
    response = client.post("/analyze/cycle", json={"alt": 0.0})
    body = response.json()

    assert response.status_code == 422
    assert body["error_code"] == "validation_error"
    assert body["message"] == "Request validation failed."
    assert body["request_id"] == response.headers["X-Request-ID"]
    assert isinstance(body["detail"], list)


def test_request_id_is_preserved_when_client_supplies_a_safe_value():
    response = client.get("/health", headers={"X-Request-ID": "client-test-42"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "client-test-42"


def test_solver_failure_hides_exception_details(monkeypatch):
    def fail(*_args, **_kwargs):
        raise RuntimeError("sensitive solver internals")

    monkeypatch.setattr(
        "backend.main.MissionAnalyzer.generate_constraint_data",
        fail,
    )

    response = client.post("/analyze/mission", json=_MISSION_PAYLOAD)
    body = response.json()

    assert response.status_code == 500
    assert body["error_code"] == "internal_error"
    assert body["message"] == "The server could not complete the request."
    assert "sensitive solver internals" not in response.text
    assert re.fullmatch(r"[A-Za-z0-9._-]{1,64}", body["request_id"])
    assert body["request_id"] == response.headers["X-Request-ID"]


def test_request_ids_are_unique_for_unlabelled_requests():
    first = client.get("/health").headers["X-Request-ID"]
    second = client.get("/health").headers["X-Request-ID"]

    assert first != second
