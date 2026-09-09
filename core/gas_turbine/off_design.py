"""
Gas Turbine Off-Design Performance Module.

Implements a simple, physics-based compressor map model and
engine operating-line solver suitable for parametric off-design studies.

The map uses the dimensionless corrected flow / speed / pressure-ratio
format standard in gas turbine practice.

Reference:
  Mattingly, J.D., "Elements of Gas Turbine Propulsion", 2nd ed.
  Walsh & Fletcher, "Gas Turbine Performance", 2nd ed.
"""

import math
from ..errors import InputValidationError, ModelDomainError, PhysicalInfeasibilityError, ConvergenceError, SolverError
from ..solver_result import assurance, failed_point, require_finite, ACCEPTED_STATUSES
from .cycle import get_gas_props


# ─── Parametric compressor map ─────────────────────────────────────────────
def _compressor_map(N_corr_norm: float, mdot_corr_norm: float):
    """
    Returns (PR, eta_isen) for a generic single-stage-equivalent compressor.

    Both inputs are normalised to design-point value (= 1.0 at design).
    Uses a simplified Euler/similarity approach.

    Parameters
    ----------
    N_corr_norm  : corrected speed / design corrected speed  (0.5 – 1.1)
    mdot_corr_norm : corrected flow / design corrected flow (up to 0.96*N/0.576)

    Returns
    -------
    pr    : pressure ratio
    eta   : isentropic efficiency (peak ~0.88)
    surge : True if operating point is at/beyond surge
    """
    N, W = N_corr_norm, mdot_corr_norm * 0.576
    if not all(math.isfinite(v) for v in (N, W)) or not 0.4 <= N <= 1.15 or not 0 < W <= 0.96 * N * (1 + 1e-12):
        raise ModelDomainError('The generic compressor map point is outside its speed/flow domain.',
                               corrected_speed=N, normalized_flow=mdot_corr_norm)

    # Surge line PR (from similarity: PR_surge ~ N^2)
    pr_surge = 1.0 + (N ** 2) * 14.0         # maps to ~15 at N=1

    # Choke line flow (roughly proportional to N)
    w_choke = 0.96 * N

    # Normalised flow on a speed line (0 = surge, 1 = choke)
    w_ratio = min(W / w_choke, 1.0)

    # PR on a speed line  (drops from surge value toward choke exit)
    pr = pr_surge * (1.0 - 0.35 * w_ratio ** 1.8)
    pr = max(1.0, pr)

    # Peak efficiency occurs at ~60% of the flow range on the speed line
    w_peak = 0.60 * w_choke
    delta_w = (W - w_peak) / (w_choke - w_peak + 1e-9)
    eta = 0.88 * N - 0.25 * delta_w ** 2 - 0.10 * (1.0 - N) ** 2
    eta = max(0.50, min(eta, 0.92))

    # Surge margin
    surge = (W <= 0.10 * w_choke)

    return pr, eta, surge


def _turbine_map(N_corr_norm: float, pr: float, pr_design: float = 4.5):
    """
    Returns (eta_isen, is_choked)
    """
    # Turbine chokes when PR > ~1.85 for typical combustion products
    g = 1.333
    pr_crit = ((g + 1) / 2) ** (g / (g - 1))
    choked = pr >= pr_crit

    dn = abs(N_corr_norm - 1.0)
    eta = 0.92 - 0.08 * dn ** 2 - 0.04 * max(0, 1.0 - pr / pr_design)
    eta = max(0.60, min(eta, 0.93))
    return eta, choked


