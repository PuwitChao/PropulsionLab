"""GT-E mass, element, and enthalpy closure tests."""
import pytest
from core.gas_turbine.state import state_tp,methane_air_state,frozen_state
from core.gas_turbine.methane import methane_burner,methane_afterburner
from core.gas_turbine.mixer import mix_streams
from core.errors import InputValidationError,PhysicalInfeasibilityError


def test_argon_mixing_matches_analytic_temperature():
    cold=state_tp(300,3e5,{'AR':1});hot=state_tp(1500,4e5,{'AR':1})
    result=mix_streams([(cold,2),(hot,1)],2.5e5)
    assert result.outlet.temperature_k==pytest.approx(700,abs=1e-5)
    assert result.mass_flow_kg_per_s==3
    assert abs(result.energy_residual_w)<.1


def test_mixed_products_then_reheat_conserve_streams():
    air=methane_air_state(650,1e6,0)
    burner=methane_burner(air,1600,9e5)
    cooled=frozen_state(burner.products,4e5,temperature_k=1000)
    mixed=mix_streams([(cooled,1+burner.fuel_air_ratio),(air,2.)],3e5)
    expected_mass=3+burner.fuel_air_ratio
    assert mixed.mass_flow_kg_per_s==pytest.approx(expected_mass)
    expected_y={}
    for state,flow in [(cooled,1+burner.fuel_air_ratio),(air,2.)]:
        for name,y in state.mass_fractions:
            expected_y[name]=expected_y.get(name,0)+flow*y/expected_mass
    assert dict(mixed.outlet.mass_fractions)==pytest.approx(expected_y)
    assert max(abs(v) for _,v in mixed.element_residuals_kg_per_s)<1e-8
    reheat=methane_afterburner(mixed.outlet,1800,2.8e5)
    fuel=state_tp(300,2.8e5,{'CH4':1})
    f=reheat.added_fuel_per_inlet_gas
    residual=(1+f)*reheat.products.enthalpy_j_per_kg-mixed.outlet.enthalpy_j_per_kg-f*fuel.enthalpy_j_per_kg
    assert abs(residual)<2
    assert max(abs(v) for _,v in reheat.element_residuals_kg_per_kg_inlet_gas)<1e-8
    assert reheat.outlet_mass_per_inlet_gas==1+f


def test_no_oxygen_for_reheat_fails():
    with pytest.raises(PhysicalInfeasibilityError):
        methane_afterburner(state_tp(1000,3e5,{'CO2':1}),1800,2e5)


@pytest.mark.parametrize('flow',[0,-1,float('nan')])
def test_invalid_flow_fails(flow):
    with pytest.raises(InputValidationError):
        mix_streams([(state_tp(300,1e5,{'AR':1}),flow)],1e5)


def test_mixer_pressure_gain_fails():
    with pytest.raises(PhysicalInfeasibilityError):
        mix_streams([(state_tp(300,1e5,{'AR':1}),1)],2e5)
