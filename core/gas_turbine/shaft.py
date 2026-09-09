"""Frozen compressor and turbine stages with explicit isentropic efficiencies."""
from dataclasses import dataclass
import math
from .state import GasState, frozen_state
from ..errors import InputValidationError, PhysicalInfeasibilityError, ConvergenceError


@dataclass(frozen=True)
class StageResult:
    outlet: GasState
    isentropic_outlet: GasState
    work_j_per_kg_gas: float
    energy_residual_j_per_kg_gas: float


@dataclass(frozen=True)
class ShaftResult:
    stage: StageResult
    demand_j_per_kg_core_air: float
    delivered_j_per_kg_core_air: float
    residual_j_per_kg_core_air: float
    gas_mass_per_core_air: float
    mechanical_efficiency: float
    iterations: int


def _efficiency(value):
    if not math.isfinite(value) or not 0 < value <= 1:
        raise InputValidationError('Efficiency must be in (0, 1].')


def _pressure(value):
    if not math.isfinite(value) or value <= 0:
        raise InputValidationError('Pressure must be finite and positive.')


def compressor(inlet: GasState, outlet_pressure_pa: float, isentropic_efficiency: float) -> StageResult:
    """Return positive compressor input work per kg of gas. No polytropic conversion is implied."""
    _pressure(outlet_pressure_pa)
    _efficiency(isentropic_efficiency)
    if outlet_pressure_pa < inlet.pressure_pa:
        raise PhysicalInfeasibilityError('Compressor outlet pressure must not be below inlet pressure.')
    ideal = frozen_state(inlet,outlet_pressure_pa,entropy_j_per_kg_k=inlet.entropy_j_per_kg_k)
    work = (ideal.enthalpy_j_per_kg-inlet.enthalpy_j_per_kg)/isentropic_efficiency
    outlet = frozen_state(inlet,outlet_pressure_pa,enthalpy_j_per_kg=inlet.enthalpy_j_per_kg+work)
    return StageResult(outlet,ideal,work,outlet.enthalpy_j_per_kg-inlet.enthalpy_j_per_kg-work)


def turbine(inlet: GasState, outlet_pressure_pa: float, isentropic_efficiency: float) -> StageResult:
    """Return positive turbine output work per kg of gas, before shaft mechanical loss."""
    _pressure(outlet_pressure_pa)
    _efficiency(isentropic_efficiency)
    if outlet_pressure_pa > inlet.pressure_pa:
        raise PhysicalInfeasibilityError('Turbine outlet pressure must not exceed inlet pressure.')
    ideal = frozen_state(inlet,outlet_pressure_pa,entropy_j_per_kg_k=inlet.entropy_j_per_kg_k)
    work = (inlet.enthalpy_j_per_kg-ideal.enthalpy_j_per_kg)*isentropic_efficiency
    outlet = frozen_state(inlet,outlet_pressure_pa,enthalpy_j_per_kg=inlet.enthalpy_j_per_kg-work)
    return StageResult(outlet,ideal,work,inlet.enthalpy_j_per_kg-outlet.enthalpy_j_per_kg-work)


def match_turbine(inlet: GasState, demand_j_per_kg_core_air: float, minimum_pressure_pa: float, *,
                  gas_mass_per_core_air: float, isentropic_efficiency: float,
                  mechanical_efficiency: float = 1., max_iterations: int = 64) -> ShaftResult:
    """Match shaft demand with a bounded outlet pressure. All shaft quantities use core-air mass."""
    _pressure(minimum_pressure_pa)
    _efficiency(isentropic_efficiency)
    _efficiency(mechanical_efficiency)
    if not math.isfinite(demand_j_per_kg_core_air) or demand_j_per_kg_core_air < 0:
        raise InputValidationError('Shaft demand must be finite and nonnegative.')
    if not math.isfinite(gas_mass_per_core_air) or gas_mass_per_core_air <= 0:
        raise InputValidationError('Gas mass per core-air mass must be finite and positive.')
    if minimum_pressure_pa > inlet.pressure_pa:
        raise PhysicalInfeasibilityError('Minimum turbine pressure exceeds inlet pressure.')
    if not isinstance(max_iterations,int) or max_iterations < 1:
        raise InputValidationError('Iteration limit must be a positive integer.')
    factor = gas_mass_per_core_air*mechanical_efficiency
    tolerance = .1+1e-6*demand_j_per_kg_core_air
    def result(stage,iterations):
        delivered = stage.work_j_per_kg_gas*factor
        return ShaftResult(stage,demand_j_per_kg_core_air,delivered,delivered-demand_j_per_kg_core_air,
                           gas_mass_per_core_air,mechanical_efficiency,iterations)
    if demand_j_per_kg_core_air == 0:
        return result(StageResult(inlet,inlet,0.,0.),0)
    capacity = turbine(inlet,minimum_pressure_pa,isentropic_efficiency)
    if capacity.work_j_per_kg_gas*factor < demand_j_per_kg_core_air:
        raise PhysicalInfeasibilityError('Shaft demand exceeds available turbine work within the pressure bound.',
            demand_j_per_kg_core_air=demand_j_per_kg_core_air,capacity_j_per_kg_core_air=capacity.work_j_per_kg_gas*factor)
    if abs(capacity.work_j_per_kg_gas*factor-demand_j_per_kg_core_air) <= tolerance:
        return result(capacity,0)
    low,high = math.log(minimum_pressure_pa),math.log(inlet.pressure_pa)
    for iteration in range(1,max_iterations+1):
        pressure = math.exp(.5*(low+high))
        matched = result(turbine(inlet,pressure,isentropic_efficiency),iteration)
        if abs(matched.residual_j_per_kg_core_air) <= tolerance:
            return matched
        if matched.residual_j_per_kg_core_air > 0:
            low = math.log(pressure)
        else:
            high = math.log(pressure)
    raise ConvergenceError('The shaft pressure root did not converge.', iterations=max_iterations,
                           residual_j_per_kg_core_air=matched.residual_j_per_kg_core_air)
