"""Frozen ideal-gas inlet and convergent nozzle helpers for GT-B."""
from dataclasses import dataclass
import math
from .state import GasState, frozen_state
from ..errors import InputValidationError, PhysicalInfeasibilityError, ConvergenceError


@dataclass(frozen=True)
class InletResult:
    total: GasState
    velocity_m_per_s: float
    energy_residual_j_per_kg: float
    ideal_total_pressure_pa: float


@dataclass(frozen=True)
class NozzleResult:
    exit: GasState
    velocity_m_per_s: float
    mach: float
    choked: bool
    critical_pressure_pa: float
    mass_flux_kg_per_m2_s: float
    energy_residual_j_per_kg: float
    sonic_residual_j_per_kg: float
    iterations: int


def _positive(value, name):
    if not math.isfinite(value) or value <= 0:
        raise InputValidationError(f'{name} must be finite and positive.')


def freestream_total(ambient: GasState, mach: float, pressure_recovery: float = 1.) -> InletResult:
    """Convert static energy to total enthalpy, then apply a total-pressure recovery."""
    if not math.isfinite(mach) or mach < 0:
        raise InputValidationError('Mach must be finite and nonnegative.')
    if not math.isfinite(pressure_recovery) or not 0 < pressure_recovery <= 1:
        raise InputValidationError('Pressure recovery must be in (0, 1].')
    velocity = mach * math.sqrt(ambient.gamma * ambient.gas_constant_j_per_kg_k * ambient.temperature_k)
    target = ambient.enthalpy_j_per_kg + .5 * velocity**2
    heated = frozen_state(ambient, ambient.pressure_pa, enthalpy_j_per_kg=target)
    # At fixed temperature and composition, ds = -R*d(ln p).
    ideal_pressure = ambient.pressure_pa * math.exp(
        (heated.entropy_j_per_kg_k - ambient.entropy_j_per_kg_k)/ambient.gas_constant_j_per_kg_k)
    total = frozen_state(heated, ideal_pressure*pressure_recovery, temperature_k=heated.temperature_k)
    return InletResult(total, velocity, total.enthalpy_j_per_kg-target, ideal_pressure)


def convergent_nozzle(total: GasState, ambient_pressure_pa: float, *, max_iterations: int = 64) -> NozzleResult:
    """Solve a frozen isentropic convergent nozzle. The choked exit is the throat."""
    _positive(ambient_pressure_pa, 'Ambient pressure')
    if ambient_pressure_pa >= total.pressure_pa:
        raise PhysicalInfeasibilityError('The nozzle requires total pressure above ambient pressure.')
    if not isinstance(max_iterations, int) or max_iterations < 1:
        raise InputValidationError('Iteration limit must be a positive integer.')
    r = total.gas_constant_j_per_kg_k

    def sonic_trial(temperature):
        state = frozen_state(total, total.pressure_pa, temperature_k=temperature)
        residual = total.enthalpy_j_per_kg-state.enthalpy_j_per_kg-.5*state.gamma*r*temperature
        return state, residual

    low, high = .5*total.temperature_k, total.temperature_k
    _, lower_residual = sonic_trial(low)
    if lower_residual <= 0:
        raise ConvergenceError('The sonic temperature is not bracketed.', lower_temperature_k=low)
    tolerance = 1e-4 + 1e-8*total.cp_j_per_kg_k*total.temperature_k
    for iteration in range(1, max_iterations+1):
        sonic, residual = sonic_trial(.5*(low+high))
        if abs(residual) <= tolerance:
            break
        if residual > 0:
            low = sonic.temperature_k
        else:
            high = sonic.temperature_k
    else:
        raise ConvergenceError('The sonic state did not converge.', iterations=max_iterations, residual_j_per_kg=residual)
    critical_pressure = total.pressure_pa * math.exp(
        (sonic.entropy_j_per_kg_k-total.entropy_j_per_kg_k)/r)
    choked = ambient_pressure_pa <= critical_pressure
    if choked:
        exit_state = frozen_state(sonic, critical_pressure, temperature_k=sonic.temperature_k)
    else:
        exit_state = frozen_state(total, ambient_pressure_pa, entropy_j_per_kg_k=total.entropy_j_per_kg_k)
    drop = total.enthalpy_j_per_kg-exit_state.enthalpy_j_per_kg
    if drop <= 0:
        raise PhysicalInfeasibilityError('No positive nozzle enthalpy drop is available.')
    velocity = math.sqrt(2*drop)
    mach = velocity/math.sqrt(exit_state.gamma*r*exit_state.temperature_k)
    return NozzleResult(exit_state, velocity, mach, choked, critical_pressure,
                        exit_state.density_kg_per_m3*velocity, drop-.5*velocity**2, residual, iteration)
