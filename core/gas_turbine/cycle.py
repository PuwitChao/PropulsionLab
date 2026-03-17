"""
Gas turbine thermodynamic cycle analyzer.
Supports: Turbojet, Turbofan (separate or mixed exhaust), with afterburner.
All values in SI units.

Station numbering (ARP 755 / AS 755):
  0  : Far-field ambient
  2  : Inlet exit / Fan entry
  21 : Fan exit (bypass stream)
  25 : Fan exit (core stream) / LPC exit (if any)
  3  : HPC exit
  4  : Turbine inlet (TIT / TET)
  45 : (LPT inlet for two-spool)
  5  : LPT exit / Overall turbine exit
  7  : Afterburner exit
  8  : Core nozzle throat
  9  : Core nozzle exit
  13 : Bypass nozzle throat
  19 : Bypass nozzle exit
"""

import math
from ..units import R_AIR

# ── Standard atmospheric constants ──────────────────────────────────────────
GAMMA_COLD = 1.400   # Inlet / compressor (cold)
GAMMA_HOT  = 1.333   # Turbine / nozzle (hot gas, γ typical value)
CP_COLD    = 1005.0  # J/(kg·K), cold air
CP_HOT     = 1148.0  # J/(kg·K), hot combustion gas


def gamma_cp_mean(tt_in: float, tt_out: float):
    """
    Returns (gamma, cp) representative of a process spanning
    temperature tt_in → tt_out.  Simple two-zone average.
    """
    t_mid = 0.5 * (tt_in + tt_out)
    if t_mid < 900.0:
        return GAMMA_COLD, CP_COLD
    elif t_mid < 1400.0:
        # Linear blend
        frac = (t_mid - 900.0) / 500.0
        g  = GAMMA_COLD + frac * (GAMMA_HOT - GAMMA_COLD)
        cp = CP_COLD    + frac * (CP_HOT   - CP_COLD)
        return g, cp
    else:
        return GAMMA_HOT, CP_HOT


class EngineStation:
    """Stores stagnation thermodynamic state at one engine cross-section."""

    def __init__(self, t_total=0.0, p_total=0.0, mach=0.0, mdot_frac=1.0):
        self.tt = t_total
        self.pt = p_total
        self.m  = mach
        self.mdot_frac = mdot_frac   # fraction of inlet mass flow

    def get_entropy(self, cp=CP_COLD, r=R_AIR):
        """Relative entropy  s = cp·ln(Tt) − R·ln(Pt)."""
        if self.tt <= 0 or self.pt <= 0:
            return 0.0
        return cp * math.log(self.tt) - r * math.log(self.pt)


