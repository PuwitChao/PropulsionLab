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
from ..units import R_AIR, isa_atmosphere
from .cycle import get_gas_props

# ─── Parametric compressor map ─────────────────────────────────────────────
def _compressor_map(N_corr_norm: float, mdot_corr_norm: float):
    """
    Returns (PR, eta_isen, surge) for a generic single-stage-equivalent compressor.

    Both inputs are normalised to design-point value (= 1.0 at design).
    Uses a simplified Euler/similarity approach.

    Parameters
    ----------
    N_corr_norm  : corrected speed / design corrected speed  (0.5 – 1.1)
    mdot_corr_norm : corrected flow / design corrected flow  (0 – 1.05)
    """
    N  = max(0.4, min(N_corr_norm, 1.15))
    W  = max(0.05, min(mdot_corr_norm, 1.10))

    # Surge line PR (from similarity: PR_surge ~ N^2)
    pr_surge = 1.0 + (N ** 2) * 14.0         # maps to ~15 at N=1

    # Choke line flow (roughly proportional to N)
    w_choke = 0.96 * N

    if N < 0.01:
        return 1.0, 0.5, False
    w_ratio = min(W / w_choke, 1.0)

    # PR on a speed line (drops from surge value toward choke)
    pr = pr_surge * (1.0 - 0.35 * w_ratio ** 1.8)
    pr = max(1.0, pr)

    # Peak efficiency at ~60 % of the flow range on the speed line
    w_peak = 0.60 * w_choke
    delta_w = (W - w_peak) / (w_choke - w_peak + 1e-9)
    eta = 0.88 * N - 0.25 * delta_w ** 2 - 0.10 * (1.0 - N) ** 2
    eta = max(0.50, min(eta, 0.92))

    # Surge: real surge typically occurs at ~20-25 % of choke flow on a speed line,
    # not 10 % as previously coded.
    surge = (W <= 0.22 * w_choke)

    return pr, eta, surge


def _turbine_map(N_corr_norm: float, pr: float, pr_design: float = 4.5):
    """Returns (eta_isen, is_choked) for a parametric turbine map."""
    g = 1.333
    pr_crit = ((g + 1) / 2) ** (g / (g - 1))
    choked = pr >= pr_crit

    dn = abs(N_corr_norm - 1.0)
    eta = 0.92 - 0.08 * dn ** 2 - 0.04 * max(0, 1.0 - pr / pr_design)
    eta = max(0.60, min(eta, 0.93))
    return eta, choked


