"""
Shared gas turbine thermodynamic and isentropic/polytropic helper functions.
"""

import math
from ..errors import PhysicalInfeasibilityError, InputValidationError


def poly_to_isen_comp(prc: float, eta_poly: float, g: float) -> float:
    """
    Compressor isentropic efficiency from polytropic efficiency.

    Args:
        prc: Compressor pressure ratio.
        eta_poly: Polytropic efficiency.
        g: Ratio of specific heats (gamma).

    Returns:
        float: Isentropic efficiency.
    """
    exp = (g - 1.0) / g
    ideal = prc ** exp - 1.0
    actual = prc ** (exp / eta_poly) - 1.0
    return ideal / actual if actual != 0 else 1.0


def poly_to_isen_turb(tau_t: float, eta_poly: float, g: float) -> float:
    """
    Turbine isentropic efficiency from polytropic efficiency & temp ratio.

    Args:
        tau_t: Temperature ratio across turbine (T_exit / T_inlet).
        eta_poly: Polytropic efficiency.
        g: Ratio of specific heats (gamma).

    Returns:
        float: Isentropic efficiency.
    """
    if not 0 < tau_t <= 1 or not 0 < eta_poly <= 1:
        raise PhysicalInfeasibilityError('Turbine temperature ratio must be in (0, 1].', tau_t=tau_t)
    if abs(1.0 - tau_t) < 1e-9:
        return eta_poly
    return (1.0 - tau_t) / (1.0 - tau_t ** (1.0 / eta_poly))



def nozzle_exit(pt_in: float, tt_in: float, p_amb: float, g: float, r: float) -> tuple[float, float, float, float]:
    """
    Calculate choked/unchoked nozzle exit conditions.

    Args:
        pt_in: Inlet stagnation pressure [Pa].
        tt_in: Inlet stagnation temperature [K].
        p_amb: Ambient pressure [Pa].
        g: Ratio of specific heats (gamma).
        r: Specific gas constant [J/kg/K].

    Returns:
        tuple: (exit_velocity [m/s], static_pressure [Pa], static_temperature [K], Mach).
    """
    if not all(math.isfinite(v) and v > 0 for v in (pt_in, tt_in, p_amb, r)) or not math.isfinite(g) or g <= 1:
        raise InputValidationError('Nozzle inputs must be finite and positive, with gamma greater than one.')
    crit_pr = ((g + 1.0) / 2.0) ** (g / (g - 1.0))
    if pt_in <= p_amb:
        raise PhysicalInfeasibilityError('The nozzle has no pressure available for expansion.',
                                        pt_in=pt_in, p_ambient=p_amb,
                                        pressure_ratio=pt_in / p_amb, critical_pressure_ratio=crit_pr)
    if pt_in / p_amb >= crit_pr:
        # Choked
        m_exit  = 1.0
        ps_exit = pt_in / crit_pr
        ts_exit = tt_in * 2.0 / (g + 1.0)
    else:
        # Unchoked
        exp = (g - 1.0) / g
        m_exit  = math.sqrt(((pt_in / p_amb) ** exp - 1.0) * 2.0 / (g - 1.0))
        ps_exit = p_amb
        ts_exit = tt_in / (1.0 + 0.5 * (g - 1.0) * m_exit ** 2)
    v_exit = m_exit * math.sqrt(g * r * ts_exit)
    return v_exit, ps_exit, ts_exit, m_exit
