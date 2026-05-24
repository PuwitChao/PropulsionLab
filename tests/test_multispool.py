"""
Multi-spool turbofan work-matching solver tests.
Run with: pytest tests/test_multispool.py -v
"""
import sys
import os
import math

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.units import isa_atmosphere
from core.gas_turbine.cycle import CycleAnalyzer


def _make_analyzer(alt=0.0, mach=0.0):
    p0, t0, _ = isa_atmosphere(alt)
    return CycleAnalyzer(p0, t0, mach)


def test_multispool_returns_expected_keys():
    """solve_multispool must return spec_thrust, tsfc and station data."""
    ca = _make_analyzer()
    result = ca.solve_multispool(
        opr=32.0, bpr=0.3, fpr=3.5, lpc_pr=4.0, tit=1850.0
    )
    for key in ('spec_thrust', 'tsfc', 'engine_type', 'stations', 'math_trace'):
        assert key in result, f"Missing key: {key}"
    assert result['engine_type'] == 'multispool_turbofan'


def test_multispool_positive_performance():
    """Spec thrust and TSFC must be positive for a valid military turbofan design."""
    ca = _make_analyzer()
    result = ca.solve_multispool(
        opr=32.0, bpr=0.3, fpr=3.5, lpc_pr=4.0, tit=1850.0
    )
    assert result['spec_thrust'] > 0, f"spec_thrust ≤ 0: {result['spec_thrust']}"
    assert result['tsfc'] > 0, f"TSFC ≤ 0: {result['tsfc']}"


def test_multispool_stations_populated():
    """All major stations (2, 21, 25, 3, 4, 45, 5) must be in the result."""
    ca = _make_analyzer()
    result = ca.solve_multispool(
        opr=32.0, bpr=0.3, fpr=3.5, lpc_pr=4.0, tit=1850.0
    )
    for station in (2, 21, 25, 3, 4, 45, 5):
        assert station in result['stations'], f"Station {station} missing"
        assert 'tt' in result['stations'][station], f"Station {station} missing tt"
        assert 'pt' in result['stations'][station], f"Station {station} missing pt"


def test_multispool_temperature_progression():
    """Temperatures must increase from inlet to combustor exit, then decrease through turbines."""
    ca = _make_analyzer()
    result = ca.solve_multispool(
        opr=32.0, bpr=0.3, fpr=3.5, lpc_pr=4.0, tit=1850.0
    )
    s = result['stations']
    assert s[3]['tt'] > s[2]['tt'], "HPC exit must be hotter than inlet"
    assert s[4]['tt'] > s[3]['tt'], "Combustor exit must be hotter than HPC"
    assert s[5]['tt'] < s[4]['tt'], "LPT exit must be cooler than combustor"
    assert s[45]['tt'] < s[4]['tt'], "HPT exit must be cooler than combustor"


def test_multispool_efficiencies_valid():
    """Thermal and overall efficiency must be in (0, 1) at cruise (v0 > 0)."""
    # Static conditions (Mach=0) give eta_prop=0 by definition, so test at cruise.
    ca = _make_analyzer(alt=10000.0, mach=0.9)
    result = ca.solve_multispool(opr=28.0, bpr=1.0, fpr=3.0, lpc_pr=3.5, tit=1750.0)
    eta_th = result.get('eta_thermal', 0)
    eta_oa = result.get('eta_overall', 0)
    assert 0.0 < eta_th < 1.0, f"Thermal efficiency out of range: {eta_th}"
    assert 0.0 < eta_oa < 1.0, f"Overall efficiency out of range: {eta_oa}"


def test_multispool_higher_tit_higher_thrust():
    """Increasing TIT (at fixed geometry) must increase specific thrust."""
    ca_lo = _make_analyzer()
    ca_hi = _make_analyzer()
    lo = ca_lo.solve_multispool(opr=30.0, bpr=0.3, fpr=3.5, lpc_pr=4.0, tit=1600.0)
    hi = ca_hi.solve_multispool(opr=30.0, bpr=0.3, fpr=3.5, lpc_pr=4.0, tit=1900.0)
    assert hi['spec_thrust'] > lo['spec_thrust'], (
        f"Higher TIT should give more thrust: {hi['spec_thrust']:.1f} vs {lo['spec_thrust']:.1f}"
    )


def test_multispool_math_trace_populated():
    """math_trace must have at least one entry per major component."""
    ca = _make_analyzer()
    result = ca.solve_multispool(
        opr=32.0, bpr=0.3, fpr=3.5, lpc_pr=4.0, tit=1850.0
    )
    assert len(result['math_trace']) >= 4, "Expected at least 4 math trace entries"


def test_multispool_high_alt_cruise():
    """solve_multispool must work at cruise conditions (10 km, Mach 0.9)."""
    ca = _make_analyzer(alt=10000.0, mach=0.9)
    result = ca.solve_multispool(
        opr=28.0, bpr=1.0, fpr=3.0, lpc_pr=3.5, tit=1750.0
    )
    assert result['spec_thrust'] > 0
    assert math.isfinite(result['tsfc'])
    assert math.isfinite(result['spec_thrust'])
