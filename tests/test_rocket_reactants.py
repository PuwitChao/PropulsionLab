"""Mass-based rocket reactants and explicit reference conditions."""
import cantera as ct
import pytest
from core.rocket.analyzer import RocketAnalyzer
from core.errors import InputValidationError


@pytest.mark.parametrize("propellant,ratio", [("H2/O2",6.), ("CH4/O2",3.5), ("RP1/O2",2.5), ("CH4/N2O",9.)])
def test_requested_mass_ratio_enters_chemistry(propellant, ratio):
    solver = RocketAnalyzer(10e6)
    result = solver.solve_equilibrium(propellant, ratio, compute_heat_transfer=False)
    state = result['reactants']
    prop = solver.propellants[propellant]
    y = state['mass_fractions']
    assert y[prop['ox']] / y[prop['fuel']] == pytest.approx(ratio, rel=1e-12)
    assert result['mdot_ox'] / result['mdot_fuel'] == pytest.approx(ratio)
    gas = ct.Solution('gri30.yaml')
    gas.TPY = state['temperature_k'], state['pressure_pa'], y
    assert gas.enthalpy_mass == pytest.approx(state['specific_enthalpy_j_per_kg'])
    assert result['h_chamber'] == pytest.approx(gas.enthalpy_mass, abs=1.)


@pytest.mark.parametrize("species", ['N2', 'H2', 'O2'])
def test_impurity_uses_fuel_stream_mass_and_adds_overlapping_species(species):
    result = RocketAnalyzer(10e6).solve_equilibrium('H2/O2', 6., impurity_species=species,
                  impurity_mass_frac=.1, compute_heat_transfer=False)
    expected = {'H2': .9/7, 'O2': 6/7}
    expected[species] = expected.get(species, 0) + .1/7
    assert result['reactants']['mass_fractions'] == pytest.approx(expected)
    assert sum(result['reactants']['mass_fractions'].values()) == pytest.approx(1.)


def test_nonzero_impurity_requires_species():
    with pytest.raises(InputValidationError):
        RocketAnalyzer(10e6).solve_equilibrium('H2/O2', 6., impurity_mass_frac=.1)


@pytest.mark.parametrize('mode', ['shifting', 'frozen'])
def test_cold_exit_rejected_before_performance(mode):
    from core.errors import ModelDomainError
    with pytest.raises(ModelDomainError) as caught:
        RocketAnalyzer(10e6).solve_equilibrium('H2/O2', .5, mode=mode)
    assert caught.value.details['station'] == 'nozzle exit'
    assert caught.value.details['temperature_k'] < 300
    assert caught.value.details['minimum_temperature_k'] == 300


def test_temperature_floor_includes_boundary():
    gas = ct.Solution('gri30.yaml')
    gas.TP = 300, 101325
    RocketAnalyzer._check_temperature_floor(gas, 'test boundary')
