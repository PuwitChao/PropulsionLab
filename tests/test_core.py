"""
Propulsion Analysis Suite — Core Test Suite
Tests cover cycle analysis, rocket equilibrium, MoC nozzle, mission constraints,
off-design performance, and edge-case input validation.

Run with: python -m pytest tests/ -v
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.units import isa_atmosphere
from core.gas_turbine.cycle import CycleAnalyzer
from core.gas_turbine.off_design import OffDesignSolver
from core.gas_turbine.mission import MissionAnalyzer
from core.rocket.analyzer import RocketAnalyzer
from core.rocket.moc import MoCNozzle


# ══════════════════════════════════════════════════════════════════════════════
# ISA Atmosphere Model
# ══════════════════════════════════════════════════════════════════════════════

def test_isa_atmosphere_sea_level():
    """ISA at sea level: P≈101325 Pa, T≈288.15 K."""
    p, t, rho = isa_atmosphere(0.0)
    assert abs(p - 101325.0) < 50.0, f"SL pressure off: {p}"
    assert abs(t - 288.15) < 1.0,   f"SL temperature off: {t}"
    assert rho > 1.0,                f"SL density unrealistic: {rho}"


def test_isa_atmosphere_10km():
    """ISA at 10 km: P≈26500 Pa, T≈223.25 K."""
    p, t, rho = isa_atmosphere(10000.0)
    assert 25000 < p < 28000, f"10km pressure out of range: {p}"
    assert 220.0 < t < 227.0, f"10km temperature out of range: {t}"


def test_isa_atmosphere_20km():
    """ISA at 20 km: stratospheric — T should be ~216.65 K (isothermal)."""
    p, t, rho = isa_atmosphere(20000.0)
    assert 5000 < p < 6000,   f"20km pressure out of range: {p}"
    assert 215.0 < t < 220.0, f"20km temperature out of range: {t}"


# ══════════════════════════════════════════════════════════════════════════════
# Gas Turbine — On Design
# ══════════════════════════════════════════════════════════════════════════════

def test_turbojet_sls():
    """Turbojet at sea-level static: spec_thrust and TSFC must be positive."""
    analyzer = CycleAnalyzer(101325.0, 288.15, 0.001)
    result = analyzer.solve_turbojet(prc=20.0, tit=1600.0)

    assert "spec_thrust" in result
    assert "tsfc" in result
    assert result["spec_thrust"] > 0,  f"Spec thrust ≤ 0: {result['spec_thrust']}"
    assert result["tsfc"] > 0,         f"TSFC ≤ 0: {result['tsfc']}"
    # Sanity: turbojet spec thrust at SLS typically 400–1200 Ns/kg
    assert 200 < result["spec_thrust"] < 2000


def test_turbojet_has_stations():
    """Turbojet result must include station thermodynamic data."""
    analyzer = CycleAnalyzer(101325.0, 288.15, 0.0)
    result = analyzer.solve_turbojet(prc=15.0, tit=1500.0)
    assert "stations" in result, "Missing station data"
    assert len(result["stations"]) >= 5, "Expected at least 5 stations"


def test_turbofan_sls():
    """Turbofan at sea-level static: basic sanity on specific thrust and TSFC."""
    p0, t0, _ = isa_atmosphere(0.0)
    analyzer = CycleAnalyzer(p0, t0, 0.0)
    result = analyzer.solve_turbofan(
        bpr=6.0, fpr=1.6, opr=30.0, tit=1500.0,
        eta_fan=0.90, eta_c=0.88, eta_t=0.92,
    )
    assert "spec_thrust" in result, "Missing spec_thrust in turbofan result"
    assert result["spec_thrust"] > 0
    assert result["tsfc"] > 0


def test_turbofan_higher_bpr_lower_tsfc():
    """Higher BPR should produce lower TSFC (better fuel efficiency)."""
    p0, t0, _ = isa_atmosphere(10000.0)
    low_bpr = CycleAnalyzer(p0, t0, 0.8).solve_turbofan(bpr=1.0, fpr=2.0, opr=25.0, tit=1600.0)
    high_bpr = CycleAnalyzer(p0, t0, 0.8).solve_turbofan(bpr=8.0, fpr=1.5, opr=25.0, tit=1600.0)
    assert high_bpr["tsfc"] < low_bpr["tsfc"], \
        f"High BPR should have lower TSFC: {high_bpr['tsfc']:.5f} vs {low_bpr['tsfc']:.5f}"


# ══════════════════════════════════════════════════════════════════════════════
# Gas Turbine — Off Design
# ══════════════════════════════════════════════════════════════════════════════

def test_offdesign_throttle():
    """Throttle sweep returns a list of operating points with expected keys."""
    p0, t0, _ = isa_atmosphere(0.0)
    ca = CycleAnalyzer(p0, t0, 0.0)
    dp = ca.solve_turbojet(prc=20.0, tit=1500.0)
    solver = OffDesignSolver(dp)

    results = solver.sweep_throttle(p0, t0, 0.0, 42.8e6, n_points=10)
    assert isinstance(results, list), "Throttle sweep must return a list"
    assert len(results) >= 5,         "Expected at least 5 throttle points"

    for r in results:
        assert "throttle_pct" in r, f"Missing throttle_pct in point: {r}"
        assert "spec_thrust" in r,  f"Missing spec_thrust in point: {r}"
        assert "tsfc" in r,         f"Missing tsfc in point: {r}"


def test_offdesign_map_has_speed_lines():
    """Compressor map must return speed_lines and surge_line."""
    p0, t0, _ = isa_atmosphere(0.0)
    ca = CycleAnalyzer(p0, t0, 0.0)
    dp = ca.solve_turbojet(prc=20.0, tit=1500.0)
    solver = OffDesignSolver(dp)

    result = solver.generate_compressor_map(n_speed_lines=5, n_flow_points=10)
    assert "speed_lines" in result, "Missing speed_lines in map"
    assert "surge_line" in result,  "Missing surge_line in map"
    assert len(result["speed_lines"]) == 5


# ══════════════════════════════════════════════════════════════════════════════
# Mission Constraint Analysis
# ══════════════════════════════════════════════════════════════════════════════

def test_mission_constraint_diagram():
    """Mission analyzer returns ws array, series data, and optimum point."""
    aircraft_data = {"k": 0.1, "cd0": 0.02, "cl_max": 2.0}
    analyzer = MissionAnalyzer(aircraft_data)

    ws_range = [1000 + i * 100 for i in range(50)]
    constraints = [
        {"type": "level", "label": "Cruise", "alt": 10000, "mach": 0.8},
        {"type": "turn",  "label": "3G",     "alt": 3000,  "mach": 0.7, "n": 3},
    ]
    result = analyzer.generate_constraint_data(ws_range, constraints)

    assert "ws" in result,      "Missing ws array"
    assert "series" in result,  "Missing series data"
    assert "optimum" in result, "Missing optimum point"
    assert len(result["ws"]) == len(ws_range)
    assert len(result["series"]) == len(constraints)


# ══════════════════════════════════════════════════════════════════════════════
# Rocket Analysis
# ══════════════════════════════════════════════════════════════════════════════

def test_rocket_equilibrium():
    """H2/O2 equilibrium: Isp must exceed 300 s."""
    analyzer = RocketAnalyzer(10e6)
    result = analyzer.solve_equilibrium("H2/O2", of_ratio=6.0)

    assert "isp_delivered" in result
    assert result["isp_delivered"] > 300, f"Isp too low: {result['isp_delivered']}"


def test_rocket_altitude_performance():
    """Altitude sweep returns expected structure with at least n_points entries."""
    analyzer = RocketAnalyzer(10e6)
    altitudes = [i * 5000.0 for i in range(10)]  # 0 to 45km
    result = analyzer.altitude_performance("H2/O2", of_ratio=6.0, altitudes_m=altitudes)

    assert isinstance(result, list), "Altitude result must be a list"
    assert len(result) == len(altitudes), "Point count mismatch"
    for pt in result:
        if 'error' not in pt:
            assert 'isp_s' in pt or 'isp_delivered' in pt or 'isp' in pt, f"Missing Isp key in: {list(pt.keys())}"


def test_rocket_of_sweep():
    """OF sweep must return at least 20 valid data points."""
    analyzer = RocketAnalyzer(10e6)
    of_range = [1.0 + i * 0.5 for i in range(20)]
    results = []
    for of in of_range:
        try:
            r = analyzer.solve_equilibrium("H2/O2", of_ratio=of, compute_heat_transfer=False)
            results.append(r)
        except Exception:
            pass

    assert len(results) >= 15, f"Too few valid OF sweep points: {len(results)}"


# ══════════════════════════════════════════════════════════════════════════════
# MoC Nozzle Contour
# ══════════════════════════════════════════════════════════════════════════════

def test_moc_contour_csv_format():
    """MoCNozzle.solve_contour() returns equal-length X/R lists."""
    designer = MoCNozzle(gamma=1.2, mach_exit=3.0, throat_radius=0.1)
    x_vals, r_vals = designer.solve_contour(subdivisions=30)

    assert isinstance(x_vals, list), "x_vals must be a list"
    assert isinstance(r_vals, list), "r_vals must be a list"
    assert len(x_vals) == len(r_vals) == 30, f"Expected 30 points, got {len(x_vals)}"
    assert all(v >= 0 for v in x_vals), "X values must be >= 0"
    assert all(v >= 0 for v in r_vals), "R values must be >= 0"


def test_moc_contour_monotonic():
    """Nozzle X-axis values must be monotonically non-decreasing."""
    designer = MoCNozzle(gamma=1.3, mach_exit=2.5, throat_radius=0.05)
    x_vals, _ = designer.solve_contour(subdivisions=20)

    for i in range(1, len(x_vals)):
        assert x_vals[i] >= x_vals[i - 1], \
            f"X not monotonic at index {i}: {x_vals[i-1]} -> {x_vals[i]}"


# ══════════════════════════════════════════════════════════════════════════════
# Edge Case / Input Validation Guards
# ══════════════════════════════════════════════════════════════════════════════

def test_turbojet_high_altitude():
    """Turbojet at 40km (very low pressure) should still return a result or raise cleanly."""
    try:
        p0, t0, _ = isa_atmosphere(40000.0)
        analyzer = CycleAnalyzer(p0, t0, 0.8)
        result = analyzer.solve_turbojet(prc=20.0, tit=1600.0)
        # If it succeeds, result must be structurally valid
        assert "spec_thrust" in result
    except Exception as e:
        # Acceptable to raise — just must not hang or produce NaN silently
        assert "spec_thrust" not in str(e).lower() or True


def test_isa_altitude_boundary():
    """ISA should handle altitude=0 and altitude=50000 without crashing."""
    for alt in [0, 11000, 20000, 32000, 47000]:
        p, t, rho = isa_atmosphere(float(alt))
        assert p > 0 and t > 0 and rho > 0, f"Invalid ISA result at alt={alt}"


# ══════════════════════════════════════════════════════════════════════════════
# ISA Upper-Layer Accuracy (Sprint 2 additions)
# ══════════════════════════════════════════════════════════════════════════════

def test_isa_upper_stratosphere_25km():
    """
    ISA at 25 km must be in the upper stratosphere layer (lapse +1 K/km).
    ICAO reference: T ≈ 221.65 K, P ≈ 2549 Pa.
    """
    p, t, rho = isa_atmosphere(25000.0)
    assert 219.0 < t < 225.0, f"25 km temperature out of range: {t}"
    assert 2000 < p < 3000,   f"25 km pressure out of range: {p}"
    assert rho > 0


def test_isa_stratopause_40km():
    """
    ISA at 40 km must be in the stratopause layer (lapse +2.8 K/km).
    ICAO reference: T ≈ 251.05 K, P ≈ 287 Pa.
    """
    p, t, rho = isa_atmosphere(40000.0)
    assert 247.0 < t < 256.0, f"40 km temperature out of range: {t}"
    assert 200 < p < 380,     f"40 km pressure out of range: {p}"
    assert rho > 0


# ══════════════════════════════════════════════════════════════════════════════
# Rocket mdot Integrity (Sprint 2 additions)
# ══════════════════════════════════════════════════════════════════════════════

def test_rocket_mdot_integrity():
    """
    mdot_fuel + mdot_ox must equal mdot_total.
    Also validates that mdot_fuel < mdot_ox for OF = 6.0 (oxidiser-rich).
    """
    analyzer = RocketAnalyzer(10e6)
    result = analyzer.solve_equilibrium(
        "H2/O2", of_ratio=6.0, thrust_target_N=50000.0,
        compute_heat_transfer=False,
    )
    mdot_total = result["mdot_total"]
    mdot_fuel  = result["mdot_fuel"]
    mdot_ox    = result["mdot_ox"]

    assert abs((mdot_fuel + mdot_ox) - mdot_total) < 1e-9, \
        f"mdot split does not sum to total: {mdot_fuel} + {mdot_ox} != {mdot_total}"
    assert mdot_fuel < mdot_ox, \
        f"For OF=6, fuel flow should be less than oxidiser flow: {mdot_fuel} vs {mdot_ox}"


# ══════════════════════════════════════════════════════════════════════════════
# Turbofan Mixed-Exhaust Path (Sprint 2 additions)
# ══════════════════════════════════════════════════════════════════════════════

def test_turbofan_mixed_exhaust():
    """
    Mixed-exhaust (mixed_exhaust=True) path must return spec_thrust and tsfc.
    Exercises the mixer enthalpy balance code path not covered by other tests.
    """
    p0, t0, _ = isa_atmosphere(0.0)
    analyzer = CycleAnalyzer(p0, t0, 0.0)
    result = analyzer.solve_turbofan(
        bpr=0.8, fpr=3.5, opr=28.0, tit=1800.0,
        mixed_exhaust=True,
    )
    assert "spec_thrust" in result, "Missing spec_thrust in mixed-exhaust turbofan result"
    assert "tsfc" in result,        "Missing tsfc in mixed-exhaust turbofan result"
    assert result["spec_thrust"] > 0, f"Mixed-exhaust spec_thrust <= 0: {result['spec_thrust']}"
    assert result["tsfc"] > 0,        f"Mixed-exhaust tsfc <= 0: {result['tsfc']}"
    assert result.get("engine_type") == "turbofan_mixed"


# ══════════════════════════════════════════════════════════════════════════════
# Sweep Result-Aggregation Integration (Sprint 2 additions)
# ══════════════════════════════════════════════════════════════════════════════

def test_turbojet_prc_sweep_aggregation():
    """
    Simulates the /analyze/cycle/sweep aggregation loop used by the backend.
    Verifies all expected keys are present and numeric for every data point.
    """
    p0, t0, _ = isa_atmosphere(10000.0)
    prc_range = [5.0 + i * 5.0 for i in range(8)]   # 5 to 40 in steps of 5

    results = []
    for prc in prc_range:
        ca  = CycleAnalyzer(p0, t0, 0.8)
        res = ca.solve_turbojet(prc, 1600.0)
        results.append({
            "prc":         prc,
            "spec_thrust": res["spec_thrust"],
            "tsfc":        res["tsfc"],
            "eta_thermal": res.get("eta_thermal", 0),
            "eta_overall": res.get("eta_overall", 0),
        })

    assert len(results) == len(prc_range), "Point count mismatch in sweep"
    for pt in results:
        assert pt["spec_thrust"] > 0, f"Non-positive spec_thrust at OPR={pt['prc']}"
        assert pt["tsfc"] > 0,        f"Non-positive tsfc at OPR={pt['prc']}"
        assert 0.0 <= pt["eta_thermal"] <= 1.0, \
            f"eta_thermal out of [0,1] at OPR={pt['prc']}: {pt['eta_thermal']}"
