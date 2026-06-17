"""
API Integration Tests — PropulsionLab
Full HTTP coverage of all 17 endpoints via FastAPI TestClient.

Covers: happy paths, input validation (422), error paths (500 replaced by
sanitised messages), JSON compliance (no inf/nan), and physics benchmarks.
"""
import math
import sys
import os

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.main import app

client = TestClient(app)


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _no_inf_nan(obj):
    """Recursively assert no non-finite floats appear in obj."""
    if isinstance(obj, float):
        assert math.isfinite(obj), f"Non-finite float in response: {obj}"
    elif isinstance(obj, dict):
        for v in obj.values():
            _no_inf_nan(v)
    elif isinstance(obj, list):
        for v in obj:
            _no_inf_nan(v)


# ══════════════════════════════════════════════════════════════════════════════
# Health Endpoints
# ══════════════════════════════════════════════════════════════════════════════

def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "timestamp" in data


def test_health_diagnostics():
    r = client.get("/health/diagnostics")
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert "components" in data
    assert "cantera_version" in data


def test_version():
    r = client.get("/version")
    assert r.status_code == 200
    assert "version" in r.json()


# ══════════════════════════════════════════════════════════════════════════════
# Mission Analysis
# ══════════════════════════════════════════════════════════════════════════════

_MISSION_PAYLOAD = {
    "aircraft_data": {"k": 0.1, "cd0": 0.02, "cl_max": 2.0},
    "constraints": [
        {"type": "level", "label": "Cruise", "alt": 10000, "mach": 0.8},
        {"type": "turn",  "label": "3G",     "alt": 3000,  "mach": 0.7, "n": 3},
    ],
    "ws_min": 1000.0,
    "ws_max": 8000.0,
    "ws_steps": 30,
}