class CycleAnalyzer:
    """
    Solves 1-D thermodynamic cycle for gas turbine engines.

    Supported engine types
    ----------------------
    'turbojet'   : single-stream, no bypass
    'turbofan'   : dual-stream, configurable bypass ratio and FPR
    """

    def __init__(self, ambient_p: float, ambient_t: float, mach: float):
        self.p0 = ambient_p
        self.t0 = ambient_t
        self.m0 = mach
        self.stations: dict[int, EngineStation] = {}

        # Station 0: ambient
        tt0 = self.t0 * (1.0 + 0.5 * (GAMMA_COLD - 1.0) * self.m0 ** 2)
        pt0 = self.p0 * (tt0 / self.t0) ** (GAMMA_COLD / (GAMMA_COLD - 1.0))
        self.tt0 = tt0
        self.pt0 = pt0
        self.stations[0] = EngineStation(t_total=tt0, p_total=pt0, mach=mach)

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────
    def _poly_to_isen_comp(self, prc: float, eta_poly: float) -> float:
        """Compressor isentropic efficiency from polytropic efficiency."""
        g = GAMMA_COLD
        exp = (g - 1.0) / g
        ideal = prc ** exp - 1.0
        actual = prc ** (exp / eta_poly) - 1.0
        return ideal / actual if actual != 0 else 1.0

    def _poly_to_isen_turb(self, tau_t: float, eta_poly: float) -> float:
        """Turbine isentropic efficiency from polytropic efficiency & temp ratio."""
        if abs(1.0 - tau_t) < 1e-9:
            return eta_poly
        g = GAMMA_HOT
        exp = (g - 1.0) / g
        # ηis_t = (1 - τ_t^(1/η_poly)) / (1 - τ_t)
        try:
            num = 1.0 - tau_t ** (1.0 / eta_poly)
            den = 1.0 - tau_t
            return num / den
        except Exception:
            return eta_poly

    def _nozzle_exit(self, pt_in: float, tt_in: float, p_amb: float, g: float, r: float):
        """Calculate choked/unchoked nozzle exit conditions."""
        crit_pr = ((g + 1.0) / 2.0) ** (g / (g - 1.0))
        if pt_in / p_amb >= crit_pr:
            # Choked
            m9  = 1.0
            ps9 = pt_in / crit_pr
            ts9 = tt_in * 2.0 / (g + 1.0)
        else:
            # Unchoked
            exp = (g - 1.0) / g
            m9  = math.sqrt(((pt_in / p_amb) ** exp - 1.0) * 2.0 / (g - 1.0))
            ps9 = p_amb
            ts9 = tt_in / (1.0 + 0.5 * (g - 1.0) * m9 ** 2)
        v9 = m9 * math.sqrt(g * r * ts9)
        return v9, ps9, ts9, m9

    # ─────────────────────────────────────────────────────────────────────────
    # Public cycle solvers
    # ─────────────────────────────────────────────────────────────────────────
    def solve_turbojet(
        self,
        prc: float,
        tit: float,
        eta_c: float = 0.88,
        eta_t: float = 0.92,
        eta_ab: float = 0.95,
        h_fuel: float = 42.8e6,
        ab_enabled: bool = False,
        ab_temp: float = 2000.0,
        inlet_recovery: float = 0.98,
        burner_eta: float = 0.99,
        burner_dp_frac: float = 0.04,
        nozzle_dp_frac: float = 0.02,
    ) -> dict:
        """
        Solves a single-spool turbojet cycle.

        Parameters
        ----------
        prc              : overall compressor pressure ratio
        tit              : turbine inlet temperature [K]
        eta_c/t          : polytropic efficiencies
        burner_dp_frac   : relative total pressure loss in combustor (default 4%)
        nozzle_dp_frac   : relative total pressure loss in nozzle (default 2%)
        inlet_recovery   : total pressure recovery at inlet exit
        """
        g_c, cp_c = GAMMA_COLD, CP_COLD
        g_h, cp_h = GAMMA_HOT,  CP_HOT

        # ── Station 2: Inlet exit ─────────────────────────────────────────
        pt2 = self.pt0 * inlet_recovery
        tt2 = self.tt0
        self.stations[2] = EngineStation(t_total=tt2, p_total=pt2)

        # ── Station 3: HPC exit ───────────────────────────────────────────
        eta_isen_c = self._poly_to_isen_comp(prc, eta_c)
        tt3_ideal  = tt2 * prc ** ((g_c - 1.0) / g_c)
        tt3        = tt2 + (tt3_ideal - tt2) / eta_isen_c
        pt3        = pt2 * prc
        w_comp     = cp_c * (tt3 - tt2)   # specific work into compressor [J/kg_air]
        self.stations[3] = EngineStation(t_total=tt3, p_total=pt3)

        # ── Station 4: Turbine inlet ───────────────────────────────────────
        tt4 = tit
        pt4 = pt3 * (1.0 - burner_dp_frac)
        f   = cp_c * (tt4 - tt3) / (burner_eta * h_fuel - cp_h * tt4)
        f   = max(f, 0.0)
        self.stations[4] = EngineStation(t_total=tt4, p_total=pt4)

        # ── Station 5: Turbine exit ────────────────────────────────────────
        # Shaft power balance: cp_h*(1+f)*ΔTt_turb = cp_c*ΔTt_comp
        tt5   = tt4 - w_comp / (cp_h * (1.0 + f))
        tau_t = tt5 / tt4

        eta_isen_t = self._poly_to_isen_turb(tau_t, eta_t)
        pt5_ratio  = (1.0 - (1.0 - tau_t) / eta_isen_t) if eta_isen_t > 0 else tau_t
        pt5        = pt4 * max(pt5_ratio, 1e-4) ** (g_h / (g_h - 1.0))
        w_turb     = cp_h * (tt4 - tt5) * (1.0 + f)   # specific work [J/kg_air]
        self.stations[5] = EngineStation(t_total=tt5, p_total=pt5)

        # ── Afterburner ────────────────────────────────────────────────────
        f_ab = 0.0
        pt9_in = pt5 * (1.0 - nozzle_dp_frac)
        tt9_in = tt5
        if ab_enabled:
            tt9_in = ab_temp
            pt9_in = pt5 * 0.95
            f_ab   = cp_h * (ab_temp - tt5) / (eta_ab * h_fuel - cp_h * ab_temp)
            f_ab   = max(f_ab, 0.0)
        self.stations[7] = EngineStation(t_total=tt9_in, p_total=pt9_in)

        # ── Station 9: Nozzle exit ─────────────────────────────────────────
        g_n = g_h if (ab_enabled or tt9_in > 900) else g_c
        r_n = R_AIR
        v9, ps9, ts9, m9 = self._nozzle_exit(pt9_in, tt9_in, self.p0, g_n, r_n)
        v0 = self.m0 * math.sqrt(g_c * r_n * self.t0)

        f_total = f + f_ab
        spec_thrust = (1.0 + f_total) * v9 - v0 + (ps9 - self.p0) / (
            (pt9_in / (r_n * ts9 * (1.0 + f_total))) if v9 > 0 else 1.0
        )
        # Simplified momentum equation
        spec_thrust = (1.0 + f_total) * v9 - v0 + (ps9 - self.p0) * (
            r_n * ts9 / (ps9) * (1.0 + f_total) / max(v9, 1.0)
        )
        tsfc = f_total / spec_thrust if spec_thrust > 0 else 0.0

        # ── Efficiency metrics ─────────────────────────────────────────────
        q_in        = f_total * h_fuel                    # heat added per kg air
        ke_out      = 0.5 * (1.0 + f_total) * v9 ** 2
        ke_in       = 0.5 * v0 ** 2
        eta_thermal = (ke_out - ke_in) / q_in if q_in > 0 else 0.0
        eta_prop    = 2.0 * v0 / (v9 + v0) if (v9 + v0) > 0 else 0.0  # Froude
        eta_overall = eta_thermal * eta_prop

        return {
            # Perf
            'engine_type': 'turbojet',
            'spec_thrust': spec_thrust,
            'tsfc': tsfc,
            'f': f,
            'f_ab': f_ab,
            'f_total': f_total,
            # Efficiency
            'eta_thermal': eta_thermal,
            'eta_propulsive': eta_prop,
            'eta_overall': eta_overall,
            'eta_isen_c': eta_isen_c,
            'eta_isen_t': eta_isen_t,
            # Temperatures
            'tt3_ideal': tt3_ideal,
            'tt3': tt3,
            'tt5': tt5,
            'tt9_in': tt9_in,
            # Pressures
            'pt5': pt5,
            'pt9_in': pt9_in,
            # Velocities
            'v9': v9,
            'v0': v0,
            'm9': m9,
            # Work
            'w_comp': w_comp,
            'w_turb': w_turb,
            # Gas props used at exit
            'gamma': g_n,
            'cp': CP_COLD,
            'stations': {
                k: {'tt': v.tt, 'pt': v.pt, 's': v.get_entropy()}
                for k, v in self.stations.items()
            }
        }

    # ─────────────────────────────────────────────────────────────────────────
    def solve_turbofan(
        self,
        bpr: float,
        fpr: float,
        opr: float,
        tit: float,
        eta_fan: float = 0.90,
        eta_c: float   = 0.88,
        eta_t: float   = 0.92,
        eta_ab: float  = 0.95,
        h_fuel: float  = 42.8e6,
        ab_enabled: bool = False,
        ab_temp: float   = 2000.0,
        inlet_recovery: float = 0.98,
        burner_eta: float     = 0.99,
        burner_dp_frac: float = 0.04,
        mixed_exhaust: bool   = False,
    ) -> dict:
        """
        Solves a dual-spool separate-exhaust turbofan cycle.

        Parameters
        ----------
        bpr : bypass ratio  (e.g. 5.0 for a civil turbofan)
        fpr : fan pressure ratio (covers both core & bypass, e.g. 1.5–1.8)
        opr : overall pressure ratio = FPR × HPC ratio
        tit : turbine inlet temperature [K]
        """
        if bpr <= 0:
            raise ValueError("BPR must be > 0. Use solve_turbojet() for BPR=0.")

        g_c, cp_c = GAMMA_COLD, CP_COLD
        g_h, cp_h = GAMMA_HOT,  CP_HOT

        # ── Station 2: Inlet exit ─────────────────────────────────────────
        pt2 = self.pt0 * inlet_recovery
        tt2 = self.tt0
        self.stations[2] = EngineStation(t_total=tt2, p_total=pt2)

        # ── Station 21: Fan exit / bypass nozzle entry ───────────────────
        eta_isen_fan = self._poly_to_isen_comp(fpr, eta_fan)
        tt21_ideal   = tt2 * fpr ** ((g_c - 1.0) / g_c)
        tt21         = tt2 + (tt21_ideal - tt2) / eta_isen_fan
        pt21         = pt2 * fpr
        self.stations[21] = EngineStation(t_total=tt21, p_total=pt21, mdot_frac=bpr)

        # ── HPC pressure ratio ────────────────────────────────────────────
        hpc_pr = opr / fpr
        if hpc_pr < 1.0:
            hpc_pr = 1.0

        # ── Station 3: HPC exit ───────────────────────────────────────────
        eta_isen_c = self._poly_to_isen_comp(hpc_pr, eta_c)
        tt3_ideal  = tt21 * hpc_pr ** ((g_c - 1.0) / g_c)
        tt3        = tt21 + (tt3_ideal - tt21) / eta_isen_c
        pt3        = pt21 * hpc_pr
        w_comp_hp  = cp_c * (tt3 - tt21)   # HPC work per kg core air
        w_fan      = cp_c * (tt21 - tt2)   # Fan work per kg TOTAL air (including bypass)
        self.stations[3] = EngineStation(t_total=tt3, p_total=pt3)

        # ── Station 4: HPT inlet ─────────────────────────────────────────
        tt4 = tit
        pt4 = pt3 * (1.0 - burner_dp_frac)
        f   = cp_c * (tt4 - tt3) / (burner_eta * h_fuel - cp_h * tt4)
        f   = max(f, 0.0)
        self.stations[4] = EngineStation(t_total=tt4, p_total=pt4)

        # ── HPT (drives HPC) ─────────────────────────────────────────────
        # Work match for HPT only (HPC)
        tt45  = tt4 - w_comp_hp / (cp_h * (1.0 + f))
        tau_hpt = tt45 / tt4
        eta_isen_hpt = self._poly_to_isen_turb(tau_hpt, eta_t)
        pt45_ratio   = (1.0 - (1.0 - tau_hpt) / eta_isen_hpt) ** (g_h / (g_h - 1.0))
        pt45 = pt4 * max(pt45_ratio, 1e-6)
        self.stations[45] = EngineStation(t_total=tt45, p_total=pt45)

        # ── LPT (drives fan + LPC if any) ────────────────────────────────
        # LPT must supply fan work for (1+BPR) kg of air per kg core
        w_fan_total = w_fan * (1.0 + bpr)
        tt5   = tt45 - w_fan_total / (cp_h * (1.0 + f))
        tau_lpt = tt5 / tt45
        eta_isen_lpt = self._poly_to_isen_turb(tau_lpt, eta_t)
        pt5_ratio    = (1.0 - (1.0 - tau_lpt) / eta_isen_lpt) ** (g_h / (g_h - 1.0))
        pt5 = pt45 * max(pt5_ratio, 1e-6)
        self.stations[5] = EngineStation(t_total=tt5, p_total=pt5)

        # ── Core nozzle (afterburner optional) ────────────────────────────
        f_ab = 0.0
        pt9_in = pt5 * 0.98
        tt9_in = tt5
        if ab_enabled:
            tt9_in = ab_temp
            pt9_in = pt5 * 0.95
            f_ab   = cp_h * (ab_temp - tt5) / (eta_ab * h_fuel - cp_h * ab_temp)
            f_ab   = max(f_ab, 0.0)
        self.stations[7] = EngineStation(t_total=tt9_in, p_total=pt9_in)

        # Core nozzle exit
        g_n_c = g_h
        v9, ps9, ts9, m9 = self._nozzle_exit(pt9_in, tt9_in, self.p0, g_n_c, R_AIR)

        # ── Bypass nozzle ─────────────────────────────────────────────────
        pt19 = pt21 * 0.99
        tt19 = tt21
        self.stations[19] = EngineStation(t_total=tt19, p_total=pt19, mdot_frac=bpr)
        v19, ps19, ts19, m19 = self._nozzle_exit(pt19, tt19, self.p0, g_c, R_AIR)

        # ── Thrust accounting ─────────────────────────────────────────────
        v0 = self.m0 * math.sqrt(g_c * R_AIR * self.t0)
        f_total = f + f_ab

        # Specific thrust per unit CORE mass flow
        # F_core = (1+f)*V9 - (1+BPR)*V0 + BPR*V19
        spec_thrust_core = (1.0 + f_total) * v9 + bpr * v19 - (1.0 + bpr) * v0
        # Normalised per total air (core + bypass)
        spec_thrust = spec_thrust_core / (1.0 + bpr)

        # TSFC per total thrust
        fuel_flow_frac = f_total / (1.0 + bpr)
        tsfc = fuel_flow_frac / spec_thrust if spec_thrust > 0 else 0.0

        # ── Efficiency ────────────────────────────────────────────────────
        q_in     = (f_total / (1.0 + bpr)) * h_fuel
        ke_core  = 0.5 * (1.0 + f_total) / (1.0 + bpr) * v9 ** 2
        ke_byp   = 0.5 * bpr / (1.0 + bpr) * v19 ** 2
        ke_in    = 0.5 * v0 ** 2
        eta_thermal  = (ke_core + ke_byp - ke_in) / q_in if q_in > 0 else 0.0
        eta_prop = spec_thrust * v0 / (ke_core + ke_byp - ke_in) if (ke_core + ke_byp - ke_in) > 0 else 0.0
        eta_overall  = eta_thermal * eta_prop

        return {
            'engine_type': 'turbofan',
            'bpr': bpr,
            'fpr': fpr,
            'opr': opr,
            # Perf
            'spec_thrust': spec_thrust,
            'tsfc': tsfc,
            'f': f,
            'f_ab': f_ab,
            'f_total': f_total,
            # Bypass nozzle
            'v19': v19,
            'm19': m19,
            's19': ts19,
            'bpr_thrust_frac': bpr * v19 / ((1.0 + f_total) * v9 + bpr * v19) if ((1.0 + f_total) * v9 + bpr * v19) > 0 else 0,
            # Efficiency
            'eta_thermal':   eta_thermal,
            'eta_propulsive': eta_prop,
            'eta_overall':   eta_overall,
            'eta_isen_fan':  eta_isen_fan,
            'eta_isen_c':    eta_isen_c,
            # Temperatures
            'tt3_ideal': tt3_ideal,
            'tt3': tt3,
            'tt45': tt45,
            'tt5': tt5,
            'tt9_in': tt9_in,
            # Pressures
            'pt45': pt45,
            'pt5': pt5,
            'pt9_in': pt9_in,
            'pt19': pt19,
            # Velocities
            'v9': v9,
            'v0': v0,
            'm9': m9,
            # Gas props
            'gamma': g_n_c,
            'cp': CP_COLD,
            'stations': {
                k: {'tt': v.tt, 'pt': v.pt, 's': v.get_entropy()}
                for k, v in self.stations.items()
            }
        }
