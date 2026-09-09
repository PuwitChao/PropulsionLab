"""Mass, element, inversion, and isolation checks for GT-A."""
from concurrent.futures import ThreadPoolExecutor
from dataclasses import FrozenInstanceError
import pytest
from core.gas_turbine.state import state_tp, methane_air_state, frozen_state
from core.errors import InputValidationError


@pytest.mark.parametrize('ratio', [0., .02, .06, .1])
def test_exact_fuel_air_mass_ratio(ratio):
    state = methane_air_state(700, 2e5, ratio)
    y = dict(state.mass_fractions)
    assert y.get('CH4',0)/(y['O2']+y['N2']) == pytest.approx(ratio, abs=1e-14)
    assert sum(y.values()) == pytest.approx(1.)


def test_mass_scale_and_analytical_element_conservation():
    a = state_tp(900, 3e5, {'CH4':1.,'O2':2.})
    b = state_tp(900, 3e5, {'CH4':10.,'O2':20.})
    assert a.enthalpy_j_per_kg == pytest.approx(b.enthalpy_j_per_kg)
    elements = dict(a.element_mass_fractions)
    assert elements['O'] == pytest.approx(2/3)
    assert elements['C'] + elements['H'] == pytest.approx(1/3)
    assert sum(elements.values()) == pytest.approx(1.)


def test_frozen_inversions_preserve_composition_elements_and_source():
    initial = methane_air_state(700, 2e5, .03)
    hot = frozen_state(initial, 4e5, temperature_k=1600)
    recovered = frozen_state(initial, 4e5, enthalpy_j_per_kg=hot.enthalpy_j_per_kg)
    isentropic = frozen_state(initial, 4e5, entropy_j_per_kg_k=initial.entropy_j_per_kg_k)
    assert recovered.temperature_k == pytest.approx(1600, abs=1e-5)
    assert recovered.enthalpy_j_per_kg == pytest.approx(hot.enthalpy_j_per_kg, abs=.1)
    assert isentropic.entropy_j_per_kg_k == pytest.approx(initial.entropy_j_per_kg_k, abs=1e-5)
    for state in (hot,recovered,isentropic):
        assert dict(state.mass_fractions) == pytest.approx(dict(initial.mass_fractions), abs=1e-14)
        assert dict(state.element_mass_fractions) == pytest.approx(dict(initial.element_mass_fractions), abs=1e-14)
    assert initial.temperature_k == 700
    with pytest.raises(FrozenInstanceError):
        initial.temperature_k = 800


def test_parallel_calls_cannot_mutate_other_states():
    base = methane_air_state(500, 1e5, .02)
    temps = [600., 1000., 1800., 800.]
    with ThreadPoolExecutor(max_workers=4) as pool:
        states = list(pool.map(lambda t:frozen_state(base, 2e5, temperature_k=t), temps))
    assert [s.temperature_k for s in states] == pytest.approx(temps)
    assert base.temperature_k == 500


@pytest.mark.parametrize('masses', [{}, {'CH4':-1}, {'CH4':0}, {'fake':1}, {'CH4':float('nan')}])
def test_invalid_species_masses_fail(masses):
    with pytest.raises(InputValidationError):
        state_tp(300, 1e5, masses)


def test_ambiguous_inversion_fails():
    state = methane_air_state(300, 1e5, 0)
    with pytest.raises(InputValidationError):
        frozen_state(state, 2e5, temperature_k=500, enthalpy_j_per_kg=0)
