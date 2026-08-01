"""
Tests for presets, ramjet cycle, Breguet range, and MoC OBJ exports.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from core.gas_turbine.cycle import CycleAnalyzer
from core.gas_turbine.mission import MissionAnalyzer
from core.rocket.moc import MoCNozzle

client = TestClient(app)


def test_presets_endpoint():
    response = client.get("/analyze/presets")
    assert response.status_code == 200
    data = response.json()
    assert "engine_presets" in data
    assert "rocket_presets" in data
    assert "mission_presets" in data
    assert "diagnostic_presets" in data
    assert "turbofan_cfm56_7b" in data["engine_presets"]
    assert "merlin_1d" in data["rocket_presets"]


def test_ramjet_solver():
    analyzer = CycleAnalyzer(p0_pa=10000.0, t0_k=220.0, mach=3.0)
    res = analyzer.solve_ramjet(t4=2000.0)
    assert res["engine_type"] == "ramjet"
    assert res["spec_thrust"] > 0
    assert res["tsfc"] > 0
    assert "stations" in res
    assert 9 in res["stations"]


def test_ramjet_endpoint():
    payload = {
        "alt": 20000.0,
        "mach": 3.0,
        "t4": 2200.0,
        "eta_b": 0.98,
        "burner_dp_frac": 0.05,
        "nozzle_dp_frac": 0.02
    }
    response = client.post("/analyze/cycle/ramjet", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["engine_type"] == "ramjet"
    assert data["spec_thrust"] > 0


def test_breguet_range_calculator():
    analyzer = MissionAnalyzer({})
    res = analyzer.calculate_breguet_range(
        mach=0.78,
        altitude_m=11000.0,
        sfc_1_per_s=1.6e-5,
        l_over_d=16.0,
        w_initial=70000.0,
        w_final=45000.0
    )
    assert res["range_km"] > 1000.0
    assert res["flight_time_hours"] > 1.0
    assert res["fuel_fraction"] > 0.3


def test_breguet_endpoint():
    payload = {
        "mach": 0.78,
        "alt": 11000.0,
        "sfc_1_per_s": 1.6e-5,
        "l_over_d": 16.0,
        "w_initial": 70000.0,
        "w_final": 45000.0
    }
    response = client.post("/analyze/mission/breguet", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["range_km"] > 0


def test_moc_obj_export():
    solver = MoCNozzle(gamma=1.2, mach_exit=3.0, throat_radius=0.1)
    obj_str = solver.generate_obj_mesh()
    assert "Wavefront OBJ Nozzle Mesh" in obj_str
    assert "v " in obj_str
    assert "f " in obj_str


def test_moc_obj_endpoint():
    payload = {"gamma": 1.2, "mach_exit": 3.0, "throat_radius": 0.1}
    response = client.post("/analyze/rocket/export/obj", json=payload)
    assert response.status_code == 200
    assert "Wavefront OBJ" in response.text
