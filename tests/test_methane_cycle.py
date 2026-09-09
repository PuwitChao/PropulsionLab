"""Methane research combustion and ramjet conservation gates."""
import pytest
from core.gas_turbine.state import methane_air_state
from core.gas_turbine.methane import methane_burner, methane_ramjet
from core.errors import PhysicalInfeasibilityError, ConvergenceError, InputValidationError


def test_burner_energy_elements_and_reaction():
    air = methane_air_state(700,1e6,0)
    result = methane_burner(air,1800,9e5)
    assert abs(result.energy_residual_j_per_kg_air) < 1
    assert max(abs(r) for _,r in result.element_residuals_kg_per_kg_air) < 1e-8
    y = dict(result.products.mass_fractions)
    assert y['CO2'] > .01 and y['H2O'] > .01
    assert y.get('CH4',0) < 1e-6
    assert 0 < result.fuel_air_ratio < .06
    assert air.temperature_k == 700


def test_explicit_heat_loss_requires_more_fuel():
    air = methane_air_state(700,1e6,0)
    ideal = methane_burner(air,1800,9e5)
    loss = methane_burner(air,1800,9e5,heat_loss_j_per_kg_air=1e5)
    assert loss.fuel_air_ratio > ideal.fuel_air_ratio


@pytest.mark.parametrize('target',[600,5000])
def test_unattainable_target_fails(target):
    with pytest.raises(PhysicalInfeasibilityError):
        methane_burner(methane_air_state(700,1e6,0),target,9e5)


def test_exhausted_fuel_root_fails():
    with pytest.raises(ConvergenceError):
        methane_burner(methane_air_state(700,1e6,0),1800,9e5,max_iterations=1)


def test_ramjet_mass_momentum_and_frozen_products():
    result = methane_ramjet(101325,288.15,3,2200,inlet_pressure_recovery=.8)
    assert result['model']=='methane_ramjet_research'
    assert result['status']=='OUTSIDE_VALIDATED_DOMAIN'
    assert result['eta_propulsive'] is None
    assert abs(result['inlet']['energy_residual_j_per_kg']) < .1
    assert abs(result['burner']['energy_residual_j_per_kg_air']) < 2
    nozzle = result['nozzle']
    mass = 1+result['f_total']
    assert result['exit_area_m2_per_kg_per_s_air']*nozzle['mass_flux_kg_per_m2_s'] == pytest.approx(mass)
    assert result['spec_thrust'] == pytest.approx(mass*nozzle['velocity_m_per_s']-result['inlet']['velocity_m_per_s']+result['pressure_thrust_n_per_kg_per_s_air'])
    assert dict(nozzle['exit']['mass_fractions']) == pytest.approx(dict(result['burner']['products']['mass_fractions']))


def test_bad_loss_rejected():
    with pytest.raises(InputValidationError):
        methane_ramjet(101325,288.15,3,2200,nozzle_pressure_loss=1.)
