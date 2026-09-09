"""Check diagnostic evidence without accepting legacy residuals as targets."""
import pytest
from tools.audit_cycle_energy import audit_case, proxy_state
from core.gas_turbine.cycle import get_gas_props
from core.solver_result import require_finite


@pytest.mark.parametrize('ratio', [0., .02, .06])
def test_audit_proxy_matches_current_property_helper(ratio):
    gas = proxy_state(1800., 5e5, ratio)
    gamma, cp, mw = get_gas_props(1800., 5e5, ratio)
    assert (gamma, cp, mw) == pytest.approx((gas.cp_mass/gas.cv_mass, gas.cp_mass, gas.mean_molecular_weight))


def test_energy_audit_retains_measured_failure_and_power_terms():
    row = audit_case(0, 3)
    require_finite(row)
    assert row['jet_minus_useful_power_j_per_kg_air'] == pytest.approx(
        row['jet_power_j_per_kg_air'] - row['useful_power_j_per_kg_air'])
    if row['solver_status'] == 'NUMERICAL_FAILURE':
        assert row['reported_efficiencies']['eta_propulsive'] is None
        assert row['diagnostic_outputs']
    assert row['requested_fuel_air_ratio'] > 0
    assert row['property_proxy_fuel_air_ratio'] > 0
