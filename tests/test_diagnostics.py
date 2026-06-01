"""
Reverse-cycle thermodynamic diagnostics solver tests.
Run with: pytest tests/test_diagnostics.py -v
"""
import sys
import os
import math

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_diagnostics_nominal():
    """Diagnostics with healthy parameters should report NOMINAL status."""
    payload = {
        "pt2": 101325.0,
        "tt2": 288.15,
        "pt3": 2026500.0,
        "tt3": 680.0,  # low exit T -> high efficiency
        "pt4": 1945440.0,
        "tt4": 1600.0,
        "pt5": 291816.0,
        "tt5": 1047.57,
        "gamma_c": 1.4,
        "gamma_t": 1.33,
    }
    r = client.post("/analyze/diagnostics", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "NOMINAL"
    assert data["eta_c"] >= 0.84
    assert data["eta_t"] >= 0.86
    assert data["dp_b"] <= 6.0
    assert len(data["alerts"]) == 0
    assert len(data["messages"]) == 1
    assert "operating within safe" in data["messages"][0]


def test_diagnostics_faults():
    """Diagnostics with degraded efficiencies should trigger specific fault alerts."""
    payload = {
        "pt2": 101325.0,
        "tt2": 288.15,
        "pt3": 2026500.0,
        "tt3": 800.0,  # high exit T -> low efficiency
        "pt4": 1800000.0,  # high pressure drop
        "tt4": 1600.0,
        "pt5": 291816.0,
        "tt5": 1250.0,  # high turbine exit T -> low efficiency
        "gamma_c": 1.4,
        "gamma_t": 1.33,
    }
    r = client.post("/analyze/diagnostics", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "FAULT_DETECTED"
    assert "F01: COMPRESSOR_FOULING" in data["alerts"]
    assert "F02: TURBINE_EROSION" in data["alerts"]
    assert "F03: COMBUSTOR_RESTRICTION" in data["alerts"]
    assert len(data["alerts"]) == 3
    assert len(data["messages"]) == 3


def test_diagnostics_validation():
    """Out of bounds sensor values must be rejected with HTTP 422."""
    # tt2 is too high
    payload = {
        "pt2": 101325.0,
        "tt2": 600.0,  # above maximum 500.0
        "pt3": 2026500.0,
        "tt3": 680.0,
        "pt4": 1945440.0,
        "tt4": 1600.0,
        "pt5": 291816.0,
        "tt5": 1047.57,
        "gamma_c": 1.4,
        "gamma_t": 1.33,
    }
    r = client.post("/analyze/diagnostics", json=payload)
    assert r.status_code == 422