# ─── Off-design solver ──────────────────────────────────────────────────────
class OffDesignSolver:
    """
    Calculates off-design performance of a turbojet engine by sweeping
    fuel flow (throttle) at fixed geometry.
    """

    def __init__(self, design_point: dict):
        dp = design_point
        stations = dp.get('stations', {})

        self.dp_tt4  = stations.get(4, {}).get('tt', 1600.0)
        self.dp_pt3  = stations.get(3, {}).get('pt', 1.5e6)
        self.dp_pt2  = stations.get(2, {}).get('pt', 3e4)
        self.dp_pr   = self.dp_pt3 / max(self.dp_pt2, 1.0)
        self.dp_mdot = stations.get(2, {}).get('m', 10.0)
        self.dp_f    = dp.get('f_total', dp.get('f', 0.025))

        # Design turbine expansion ratio (pt4 / pt5), derived from cycle output.
        # Fall back to a heuristic if pt5 is not available.
        pt4_dp = stations.get(4, {}).get('pt', self.dp_pt3 * 0.96)
        pt5_dp = dp.get('pt5') or stations.get(5, {}).get('pt')
        if pt5_dp and pt5_dp > 0 and pt4_dp > pt5_dp:
            self.dp_pr_turb = pt4_dp / pt5_dp
        else:
            # Rough heuristic: turbine expansion ≈ 22 % of OPR (empirically ~3–6 for jets)
            self.dp_pr_turb = max(2.5, self.dp_pr * 0.22)

    def sweep_throttle(
        self,
        ambient_p: float,
        ambient_t: float,
        mach: float,
        h_fuel: float = 42.8e6,
        n_points: int = 20,
    ) -> list[dict]:
        from .cycle import CycleAnalyzer

        g0, cp0, _ = get_gas_props(ambient_t, ambient_p)
        tt0 = ambient_t * (1.0 + 0.5 * (g0 - 1.0) * mach ** 2)
        gt0, cp_t0, _ = get_gas_props(tt0, ambient_p)
        pt0 = ambient_p * (1.0 + 0.5 * (gt0 - 1.0) * mach ** 2) ** (gt0 / (gt0 - 1.0))

        results = []
        for i in range(n_points):
            throttle = 0.55 + 0.45 * (i / max(n_points - 1, 1))   # 55 % → 100 %

            N_corr_norm    = math.sqrt(throttle)
            mdot_corr_norm = throttle ** 0.7

            pr, eta_c, surge = _compressor_map(N_corr_norm, mdot_corr_norm)

            # TIT schedule: idle at ~70 % of design TIT, max at design TIT.
            # This is a simplified linear schedule. Real engines use a T4/P3
            # temperature-pressure schedule, but that requires full spool matching.
            k_tit = 0.70 + 0.30 * throttle
            tt4   = self.dp_tt4 * k_tit

            # Turbine PR scales with throttle via corrected-speed similarity.
            # At design (throttle=1.0) it equals the design-point expansion ratio;
            # at partial power it decreases roughly as throttle^0.8.
            turb_pr  = max(1.5, self.dp_pr_turb * (throttle ** 0.8))
            eta_t, _ = _turbine_map(N_corr_norm, turb_pr, self.dp_pr_turb)

            ca = CycleAnalyzer(ambient_p, ambient_t, mach)
            try:
                res = ca.solve_turbojet(
                    prc=max(1.5, pr),
                    tit=tt4,
                    eta_c=eta_c,
                    eta_t=eta_t,
                    h_fuel=h_fuel,
                )

                # Basic turbine work-balance validation
                tt5 = res.get('tt5', 0)
                if tt5 <= 0 or tt5 >= tt4:
                    raise ValueError(f"Turbine work balance failed: Tt5={tt5:.1f} K")

                results.append({
                    'throttle_pct'  : round(throttle * 100, 1),
                    'N_corr_norm'   : round(N_corr_norm, 3),
                    'mdot_corr_norm': round(mdot_corr_norm, 4),
                    'pr'            : round(pr, 2),
                    'tt4'           : round(tt4, 1),
                    'spec_thrust'   : round(res['spec_thrust'], 2),
                    'tsfc'          : round(res['tsfc'] * 1e6, 4),   # mg/N/s
                    'f'             : round(res['f_total'], 5),
                    'eta_c'         : round(eta_c, 3),
                    'eta_t'         : round(eta_t, 3),
                    'surge'         : surge,
                    'eta_thermal'   : round(res.get('eta_thermal', 0), 3),
                    'eta_overall'   : round(res.get('eta_overall', 0), 3),
                })
            except Exception as e:
                results.append({
                    'throttle_pct': round(throttle * 100, 1),
                    'pr': round(pr, 2), 'tt4': round(tt4, 1),
                    'spec_thrust': 0, 'tsfc': 0,
                    'error': True, 'error_msg': str(e),
                })

        return results

    def generate_compressor_map(
        self,
        n_speed_lines: int = 7,
        n_flow_points: int = 20,
    ) -> dict:
        """
        Generates data for a full compressor map plot.
        Returns speed lines (PR vs corrected flow) and a surge line.
        """
        speed_lines = []
        N_values = [0.55 + i * (1.10 - 0.55) / (n_speed_lines - 1)
                    for i in range(n_speed_lines)]

        surge_x = []
        surge_y = []

        for N in N_values:
            flow_pts_x = []
            flow_pts_y = []
            eta_pts    = []

            w_choke_approx = 0.96 * N
            for j in range(n_flow_points + 1):
                W = 0.05 * N + j * (w_choke_approx - 0.05 * N) / n_flow_points
                pr, eta, surge = _compressor_map(N, W)
                if surge:
                    continue
                flow_pts_x.append(round(W, 4))
                flow_pts_y.append(round(pr, 3))
                eta_pts.append(round(eta, 3))

            speed_lines.append({
                'N_norm': round(N, 3),
                'label' : f'{round(N * 100)}% Nc',
                'flow'  : flow_pts_x,
                'pr'    : flow_pts_y,
                'eta'   : eta_pts,
            })

            # Surge line anchor: use the point just at the 22 % choke threshold
            pr_surge, _, _ = _compressor_map(N, 0.22 * N)
            surge_x.append(round(0.22 * N, 4))
            surge_y.append(round(pr_surge, 3))

        return {
            'speed_lines': speed_lines,
            'surge_line' : {'flow': surge_x, 'pr': surge_y},
        }
