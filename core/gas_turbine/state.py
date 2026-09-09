"""Isolated GRI30 states for the explicit methane research model.

Enthalpy includes species formation energy. Do not add an independent LHV.
These helpers do not equilibrate mixtures or change the legacy cycle solver.
"""
from dataclasses import dataclass
import math
from collections.abc import Mapping
import cantera as ct
from ..errors import InputValidationError, DependencyError, ThermochemistryError


def _solution():
    try:
        return ct.Solution('gri30.yaml')
    except ct.CanteraError as exc:
        raise DependencyError('The GRI30 state mechanism is unavailable.') from exc


def _finite(value, name, positive=False):
    if not math.isfinite(value) or (positive and value <= 0):
        raise InputValidationError(f'{name} must be finite' + (' and positive.' if positive else '.'))


@dataclass(frozen=True)
class GasState:
    """Immutable SI snapshot. Composition is a tuple of species mass fractions."""
    temperature_k: float
    pressure_pa: float
    mass_fractions: tuple[tuple[str, float], ...]
    enthalpy_j_per_kg: float
    entropy_j_per_kg_k: float
    cp_j_per_kg_k: float
    cv_j_per_kg_k: float
    density_kg_per_m3: float
    molecular_weight_kg_per_kmol: float
    element_mass_fractions: tuple[tuple[str, float], ...]

    @property
    def gas_constant_j_per_kg_k(self):
        return ct.gas_constant / self.molecular_weight_kg_per_kmol

    @property
    def gamma(self):
        return self.cp_j_per_kg_k / self.cv_j_per_kg_k


def _snapshot(gas):
    return GasState(float(gas.T), float(gas.P),
        tuple((name, float(y)) for name, y in zip(gas.species_names, gas.Y) if y > 0),
        float(gas.enthalpy_mass), float(gas.entropy_mass), float(gas.cp_mass),
        float(gas.cv_mass), float(gas.density), float(gas.mean_molecular_weight),
        tuple((name, float(gas.elemental_mass_fraction(name))) for name in gas.element_names))


def state_tp(temperature_k: float, pressure_pa: float, species_masses: Mapping[str, float]) -> GasState:
    """Set a frozen mixture from nonnegative species masses on any common mass scale."""
    _finite(temperature_k, 'Temperature', True)
    _finite(pressure_pa, 'Pressure', True)
    masses = dict(species_masses)
    if not masses:
        raise InputValidationError('Species masses must not be empty.')
    for mass in masses.values():
        _finite(mass, 'Species mass')
        if mass < 0:
            raise InputValidationError('Species masses must be nonnegative.')
    total = math.fsum(masses.values())
    _finite(total, 'Total species mass', True)
    gas = _solution()
    if any(name not in gas.species_names for name in masses):
        raise InputValidationError('Species must exist in GRI30.')
    try:
        gas.TPY = temperature_k, pressure_pa, {name:mass/total for name,mass in masses.items()}
        return _snapshot(gas)
    except ct.CanteraError as exc:
        raise ThermochemistryError('The frozen thermodynamic state could not be evaluated.') from exc


def methane_air_state(temperature_k: float, pressure_pa: float, fuel_air_ratio: float) -> GasState:
    """Mix CH4 with dry O2/N2 air at an exact fuel/air mass ratio. No reaction occurs."""
    _finite(fuel_air_ratio, 'Fuel/air ratio')
    if fuel_air_ratio < 0:
        raise InputValidationError('Fuel/air ratio must be nonnegative.')
    gas = _solution()
    gas.X = 'O2:1,N2:3.76'
    masses = {name:float(y) for name,y in zip(gas.species_names,gas.Y) if y > 0}
    masses['CH4'] = fuel_air_ratio
    return state_tp(temperature_k, pressure_pa, masses)


def frozen_state(state: GasState, pressure_pa: float, *, temperature_k=None,
                 enthalpy_j_per_kg=None, entropy_j_per_kg_k=None) -> GasState:
    """Change one state coordinate and pressure while retaining composition."""
    coordinates = [temperature_k, enthalpy_j_per_kg, entropy_j_per_kg_k]
    if sum(value is not None for value in coordinates) != 1:
        raise InputValidationError('Specify exactly one of temperature, enthalpy, or entropy.')
    _finite(pressure_pa, 'Pressure', True)
    for value in coordinates:
        if value is not None:
            _finite(value, 'State coordinate')
    if temperature_k is not None and temperature_k <= 0:
        raise InputValidationError('Temperature must be positive.')
    gas = _solution()
    try:
        gas.TPY = state.temperature_k, state.pressure_pa, dict(state.mass_fractions)
        if temperature_k is not None:
            gas.TP = temperature_k, pressure_pa
        elif enthalpy_j_per_kg is not None:
            gas.HP = enthalpy_j_per_kg, pressure_pa
        else:
            gas.SP = entropy_j_per_kg_k, pressure_pa
        return _snapshot(gas)
    except ct.CanteraError as exc:
        raise ThermochemistryError('The frozen state inversion did not converge.') from exc
