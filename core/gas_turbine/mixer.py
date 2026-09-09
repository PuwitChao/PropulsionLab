"""Adiabatic frozen mixing of stagnation streams at a declared outlet pressure."""
from dataclasses import dataclass
import math
from .state import GasState,state_tp,frozen_state
from ..errors import InputValidationError,PhysicalInfeasibilityError


@dataclass(frozen=True)
class MixerResult:
    outlet: GasState
    mass_flow_kg_per_s: float
    energy_residual_w: float
    element_residuals_kg_per_s: tuple[tuple[str,float], ...]


def mix_streams(streams: list[tuple[GasState,float]], outlet_pressure_pa: float) -> MixerResult:
    """Mix positive mass flows without reaction. Pressure loss is prescribed, not predicted."""
    if not streams or not math.isfinite(outlet_pressure_pa) or outlet_pressure_pa <= 0:
        raise InputValidationError('A mixer requires streams and a positive finite outlet pressure.')
    masses, elements, total, energy = {},{},0.,0.
    for state,flow in streams:
        if not math.isfinite(flow) or flow <= 0:
            raise InputValidationError('Each mixer mass flow must be finite and positive.')
        if outlet_pressure_pa > state.pressure_pa:
            raise PhysicalInfeasibilityError('Mixer outlet pressure must not exceed any inlet pressure.')
        total += flow
        energy += flow*state.enthalpy_j_per_kg
        for name,y in state.mass_fractions:
            masses[name] = masses.get(name,0.)+flow*y
        for name,y in state.element_mass_fractions:
            elements[name] = elements.get(name,0.)+flow*y
    if not math.isfinite(total) or not math.isfinite(energy):
        raise InputValidationError('The mixer mass or energy sum exceeds the numerical range.')
    seed = state_tp(streams[0][0].temperature_k,outlet_pressure_pa,masses)
    outlet = frozen_state(seed,outlet_pressure_pa,enthalpy_j_per_kg=energy/total)
    residuals = tuple((name,total*y-elements[name]) for name,y in outlet.element_mass_fractions)
    return MixerResult(outlet,total,total*outlet.enthalpy_j_per_kg-energy,residuals)