def _turbine_pr_from_work_balance(
    pr_compressor: float,
    eta_c: float,
    eta_t: float,
    tt2: float,
    tt4: float,
    f: float = 0.025,
    gamma_c: float = 1.40,
    gamma_t: float = 1.333,
    cp_c: float = 1005.0,
    cp_t: float = 1244.0,
    eta_mech: float = 0.99,
) -> float:
    """
    Solves the compressor-turbine work-balance for the turbine pressure ratio.

    The shaft balance (per kg of inlet air) is

        W_comp = cp_c * Tt2 * (pi_c^((gc-1)/gc) - 1) / eta_c
        W_turb * (1 + f) * eta_mech = W_comp
        W_turb = eta_t * cp_t * Tt4 * (1 - pi_t^(-(gt-1)/gt))

    Combining and solving for pi_t gives a closed-form expression. This replaces
    the prior `turb_pr = pr_compressor * 0.25` placeholder with a result that
    actually depends on TIT and compressor work — so throttle sweeps produce a
    physically meaningful turbine PR trace instead of a flat 25 %.
    """
    if not all(math.isfinite(v) for v in (pr_compressor, eta_c, eta_t, tt2, tt4, f, eta_mech, gamma_c, gamma_t, cp_c, cp_t)):
        raise InputValidationError('Work-balance inputs must be finite.')
    if not 0 < eta_c <= 1 or not 0 < eta_t <= 1 or not 0 < eta_mech <= 1 or f < 0 or pr_compressor < 1 or min(tt2, tt4) <= 0:
        raise InputValidationError('Invalid turbine work-balance inputs.')
    if min(gamma_c, gamma_t) <= 1 or min(cp_c, cp_t) <= 0:
        raise InputValidationError('Heat capacities must be positive and gamma must exceed one.')
    eta_c_s, eta_t_s = eta_c, eta_t
    gc_exp = (gamma_c - 1.0) / gamma_c
    w_comp = cp_c * tt2 * (pr_compressor ** gc_exp - 1.0) / eta_c_s
    w_turb_per_kg_gas = w_comp / (eta_mech * (1.0 + f))
    enthalpy_drop_avail = eta_t_s * cp_t * tt4
    drop_ratio = w_turb_per_kg_gas / enthalpy_drop_avail
    if drop_ratio >= 1:
        raise PhysicalInfeasibilityError('Compressor demand exceeds available turbine work.', drop_ratio=drop_ratio)
    gt_exp = (gamma_t - 1.0) / gamma_t
    return (1.0 - drop_ratio) ** (-1.0 / gt_exp)



