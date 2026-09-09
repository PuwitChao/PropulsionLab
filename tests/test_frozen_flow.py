"""Independent constant-cp limits and frozen flow conservation for GT-B."""
import math
import pytest
from core.gas_turbine.state import state_tp, methane_air_state
from core.gas_turbine.flow import freestream_total, convergent_nozzle
from core.errors import InputValidationError, PhysicalInfeasibilityError, ConvergenceError


@pytest.mark.parametrize('mach', [0., .8, 3.])
def test_argon_inlet_matches_constant_cp(mach):
    ambient = state_tp(300, 1e5, {'AR':1})
    result = freestream_total(ambient, mach)
    ratio = 1+.5*(ambient.gamma-1)*mach**2
    assert result.total.temperature_k == pytest.approx(300*ratio, rel=1e-7)
    assert result.total.pressure_pa == pytest.approx(1e5*ratio**(ambient.gamma/(ambient.gamma-1)), rel=1e-7)
    assert abs(result.energy_residual_j_per_kg) < .1


@pytest.mark.parametrize('pressure', [1e5, 3.5e5])
def test_argon_nozzle_matches_constant_cp(pressure):
    total = state_tp(1200, 4e5, {'AR':1})
    result = convergent_nozzle(total, pressure)
    critical = 4e5*(2/(total.gamma+1))**(total.gamma/(total.gamma-1))
    exit_pressure = max(pressure, critical)
    temperature = 1200*(exit_pressure/4e5)**((total.gamma-1)/total.gamma)
    velocity = math.sqrt(2*total.cp_j_per_kg_k*(1200-temperature))
    assert result.critical_pressure_pa == pytest.approx(critical, rel=1e-7)
    assert result.exit.temperature_k == pytest.approx(temperature, rel=1e-7)
    assert result.velocity_m_per_s == pytest.approx(velocity, rel=1e-7)
    assert result.choked == (pressure <= critical)


def test_hot_mixture_choke_continuity_and_composition():
    total = methane_air_state(2200, 1e6, .03)
    choked = convergent_nozzle(total, 1e5)
    below = convergent_nozzle(total, choked.critical_pressure_pa*(1-1e-6))
    above = convergent_nozzle(total, choked.critical_pressure_pa*(1+1e-6))
    assert below.choked and not above.choked
    assert above.velocity_m_per_s == pytest.approx(below.velocity_m_per_s, rel=2e-6)
    assert below.mach == pytest.approx(1., abs=1e-7)
    for result in (below, above):
        assert abs(result.energy_residual_j_per_kg) < .1
        assert result.exit.entropy_j_per_kg_k == pytest.approx(total.entropy_j_per_kg_k, abs=1e-5)
        assert dict(result.exit.mass_fractions) == pytest.approx(dict(total.mass_fractions))


def test_pressure_loss_preserves_total_energy():
    ambient = methane_air_state(288.15, 101325, 0.)
    ideal = freestream_total(ambient, 3)
    lossy = freestream_total(ambient, 3, .8)
    assert lossy.total.pressure_pa == pytest.approx(.8*ideal.total.pressure_pa)
    assert lossy.total.enthalpy_j_per_kg == pytest.approx(ideal.total.enthalpy_j_per_kg, abs=.1)
    assert lossy.total.entropy_j_per_kg_k > ideal.total.entropy_j_per_kg_k
    assert abs(lossy.energy_residual_j_per_kg) < .1


@pytest.mark.parametrize('pressure', [0., float('nan'), 4e5, 5e5])
def test_invalid_nozzle_pressure(pressure):
    total = state_tp(1000, 4e5, {'AR':1})
    with pytest.raises((InputValidationError, PhysicalInfeasibilityError)):
        convergent_nozzle(total, pressure)


def test_iteration_exhaustion_is_explicit():
    with pytest.raises(ConvergenceError):
        convergent_nozzle(methane_air_state(1800, 4e5, .02), 1e5, max_iterations=1)
