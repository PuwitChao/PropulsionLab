"""Temperature limits and mechanism continuity for rocket thermochemistry."""
import cantera as ct
import pytest
from core.errors import ModelDomainError
from core.gas_turbine.state import _snapshot, frozen_state, state_tp
from core.gas_turbine.flow import convergent_nozzle
from core.rocket.analyzer import RocketAnalyzer


@pytest.mark.parametrize('temperature', [300., 5000.])
def test_temperature_endpoints_are_included(temperature):
    gas = ct.Solution('gri30_highT.yaml')
    gas.TP = temperature, 1e6
    RocketAnalyzer._check_temperature_domain(gas, 'boundary')


@pytest.mark.parametrize('temperature', [299.999, 5000.001])
def test_extrapolated_temperature_is_rejected(temperature):
    gas = ct.Solution('gri30_highT.yaml')
    gas.TP = temperature, 1e6
    with pytest.raises(ModelDomainError) as caught:
        RocketAnalyzer._check_temperature_domain(gas, 'boundary')
    assert caught.value.details['minimum_temperature_k'] == 300
    assert caught.value.details['maximum_temperature_k'] == 5000
    assert caught.value.status == 'OUTSIDE_MODEL_DOMAIN'


def test_frozen_throat_retains_high_temperature_properties():
    gas = ct.Solution('gri30_highT.yaml')
    gas.TPY = 300, 1e7, {'H2': 1, 'O2': 6}
    gas.equilibrate('HP')
    total = _snapshot(gas, 'gri30_highT.yaml')
    throat = convergent_nozzle(total, 1e6)
    assert throat.exit.mechanism == 'gri30_highT.yaml'
    gas.TPY = throat.exit.temperature_k, throat.exit.pressure_pa, dict(throat.exit.mass_fractions)
    assert throat.exit.enthalpy_j_per_kg == pytest.approx(gas.enthalpy_mass, abs=1e-6)
    assert throat.mach == pytest.approx(1, abs=1e-7)
    with pytest.raises(ModelDomainError):
        frozen_state(total, 1e7, temperature_k=5001)
    assert state_tp(300, 101325, {'N2': 1}).mechanism == 'gri30.yaml'


@pytest.mark.parametrize('mode', ['frozen', 'shifting'])
def test_rocket_reports_actual_mechanism(mode):
    result = RocketAnalyzer(1e7).solve_equilibrium('H2/O2', 6, mode=mode, compute_heat_transfer=False)
    assert result['reactants']['mechanism'] == 'gri30_highT.yaml'
    assert result['assurance']['solver']['mechanism'] == 'gri30_highT.yaml'
    assert 3500 < result['t_chamber'] < 5000
    assert 300 <= result['t_exit'] <= 5000
    assert 300 <= result['throat']['temperature_k'] <= 5000