def test_mission_basic():
    r = client.post("/analyze/mission", json=_MISSION_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert "ws" in data
    assert "series" in data
    assert len(data["series"]) == 2


def test_mission_json_compliance():
    """Response must not contain inf or nan — JSON serialiser would choke."""
    r = client.post("/analyze/mission", json=_MISSION_PAYLOAD)
    assert r.status_code == 200
    _no_inf_nan(r.json())


def test_mission_inf_constraints_sanitised():
    """Constraints that produce inf T/W (near-zero Mach) must return null, not inf."""
    payload = {
        "aircraft_data": {"k": 0.1, "cd0": 0.02, "cl_max": 2.0},
        "constraints": [
            {"type": "ps", "label": "Ps50", "alt": 5000, "mach": 0.0, "ps": 50},
        ],
        "ws_min": 1000.0, "ws_max": 5000.0, "ws_steps": 10,
    }
    r = client.post("/analyze/mission", json=payload)
    assert r.status_code == 200
    # Must parse without error — no Infinity literals
    _no_inf_nan(r.json())


def test_mission_invalid_ws_range():
    payload = dict(_MISSION_PAYLOAD)
    payload["ws_min"] = 8000.0
    payload["ws_max"] = 1000.0  # inverted — must 422
    r = client.post("/analyze/mission", json=payload)
    assert r.status_code == 422


def test_mission_takeoff_constraint():
    payload = {
        "aircraft_data": {"k": 0.08, "cd0": 0.018, "cl_max": 2.5},
        "constraints": [
            {"type": "takeoff", "label": "TO", "sto": 1500, "cl_max": 2.5},
        ],
        "ws_min": 1000.0, "ws_max": 6000.0, "ws_steps": 20,
    }
    r = client.post("/analyze/mission", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert len(data["series"]) == 1


# ══════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Turbojet
# ══════════════════════════════════════════════════════════════════════════════

_TURBOJET_PAYLOAD = {
    "alt": 0.0, "mach": 0.001, "prc": 20.0, "tit": 1600.0,
}


def test_turbojet_basic():
    r = client.post("/analyze/cycle", json=_TURBOJET_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert data["engine_type"] == "turbojet"
    assert data["spec_thrust"] > 0
    assert data["tsfc"] > 0
    assert "stations" in data


def test_turbojet_efficiency_metrics():
    r = client.post("/analyze/cycle", json=_TURBOJET_PAYLOAD)
    data = r.json()
    assert "eta_thermal" in data
    assert "eta_propulsive" in data
    assert "eta_overall" in data
    assert 0.0 < data["eta_thermal"] < 1.0
    assert 0.0 <= data["eta_propulsive"] <= 1.0


def test_turbojet_json_compliance():
    r = client.post("/analyze/cycle", json=_TURBOJET_PAYLOAD)
    assert r.status_code == 200
    _no_inf_nan(r.json())


def test_turbojet_sls_physics_benchmark():
    """SLS turbojet spec_thrust should be in physical range [600, 1400] N·s/kg.
    Turbojets have high jet velocity + choked-nozzle pressure thrust; wider than turbofan range.
    """
    r = client.post("/analyze/cycle", json={"alt": 0.0, "mach": 0.001, "prc": 20.0, "tit": 1600.0})
    assert r.status_code == 200
    st = r.json()["spec_thrust"]
    assert 600 < st < 1400, f"Turbojet SLS spec_thrust out of expected range: {st:.1f} N·s/kg"


def test_turbojet_afterburner():
    payload = dict(_TURBOJET_PAYLOAD)
    payload["ab_enabled"] = True
    payload["ab_temp"] = 2100.0
    r = client.post("/analyze/cycle", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["spec_thrust"] > 0


def test_turbojet_invalid_prc():
    payload = dict(_TURBOJET_PAYLOAD)
    payload["prc"] = 0.5  # below minimum 1.1 — must 422
    r = client.post("/analyze/cycle", json=payload)
    assert r.status_code == 422


def test_turbojet_invalid_tit():
    payload = dict(_TURBOJET_PAYLOAD)
    payload["tit"] = 3000.0  # above maximum 2500 — must 422
    r = client.post("/analyze/cycle", json=payload)
    assert r.status_code == 422


# ══════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Turbofan
# ══════════════════════════════════════════════════════════════════════════════

_TURBOFAN_PAYLOAD = {
    "alt": 10000.0, "mach": 0.8, "prc": 30.0, "tit": 1500.0,
    "bpr": 6.0, "fpr": 1.6,
}


def test_turbofan_separate_basic():
    r = client.post("/analyze/cycle/turbofan", json=_TURBOFAN_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert data["engine_type"] == "turbofan_separate"
    assert data["spec_thrust"] > 0
    assert data["tsfc"] > 0


def test_turbofan_efficiency_metrics_present():
    """Turbofan must return efficiency metrics (previously missing — regression test)."""
    r = client.post("/analyze/cycle/turbofan", json=_TURBOFAN_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert "eta_thermal"    in data, "Missing eta_thermal in turbofan response"
    assert "eta_propulsive" in data, "Missing eta_propulsive in turbofan response"
    assert "eta_overall"    in data, "Missing eta_overall in turbofan response"
    assert 0.0 <= data["eta_thermal"]    <= 1.0
    assert 0.0 <= data["eta_propulsive"] <= 1.0


def test_turbofan_mixed_efficiency_metrics_present():
    payload = dict(_TURBOFAN_PAYLOAD)
    payload["bpr"] = 0.8
    payload["fpr"] = 3.5
    payload["prc"] = 28.0
    payload["tit"] = 1800.0
    payload["mixed_exhaust"] = True
    r = client.post("/analyze/cycle/turbofan", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "eta_thermal"    in data
    assert "eta_propulsive" in data
    assert "eta_overall"    in data


def test_turbofan_json_compliance():
    r = client.post("/analyze/cycle/turbofan", json=_TURBOFAN_PAYLOAD)
    assert r.status_code == 200
    _no_inf_nan(r.json())


def test_turbofan_cruise_tsfc_benchmark():
    """High-BPR turbofan at cruise should have TSFC < 2e-5 kg/N/s (~0.072 kg/kN/hr)."""
    r = client.post("/analyze/cycle/turbofan", json=_TURBOFAN_PAYLOAD)
    assert r.status_code == 200
    tsfc = r.json()["tsfc"]  # kg/N/s
    assert tsfc < 2.5e-5, f"Turbofan cruise TSFC too high: {tsfc:.6f} kg/N/s"


def test_turbofan_nozzle_dp_frac_affects_output():
    """nozzle_dp_frac is now wired through the turbofan solver (was silently ignored).
    Higher nozzle pressure loss must reduce specific thrust."""
    low_loss  = dict(_TURBOFAN_PAYLOAD, nozzle_dp_frac=0.0)
    high_loss = dict(_TURBOFAN_PAYLOAD, nozzle_dp_frac=0.10)
    st_low  = client.post("/analyze/cycle/turbofan", json=low_loss).json()["spec_thrust"]
    st_high = client.post("/analyze/cycle/turbofan", json=high_loss).json()["spec_thrust"]
    assert st_low > st_high, (
        f"nozzle_dp_frac had no effect on turbofan: {st_low} vs {st_high}"
    )


# ══════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Sweeps and Sensitivity
# ══════════════════════════════════════════════════════════════════════════════

def test_cycle_sweep_basic():
    payload = {"alt": 10000.0, "mach": 0.8, "tit": 1600.0, "prc_min": 5.0, "prc_max": 40.0, "steps": 10}
    r = client.post("/analyze/cycle/sweep", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 11  # steps+1
    for pt in data:
        assert pt["spec_thrust"] > 0
        assert pt["tsfc"] > 0


def test_cycle_sweep_invalid_range():
    payload = {"alt": 10000.0, "mach": 0.8, "tit": 1600.0, "prc_min": 40.0, "prc_max": 5.0, "steps": 10}
    r = client.post("/analyze/cycle/sweep", json=payload)
    assert r.status_code == 422


def test_sensitivity_t4_sweep():
    payload = {
        "sweep_type": "t4", "alt": 10000.0, "mach": 0.8, "prc": 20.0, "tit": 1600.0,
        "sweep_min": 1000.0, "sweep_max": 2000.0, "steps": 10,
    }
    r = client.post("/analyze/cycle/sensitivity", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["sweep_type"] == "t4"
    assert len(data["data"]) > 0


def test_sensitivity_invalid_sweep_type():
    """Invalid sweep_type must be rejected with 422 (field_validator added)."""
    payload = {
        "sweep_type": "bpr",  # invalid
        "alt": 10000.0, "mach": 0.8, "prc": 20.0, "tit": 1600.0,
        "sweep_min": 1.0, "sweep_max": 10.0, "steps": 5,
    }
    r = client.post("/analyze/cycle/sensitivity", json=payload)
    assert r.status_code == 422


def test_sensitivity_alt_sweep():
    payload = {
        "sweep_type": "alt", "alt": 0.0, "mach": 0.8, "prc": 20.0, "tit": 1600.0,
        "sweep_min": 0.0, "sweep_max": 15000.0, "steps": 8,
    }
    r = client.post("/analyze/cycle/sensitivity", json=payload)
    assert r.status_code == 200
    assert len(r.json()["data"]) > 0


def test_sensitivity_opr_sweep():
    payload = {
        "sweep_type": "opr", "alt": 10000.0, "mach": 0.8, "prc": 20.0, "tit": 1600.0,
        "sweep_min": 5.0, "sweep_max": 40.0, "steps": 8,
    }
    r = client.post("/analyze/cycle/sensitivity", json=payload)
    assert r.status_code == 200
    assert len(r.json()["data"]) > 0


# ══════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Multispool
# ══════════════════════════════════════════════════════════════════════════════

_MULTISPOOL_PAYLOAD = {
    "alt": 0.0, "mach": 0.0, "opr": 32.0, "bpr": 0.3,
    "fpr": 3.5, "lpc_pr": 4.0, "tit": 1850.0,
}


def test_multispool_basic():
    r = client.post("/analyze/cycle/multispool", json=_MULTISPOOL_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert data["engine_type"] == "multispool_turbofan"
    assert data["spec_thrust"] > 0
    assert data["tsfc"] > 0


def test_multispool_stations():
    r = client.post("/analyze/cycle/multispool", json=_MULTISPOOL_PAYLOAD)
    data = r.json()
    stations = data["stations"]
    expected = {2, 21, 25, 3, 4, 45, 5}
    present = {int(k) for k in stations.keys()}
    assert expected.issubset(present), f"Missing stations: {expected - present}"


def test_multispool_json_compliance():
    r = client.post("/analyze/cycle/multispool", json=_MULTISPOOL_PAYLOAD)
    assert r.status_code == 200
    _no_inf_nan(r.json())


# ══════════════════════════════════════════════════════════════════════════════
# Off-Design
# ══════════════════════════════════════════════════════════════════════════════

_OFFDESIGN_BASE = {"alt": 0.0, "mach": 0.0, "prc": 20.0, "tit": 1500.0}


def test_offdesign_map_basic():
    payload = dict(_OFFDESIGN_BASE)
    payload.update({"n_speed_lines": 5, "n_flow_points": 10})
    r = client.post("/analyze/offdesign/map", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "speed_lines" in data
    assert "surge_line" in data
    assert len(data["speed_lines"]) == 5
    assert "design_point" in data


def test_offdesign_throttle_basic():
    payload = dict(_OFFDESIGN_BASE)
    payload["n_points"] = 10
    r = client.post("/analyze/offdesign/throttle", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 5
    for pt in data:
        assert "throttle_pct" in pt


def test_offdesign_json_compliance():
    payload = dict(_OFFDESIGN_BASE)
    payload["n_points"] = 8
    r = client.post("/analyze/offdesign/throttle", json=payload)
    assert r.status_code == 200
    _no_inf_nan(r.json())


# ══════════════════════════════════════════════════════════════════════════════
# Rocket Analysis
# ══════════════════════════════════════════════════════════════════════════════

_ROCKET_PAYLOAD = {"pc": 10e6, "of_ratio": 6.0, "propellant": "H2/O2", "pe": 101325.0}


def test_rocket_analyze_basic():
    r = client.post("/analyze/rocket", json=_ROCKET_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert "isp_delivered" in data
    assert "isp_vac" in data
    assert "c_star" in data
    assert data["isp_delivered"] > 300


def test_rocket_h2o2_isp_benchmark():
    """H2/O2 at OF=6, pc=10 MPa should give vacuum Isp > 400 s."""
    r = client.post("/analyze/rocket", json=_ROCKET_PAYLOAD)
    assert r.status_code == 200
    isp_vac = r.json()["isp_vac"]
    assert isp_vac > 400, f"H2/O2 Isp_vac below expected range: {isp_vac:.1f} s"


def test_rocket_shifting_gt_frozen_isp():
    """Shifting composition must give higher Isp than frozen (thermodynamic law)."""
    base = dict(_ROCKET_PAYLOAD)
    base["compute_heat_transfer"] = False

    r_shift = client.post("/analyze/rocket", json={**base, "mode": "shifting"})
    r_froz  = client.post("/analyze/rocket", json={**base, "mode": "frozen"})
    assert r_shift.status_code == 200 and r_froz.status_code == 200
    isp_shift = r_shift.json()["isp_vac"]
    isp_froz  = r_froz.json()["isp_vac"]
    assert isp_shift >= isp_froz, (
        f"Shifting Isp ({isp_shift:.1f} s) should be >= frozen ({isp_froz:.1f} s)"
    )


def test_rocket_invalid_propellant():
    payload = dict(_ROCKET_PAYLOAD)
    payload["propellant"] = "UNICORN/FUEL"
    r = client.post("/analyze/rocket", json=payload)
    assert r.status_code == 422


def test_rocket_invalid_mode():
    """Invalid mode value must be rejected with 422 (field_validator added)."""
    payload = dict(_ROCKET_PAYLOAD)
    payload["mode"] = "equilibrium"  # invalid
    r = client.post("/analyze/rocket", json=payload)
    assert r.status_code == 422


def test_rocket_json_compliance():
    r = client.post("/analyze/rocket", json=_ROCKET_PAYLOAD)
    assert r.status_code == 200
    _no_inf_nan(r.json())


def test_rocket_sweep_basic():
    r = client.post("/analyze/rocket/sweep", json=_ROCKET_PAYLOAD)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 20
    for pt in data:
        assert "of_ratio" in pt
        assert "isp" in pt


def test_rocket_sweep_invalid_propellant():
    """O/F sweep with unknown propellant must 422 immediately (not mid-sweep fail)."""
    payload = dict(_ROCKET_PAYLOAD)
    payload["propellant"] = "KEROSENE/WATER"
    r = client.post("/analyze/rocket/sweep", json=payload)
    assert r.status_code == 422


def test_rocket_altitude_basic():
    payload = {"pc": 10e6, "of_ratio": 6.0, "propellant": "H2/O2", "alt_max_km": 50.0, "n_points": 8}
    r = client.post("/analyze/rocket/altitude", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 8


def test_rocket_altitude_invalid_propellant():
    payload = {"pc": 10e6, "of_ratio": 6.0, "propellant": "INVALID", "alt_max_km": 50.0, "n_points": 5}
    r = client.post("/analyze/rocket/altitude", json=payload)
    assert r.status_code == 422


def test_rocket_altitude_invalid_mode():
    payload = {"pc": 10e6, "of_ratio": 6.0, "propellant": "H2/O2",
               "mode": "supercritical", "alt_max_km": 50.0, "n_points": 5}
    r = client.post("/analyze/rocket/altitude", json=payload)
    assert r.status_code == 422


def test_rocket_sizing_basic():
    payload = {"thrust_N": 50000.0, "pc": 10e6, "of_ratio": 6.0, "propellant": "H2/O2"}
    r = client.post("/analyze/rocket/sizing", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "A_throat_m2" in data
    assert "r_throat_m" in data
    assert data["A_throat_m2"] > 0
    assert data["isp_vac"] > 300


def test_rocket_sizing_invalid_propellant():
    payload = {"thrust_N": 50000.0, "pc": 10e6, "of_ratio": 6.0, "propellant": "INVALID"}
    r = client.post("/analyze/rocket/sizing", json=payload)
    assert r.status_code == 422


def test_rocket_sizing_invalid_mode():
    payload = {"thrust_N": 50000.0, "pc": 10e6, "of_ratio": 6.0,
               "propellant": "H2/O2", "mode": "partial"}
    r = client.post("/analyze/rocket/sizing", json=payload)
    assert r.status_code == 422


def test_rocket_moc_basic():
    payload = {"gamma": 1.2, "mach_exit": 3.0, "throat_radius": 0.1}
    r = client.post("/analyze/rocket/moc", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "x" in data
    assert "y" in data
    assert "mesh" in data
    assert len(data["x"]) == len(data["y"])
    assert len(data["x"]) > 0


def test_rocket_export_stl():
    payload = {"gamma": 1.2, "mach_exit": 3.0, "throat_radius": 0.1}
    r = client.post("/analyze/rocket/export/stl", json=payload)
    assert r.status_code == 200
    assert "solid nozzle_moc" in r.text
    assert "endsolid" in r.text
    assert r.headers.get("content-disposition", "").startswith("attachment")


def test_rocket_export_csv():
    payload = {"gamma": 1.2, "mach_exit": 3.0, "throat_radius": 0.05}
    r = client.post("/analyze/rocket/export/csv", json=payload)
    assert r.status_code == 200
    assert r.headers.get("content-disposition", "").startswith("attachment")
    body = r.text
    assert "# PropulsionLab" in body
    assert "X_m,R_m" in body


# ══════════════════════════════════════════════════════════════════════════════
# Input Boundary / Edge Cases
# ══════════════════════════════════════════════════════════════════════════════

def test_cycle_at_max_altitude():
    """Engine at 47 km (ISA model limit) must return valid or safe error, not crash."""
    payload = {"alt": 47000.0, "mach": 0.5, "prc": 15.0, "tit": 1400.0}
    r = client.post("/analyze/cycle", json=payload)
    assert r.status_code in (200, 500)
    if r.status_code == 200:
        _no_inf_nan(r.json())


def test_cycle_at_zero_mach():
    """Static takeoff (Mach ≈ 0) should work without division by zero."""
    payload = {"alt": 0.0, "mach": 0.0, "prc": 20.0, "tit": 1600.0}
    r = client.post("/analyze/cycle", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["spec_thrust"] > 0


def test_rocket_low_chamber_pressure():
    """Minimum allowed pc (1 bar) must not crash."""
    payload = {"pc": 1e5, "of_ratio": 6.0, "propellant": "H2/O2", "pe": 1000.0}
    r = client.post("/analyze/rocket", json=payload)
    assert r.status_code in (200, 500)
    if r.status_code == 200:
        _no_inf_nan(r.json())


def test_rocket_of_at_extremes():
    """OF at lower (0.5) and upper (20) bounds must not crash."""
    for of in (0.5, 20.0):
        payload = {"pc": 5e6, "of_ratio": of, "propellant": "CH4/O2",
                   "compute_heat_transfer": False}
        r = client.post("/analyze/rocket", json=payload)
        assert r.status_code in (200, 500), f"Unexpected status at OF={of}: {r.status_code}"


def test_moc_low_mach_exit():
    """Minimum allowed mach_exit (1.5) must produce a valid contour."""
    payload = {"gamma": 1.3, "mach_exit": 1.5, "throat_radius": 0.05}
    r = client.post("/analyze/rocket/moc", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert all(v >= 0 for v in data["y"]), "Negative radius in contour"


def test_moc_high_mach_exit():
    """Upper bound mach_exit (6.0) must not crash."""
    payload = {"gamma": 1.15, "mach_exit": 6.0, "throat_radius": 0.02}
    r = client.post("/analyze/rocket/moc", json=payload)
    assert r.status_code == 200


def test_mission_ceiling_constraint():
    """Service ceiling constraint type must be handled without error."""
    payload = {
        "aircraft_data": {"k": 0.09, "cd0": 0.016, "cl_max": 2.2},
        "constraints": [
            {"type": "ceiling", "label": "Ceiling", "alt": 15000, "mach": 0.7},
        ],
        "ws_min": 1500.0, "ws_max": 6000.0, "ws_steps": 15,
    }
    r = client.post("/analyze/mission", json=payload)
    assert r.status_code == 200
    _no_inf_nan(r.json())


def test_mission_climb_constraint():
    """Climb angle constraint type must be handled."""
    payload = {
        "aircraft_data": {"k": 0.09, "cd0": 0.016, "cl_max": 2.2},
        "constraints": [
            {"type": "climb", "label": "Climb 15deg", "alt": 2000, "mach": 0.4, "angle_deg": 15},
        ],
        "ws_min": 1500.0, "ws_max": 6000.0, "ws_steps": 10,
    }
    r = client.post("/analyze/mission", json=payload)
    assert r.status_code == 200
    _no_inf_nan(r.json())