# ─── Off-design solver ──────────────────────────────────────────────────────
class OffDesignSolver:
    """
    Samples a generic compressor map and prescribed throttle schedule.
    This model does not solve fixed-geometry engine matching.
    """

    def __init__(self, design_point: dict):
        stations = design_point.get('stations', {})
        station = lambda key: stations.get(key, stations.get(str(key), {}))
        try:
            self.dp_tt4 = station(4)['tt']
            self.dp_pr = station(3)['pt'] / station(2)['pt']
        except (KeyError, ZeroDivisionError) as exc:
            raise InputValidationError('A design point requires stations 2, 3, and 4.') from exc
        if design_point.get('status', 'OUTSIDE_VALIDATED_DOMAIN') not in ACCEPTED_STATUSES:
            raise PhysicalInfeasibilityError('The off-design reference point is invalid.')
        self.dp_f = design_point.get('f_total', design_point.get('f', 0.025))
        self.dp_mdot = design_point.get('mdot')
        if not all(math.isfinite(v) for v in (self.dp_tt4, self.dp_pr, self.dp_f)) or self.dp_tt4 <= 0 or self.dp_pr <= 1 or self.dp_f <= 0:
            raise InputValidationError('The design reference requires finite positive temperature, fuel ratio, and PR above one.')
        nominal_pr, _, _ = _compressor_map(1.0, 1.0)
        self.pr_scale = (self.dp_pr - 1) / (nominal_pr - 1)

    def map_point(self, speed, flow):
        pr, eta, surge = _compressor_map(speed, flow)
        return 1 + (pr - 1) * self.pr_scale, eta, surge

    def surge_margin(self, speed, flow):
        """Return the same-speed combined pressure/flow margin, in percent."""
        pr, _, _ = self.map_point(speed, flow)
        surge_flow = 0.096 * speed / 0.576
        surge_pr, _, _ = self.map_point(speed, surge_flow)
        return 100 * ((surge_pr / pr) * (flow / surge_flow) - 1)

    def sweep_throttle(self, ambient_p, ambient_t, mach, h_fuel=42.8e6, n_points=20):
        """Sample a generic map schedule. This is not fixed-geometry engine matching."""
        from .cycle import CycleAnalyzer
        if not isinstance(n_points, int) or not 2 <= n_points <= 100:
            raise InputValidationError('n_points must be from 2 through 100.')
        results = []
        for i in range(n_points):
            throttle = 0.55 + 0.45 * i / (n_points - 1)
            speed, flow = math.sqrt(throttle), throttle ** 0.7
            tt4 = self.dp_tt4 * (0.65 + 0.35 * throttle)
            inputs = {'throttle_pct': throttle * 100, 'N_corr_norm': speed,
                      'mdot_corr_norm': flow, 'tt4': tt4}
            try:
                ca = CycleAnalyzer(ambient_p, ambient_t, mach)
                pr, eta_c, surge = self.map_point(speed, flow)
                inputs['pr'] = pr
                eta_t = 0.90
                for iteration in range(1, 26):
                    turb_pr = _turbine_pr_from_work_balance(pr, eta_c, eta_t, ca.tt0, tt4, self.dp_f)
                    eta_new, _ = _turbine_map(speed, turb_pr)
                    residual = eta_new - eta_t
                    eta_t = eta_new
                    if abs(residual) <= 1e-6:
                        break
                else:
                    raise ConvergenceError('The turbine efficiency estimate did not converge.', residual=residual)
                turb_pr = _turbine_pr_from_work_balance(pr, eta_c, eta_t, ca.tt0, tt4, self.dp_f)
                g, _, _ = get_gas_props(ca.tt0, ca.pt0)
                exponent = (g - 1) / g
                eta_c_poly = exponent * math.log(pr) / math.log(1 + (pr ** exponent - 1) / eta_c)
                # Convert the estimated turbine isentropic efficiency to polytropic efficiency.
                tau_is = turb_pr ** (-(1.333 - 1) / 1.333)
                eta_t_poly = math.log(1 - eta_t * (1 - tau_is)) / math.log(tau_is)
                result = ca.solve_turbojet(pr, tt4, eta_c=eta_c_poly, eta_t=eta_t_poly, h_fuel=h_fuel)
                accepted = result['status'] in ACCEPTED_STATUSES
                meta = assurance('generic_offdesign_schedule', {**inputs, 'ambient_p': ambient_p, 'ambient_t': ambient_t, 'mach': mach, 'h_fuel': h_fuel},
                                 status=result['status'], physical_valid=result['assurance']['physical_valid'],
                                 warnings=result['assurance']['warnings'],
                                 assumptions=['OD-01: generic map scaled in PR to the design reference',
                                              'OD-02: prescribed normalized flow/speed/TIT schedule; not a matched engine',
                                              'OD-03: bounded empirical efficiency correlations'])
                meta['convergence'] = {'method': 'turbine_efficiency_estimate_only', 'converged': True,
                                       'iterations': iteration, 'max_iterations': 25,
                                       'residuals': {'efficiency_change': residual}, 'tolerances': {'absolute': 1e-6},
                                       'termination_reason': 'residual_tolerance'}
                row = {**inputs, 'turb_pr': turb_pr,
                       'spec_thrust': result['spec_thrust'] if accepted else None,
                       'tsfc': result['tsfc'] if accepted else None, 'tsfc_unit': 'kg/(N*s)',
                       'f': result['f_total'], 'eta_c': eta_c, 'eta_t': eta_t,
                       'eta_thermal': result['eta_thermal'] if accepted else None,
                       'eta_overall': result['eta_overall'] if accepted else None,
                       'surge': surge, 'surge_margin_pct': self.surge_margin(speed, flow),
                       'status': meta['status'], 'assurance': meta, 'error': not accepted}
                require_finite(row)
                results.append(row)
            except SolverError as exc:
                results.append(failed_point(exc, inputs, ('spec_thrust', 'tsfc', 'eta_thermal', 'eta_overall', 'surge_margin_pct')))
        return results

    def generate_compressor_map(self, n_speed_lines=7, n_flow_points=20):
        if not 2 <= n_speed_lines <= 50 or not 2 <= n_flow_points <= 200:
            raise InputValidationError('Map sampling counts exceed supported bounds.')
        speed_lines, surge_x, surge_y = [], [], []
        for i in range(n_speed_lines):
            speed = 0.55 + i * 0.55 / (n_speed_lines - 1)
            surge_flow = 0.096 * speed / 0.576
            choke_flow = 0.96 * speed / 0.576
            flows = [surge_flow + j * (choke_flow - surge_flow) / n_flow_points for j in range(n_flow_points + 1)]
            points = [self.map_point(speed, flow) for flow in flows]
            speed_lines.append({'N_norm': speed, 'label': f'{speed * 100:.0f}% Nc',
                                'flow': flows, 'pr': [point[0] for point in points], 'eta': [point[1] for point in points]})
            surge_x.append(surge_flow)
            surge_y.append(self.map_point(speed, surge_flow)[0])
        meta = assurance('generic_compressor_map', {'design_pr': self.dp_pr}, assumptions=['OD-01: uncalibrated generic map'])
        return {'speed_lines': speed_lines, 'surge_line': {'flow': surge_x, 'pr': surge_y},
                'design_point': {'flow': 1.0, 'pr': self.dp_pr},
                'flow_unit': 'normalized_corrected_flow', 'speed_unit': 'normalized_corrected_speed',
                'surge_margin_definition': '100*((PR_surge/PR_operating)*(W_operating/W_surge)-1), same corrected speed',
                'status': meta['status'], 'assurance': meta}
