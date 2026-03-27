import pytest
from core.rocket.moc import MoCNozzle
from core.gas_turbine.cycle import CycleAnalyzer

def test_turbojet_sls():
    """Basic test for Turbojet Sea Level Static conditions."""
    # Sea level: 101325 Pa, 288.15 K, Mach 0.001 (approx static)
    analyzer = CycleAnalyzer(101325.0, 288.15, 0.001)
    result = analyzer.solve_turbojet(prc=20.0, tit=1600.0)
    
    assert "spec_thrust" in result
    assert "tsfc" in result
    assert result["spec_thrust"] > 0
    assert result["tsfc"] > 0

def test_rocket_equilibrium():
    """Basic test for Rocket Chemical Equilibrium."""
    from core.rocket.analyzer import RocketAnalyzer
    
    # pc = 10 MPa
    analyzer = RocketAnalyzer(10e6)
    result = analyzer.solve_equilibrium("H2/O2", of_ratio=6.0)
    
    assert "isp_delivered" in result
    assert result["isp_delivered"] > 300  # Typical H2/O2 Isp


def test_moc_contour_csv_format():
    """Validates that MoCNozzle.solve_contour() returns valid, equal-length X/R lists."""
    designer = MoCNozzle(gamma=1.2, mach_exit=3.0, throat_radius=0.1)
    x_vals, r_vals = designer.solve_contour(subdivisions=30)

    # Both outputs must be present and equal length
    assert isinstance(x_vals, list), "x_vals must be a list"
    assert isinstance(r_vals, list), "r_vals must be a list"
    assert len(x_vals) == len(r_vals) == 30, "Must have exactly 30 points"

    # All values must be finite and non-negative
    assert all(v >= 0 for v in x_vals), "All X values must be >= 0"
    assert all(v >= 0 for v in r_vals), "All R values must be >= 0"


def test_moc_contour_monotonic():
    """Validates that nozzle X-axis values are monotonically non-decreasing."""
    designer = MoCNozzle(gamma=1.3, mach_exit=2.5, throat_radius=0.05)
    x_vals, _ = designer.solve_contour(subdivisions=20)

    for i in range(1, len(x_vals)):
        assert x_vals[i] >= x_vals[i - 1], f"X not monotonic at index {i}: {x_vals[i - 1]} -> {x_vals[i]}"
