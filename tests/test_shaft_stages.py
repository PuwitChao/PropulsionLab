"""Analytic stage limits and separate HP/LP shaft work checks for GT-D."""
import pytest
from core.gas_turbine.state import state_tp,methane_air_state
from core.gas_turbine.methane import methane_burner
from core.gas_turbine.shaft import compressor,turbine,match_turbine
from core.errors import InputValidationError,PhysicalInfeasibilityError,ConvergenceError


@pytest.mark.parametrize('efficiency',[1.,.85])
def test_argon_compressor_analytic(efficiency):
    inlet=state_tp(300,1e5,{'AR':1})
    stage=compressor(inlet,4e5,efficiency)
    ideal_t=300*4**((inlet.gamma-1)/inlet.gamma)
    expected=300+(ideal_t-300)/efficiency
    assert stage.outlet.temperature_k == pytest.approx(expected,rel=1e-7)
    assert stage.work_j_per_kg_gas == pytest.approx(inlet.cp_j_per_kg_k*(expected-300),rel=1e-7)
    assert abs(stage.energy_residual_j_per_kg_gas)<.1
    assert stage.outlet.entropy_j_per_kg_k >= inlet.entropy_j_per_kg_k-1e-5


@pytest.mark.parametrize('efficiency',[1.,.85])
def test_argon_turbine_analytic(efficiency):
    inlet=state_tp(1600,8e5,{'AR':1})
    stage=turbine(inlet,2e5,efficiency)
    ideal_t=1600*(.25)**((inlet.gamma-1)/inlet.gamma)
    expected=1600-efficiency*(1600-ideal_t)
    assert stage.outlet.temperature_k == pytest.approx(expected,rel=1e-7)
    assert stage.work_j_per_kg_gas == pytest.approx(inlet.cp_j_per_kg_k*(1600-expected),rel=1e-7)
    assert abs(stage.energy_residual_j_per_kg_gas)<.1
    assert stage.outlet.entropy_j_per_kg_k >= inlet.entropy_j_per_kg_k-1e-5


def test_two_shafts_close_with_product_mass_and_mechanical_loss():
    air=methane_air_state(300,1e5,0)
    lp=compressor(air,2e5,.9)
    hp=compressor(lp.outlet,1e6,.88)
    burner=methane_burner(hp.outlet,1800,9.5e5)
    mass=1+burner.fuel_air_ratio
    hpt=match_turbine(burner.products,hp.work_j_per_kg_gas,2e5,gas_mass_per_core_air=mass,
                      isentropic_efficiency=.9,mechanical_efficiency=.98)
    lpt=match_turbine(hpt.stage.outlet,lp.work_j_per_kg_gas,1e5,gas_mass_per_core_air=mass,
                      isentropic_efficiency=.91,mechanical_efficiency=.97)
    for shaft in (hpt,lpt):
        assert abs(shaft.residual_j_per_kg_core_air)<=.1+1e-6*shaft.demand_j_per_kg_core_air
        assert shaft.delivered_j_per_kg_core_air == pytest.approx(shaft.stage.work_j_per_kg_gas*mass*shaft.mechanical_efficiency)
        assert dict(shaft.stage.outlet.mass_fractions)==pytest.approx(dict(burner.products.mass_fractions))
    assert burner.products.pressure_pa>hpt.stage.outlet.pressure_pa>lpt.stage.outlet.pressure_pa


def test_zero_shaft_demand_preserves_state():
    inlet=state_tp(1000,4e5,{'AR':1})
    result=match_turbine(inlet,0,1e5,gas_mass_per_core_air=1,isentropic_efficiency=.9)
    assert result.stage.outlet is inlet
    assert result.residual_j_per_kg_core_air==0


def test_unavailable_work_and_exhaustion_fail():
    inlet=state_tp(1000,4e5,{'AR':1})
    with pytest.raises(PhysicalInfeasibilityError):
        match_turbine(inlet,1e8,1e5,gas_mass_per_core_air=1,isentropic_efficiency=.9)
    with pytest.raises(ConvergenceError):
        match_turbine(inlet,50000,1e5,gas_mass_per_core_air=1,isentropic_efficiency=.9,max_iterations=1)


@pytest.mark.parametrize('efficiency',[0,1.1,float('nan')])
def test_invalid_efficiencies_fail(efficiency):
    with pytest.raises(InputValidationError):
        compressor(state_tp(300,1e5,{'AR':1}),2e5,efficiency)
