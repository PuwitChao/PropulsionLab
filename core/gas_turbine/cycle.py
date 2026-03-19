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
    """Design-point thermodynamic cycle solver for Gas Turbines."""

    def __init__(self, p0_pa: float, t0_k: float, mach: float):
        self.p0 = p0_pa
        self.t0 = t0_k
        self.m0 = mach
        self.tt0 = t0_k * (1.0 + 0.5 * (GAMMA_COLD - 1.0) * mach ** 2)
        self.pt0 = p0_pa * (1.0 + 0.5 * (GAMMA_COLD - 1.0) * mach ** 2) ** (
            GAMMA_COLD / (GAMMA_COLD - 1.0)
        )
        self.stations: dict[int, EngineStation] = {}
        self.math_trace = []
        
        self.math_trace.append(f"Ambient Conditions: P0={p0_pa/1e3:.1f} kPa, T0={t0_k:.1f} K, M={mach:.2f}")
        self.math_trace.append(f"Freestream Total: tt0={self.tt0:.1f} K, pt0={self.pt0/1e3:.1f} kPa")
        self.stations[0] = EngineStation(t_total=self.tt0, p_total=self.pt0, mach=mach)

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
        phi_inlet: float = 0.0,
        eta_install_nozzle: float = 1.0,
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
        self.math_trace.append(f"Inlet Recovery: pt2 = pt0 * {inlet_recovery:.2f} = {pt2/1e3:.1f} kPa")

        # ── Station 3: HPC exit ───────────────────────────────────────────
        eta_isen_c = self._poly_to_isen_comp(prc, eta_c)
        tt3_ideal  = tt2 * prc ** ((g_c - 1.0) / g_c)
        tt3        = tt2 + (tt3_ideal - tt2) / eta_isen_c
        pt3        = pt2 * prc
        w_comp     = cp_c * (tt3 - tt2)   # specific work into compressor [J/kg_air]
        self.stations[3] = EngineStation(t_total=tt3, p_total=pt3)
        self.math_trace.append(f"Compression: Tt3 = Tt2 + (Tt3_ideal - Tt2) / η_is = {tt3:.1f} K")
        self.math_trace.append(f"Compressor Isentropic Eff: Derived from polytropic {eta_c:.3f} and PR {prc:.1f} -> {eta_isen_c:.4f}")
        self.math_trace.append(f"Compressor Work: wc = Cpc * (Tt3 - Tt2) = {w_comp/1e3:.1f} kJ/kg")

        # ── Station 4: Turbine inlet ───────────────────────────────────────
        tt4 = tit
        pt4 = pt3 * (1.0 - burner_dp_frac)
        f   = cp_c * (tt4 - tt3) / (burner_eta * h_fuel - cp_h * tt4)
        f   = max(f, 0.0)
        self.stations[4] = EngineStation(t_total=tt4, p_total=pt4)
        self.math_trace.append(f"Combustor: Tt4 = {tt4:.1f} K, Pt4 = {pt4/1e3:.1f} kPa, f = {f:.4f}")

        # ── Station 5: Turbine exit ────────────────────────────────────────
        # Shaft power balance: cp_h*(1+f)*ΔTt_turb = cp_c*ΔTt_comp
        tt5   = tt4 - w_comp / (cp_h * (1.0 + f))
        tau_t = tt5 / tt4

        eta_isen_t = self._poly_to_isen_turb(tau_t, eta_t)
        pt5_ratio  = (1.0 - (1.0 - tau_t) / eta_isen_t) if eta_isen_t > 0 else tau_t
        pt5        = pt4 * max(pt5_ratio, 1e-4) ** (g_h / (g_h - 1.0))
        w_turb     = cp_h * (tt4 - tt5) * (1.0 + f)   # specific work [J/kg_air]
        self.stations[5] = EngineStation(t_total=tt5, p_total=pt5)
        self.math_trace.append(f"Turbine Entry: Tt4 = {tt4:.1f} K, Work matching wc = (1+f)*wt")
        self.math_trace.append(f"Turbine Exit: Tt5 = Tt4 - wc / (Cph*(1+f)) = {tt5:.1f} K")
        self.math_trace.append(f"Turbine Pressure Ratio: Pr_t = {pt4/pt5:.2f}, derived from work balance")
        self.math_trace.append(f"Turbine Isentropic Eff: Derived from polytropic {eta_t:.3f} and tau_t {tau_t:.3f} -> {eta_isen_t:.4f}")
        self.math_trace.append(f"Turbine Work: wt = Cph * (Tt4 - Tt5) * (1+f) = {w_turb/1e3:.1f} kJ/kg")

        # ── Afterburner ────────────────────────────────────────────────────
        f_ab = 0.0
        pt9_in = pt5 * (1.0 - nozzle_dp_frac)
        tt9_in = tt5
        if ab_enabled:
            tt9_in = ab_temp
            pt9_in = pt5 * 0.95
            f_ab   = cp_h * (ab_temp - tt5) / (eta_ab * h_fuel - cp_h * ab_temp)
            f_ab   = max(f_ab, 0.0)
            self.math_trace.append(f"Afterburner: Tt7 = {tt9_in:.1f} K, Pt7 = {pt9_in/1e3:.1f} kPa, f_ab = {f_ab:.4f}")
        self.stations[7] = EngineStation(t_total=tt9_in, p_total=pt9_in)

        # ── Station 9: Nozzle exit ─────────────────────────────────────────
        g_n = g_h if (ab_enabled or tt9_in > 900) else g_c
        r_n = R_AIR
        v9, ps9, ts9, m9 = self._nozzle_exit(pt9_in, tt9_in, self.p0, g_n, r_n)
        
        # Fully expanded velocity for efficiency metrics
        v9_fully_expanded = math.sqrt(max(0.0, 2.0 * (cp_h if tt9_in > 1000 else cp_c) * tt9_in * (1.0 - (self.p0 / pt9_in) ** ((g_n - 1.0) / g_n))))
        v0 = self.m0 * math.sqrt(g_c * R_AIR * self.t0)

        f_total = f + f_ab
        spec_thrust = (1.0 + f_total) * v9 - v0 + (ps9 - self.p0) / (
            (pt9_in / (r_n * ts9 * (1.0 + f_total))) if v9 > 0 else 1.0
        )
        # Simplified momentum equation
        spec_thrust = (1.0 + f_total) * v9 - v0 + (ps9 - self.p0) * (
            r_n * ts9 / (ps9) * (1.0 + f_total) / max(v9, 1.0)
        )
        tsfc = f_total / spec_thrust if spec_thrust > 0 else 0.0
        self.math_trace.append(f"Nozzle Exit: V9 = {v9:.1f} m/s, M9 = {m9:.2f}, Ps9 = {ps9/1e3:.1f} kPa")
        self.math_trace.append(f"Specific Thrust: {spec_thrust:.1f} N/(kg/s), TSFC: {tsfc*1e6:.1f} mg/(N·s)")

        # ── Installation Losses ──────────────────────────────────────────
        # D_inlet = V0 * phi_inlet (spillage/additive drag count)
        # eta_install_nozzle: (gross thrust efficiency)
        drag_inlet  = v0 * phi_inlet
        f_gross     = (1.0 + f_total) * v9 + (ps9 - self.p0) * (r_n * ts9 / ps9 * (1.0 + f_total) / max(v9, 1.0))
        
        # Installed specific thrust: F_installed = F_gross*eta - V0 - D_inlet
        spec_thrust_installed = (f_gross * eta_install_nozzle) - v0 - drag_inlet
        drag_nozzle = f_gross * (1.0 - eta_install_nozzle)

        tsfc_installed = f_total / spec_thrust_installed if spec_thrust_installed > 0 else 0.0
        self.math_trace.append(f"Installation: Drag_inlet={drag_inlet:.1f}, Nozzle_Efficiency={eta_install_nozzle:.3f}")
        self.math_trace.append(f"Installed Specific Thrust: {spec_thrust_installed:.1f} N/(kg/s), Installed TSFC: {tsfc_installed*1e6:.1f} mg/(N·s)")

        # ── Efficiency metrics ─────────────────────────────────────────────
        q_in        = f_total * h_fuel                    # heat added per kg air
        ke_out_max  = 0.5 * (1.0 + f_total) * v9_fully_expanded ** 2
        ke_in       = 0.5 * v0 ** 2
        eta_thermal = (ke_out_max - ke_in) / (f_total * h_fuel) if (f_total > 0) else 0.0
        eta_prop    = 2.0 * v0 / (v9 + v0) if (v9 + v0) > 0 else 0.0  # Froude
        eta_overall = eta_thermal * eta_prop
        self.math_trace.append(f"Thermal Efficiency: {eta_thermal:.3f}, Propulsive Efficiency: {eta_prop:.3f}, Overall Efficiency: {eta_overall:.3f}")

        return {
            # Perf
            'engine_type': 'turbojet',
            'spec_thrust': spec_thrust,
            'spec_thrust_installed': spec_thrust_installed,
            'tsfc': tsfc,
            'tsfc_installed': tsfc_installed,
            'drag_inlet': drag_inlet,
            'drag_nozzle': drag_nozzle,
            'f': f,
            'f_ab': f_ab,
            'f_total': f_total,
            'math_trace': self.math_trace,
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
        phi_inlet: float = 0.0,
        eta_install_nozzle: float = 1.0,
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
        self.math_trace.append(f"Inlet Recovery: pt2 = pt0 * {inlet_recovery:.2f} = {pt2/1e3:.1f} kPa")

        # ── Station 21: Fan exit / bypass nozzle entry ───────────────────
        eta_isen_fan = self._poly_to_isen_comp(fpr, eta_fan)
        tt21_ideal   = tt2 * fpr ** ((g_c - 1.0) / g_c)
        tt21         = tt2 + (tt21_ideal - tt2) / eta_isen_fan
        pt21         = pt2 * fpr
        self.stations[21] = EngineStation(t_total=tt21, p_total=pt21, mdot_frac=bpr)
        self.math_trace.append(f"Fan: Tt21 = {tt21:.1f} K, Pt21 = {pt21/1e3:.1f} kPa, η_is_fan = {eta_isen_fan:.4f}")

        # ── HPC pressure ratio ────────────────────────────────────────────
        hpc_pr = opr / fpr
        if hpc_pr < 1.0:
            hpc_pr = 1.0
        self.math_trace.append(f"HPC Pressure Ratio: OPR/FPR = {opr:.2f}/{fpr:.2f} = {hpc_pr:.2f}")

        # ── Station 3: HPC exit ───────────────────────────────────────────
        eta_isen_c = self._poly_to_isen_comp(hpc_pr, eta_c)
        tt3_ideal  = tt21 * hpc_pr ** ((g_c - 1.0) / g_c)
        tt3        = tt21 + (tt3_ideal - tt21) / eta_isen_c
        pt3        = pt21 * hpc_pr
        w_comp_hp  = cp_c * (tt3 - tt21)   # HPC work per kg core air
        w_fan      = cp_c * (tt21 - tt2)   # Fan work per kg TOTAL air (including bypass)
        self.stations[3] = EngineStation(t_total=tt3, p_total=pt3)
        self.math_trace.append(f"HPC: Tt3 = {tt3:.1f} K, Pt3 = {pt3/1e3:.1f} kPa, η_is_c = {eta_isen_c:.4f}")
        self.math_trace.append(f"HPC Work: wc_hp = {w_comp_hp/1e3:.1f} kJ/kg, Fan Work: w_fan = {w_fan/1e3:.1f} kJ/kg")

        # ── Station 4: HPT inlet ─────────────────────────────────────────
        tt4 = tit
        pt4 = pt3 * (1.0 - burner_dp_frac)
        f   = cp_c * (tt4 - tt3) / (burner_eta * h_fuel - cp_h * tt4)
        f   = max(f, 0.0)
        self.stations[4] = EngineStation(t_total=tt4, p_total=pt4)
        self.math_trace.append(f"Combustor: Tt4 = {tt4:.1f} K, Pt4 = {pt4/1e3:.1f} kPa, f = {f:.4f}")

        # ── HPT (drives HPC) ─────────────────────────────────────────────
        # Work match for HPT only (HPC)
        tt45  = tt4 - w_comp_hp / (cp_h * (1.0 + f))
        tau_hpt = tt45 / tt4
        eta_isen_hpt = self._poly_to_isen_turb(tau_hpt, eta_t)
        pt45_ratio   = (1.0 - (1.0 - tau_hpt) / eta_isen_hpt) ** (g_h / (g_h - 1.0))
        pt45 = pt4 * max(pt45_ratio, 1e-6)
        self.stations[45] = EngineStation(t_total=tt45, p_total=pt45)
        self.math_trace.append(f"HPT: Tt45 = {tt45:.1f} K, Pt45 = {pt45/1e3:.1f} kPa, η_is_hpt = {eta_isen_hpt:.4f}")

        # ── LPT (drives fan + LPC if any) ────────────────────────────────
        # LPT must supply fan work for (1+BPR) kg of air per kg core
        w_fan_total = w_fan * (1.0 + bpr)
        tt5   = tt45 - w_fan_total / (cp_h * (1.0 + f))
        tau_lpt = tt5 / tt45
        eta_isen_lpt = self._poly_to_isen_turb(tau_lpt, eta_t)
        pt5_ratio    = (1.0 - (1.0 - tau_lpt) / eta_isen_lpt) ** (g_h / (g_h - 1.0))
        pt5 = pt45 * max(pt5_ratio, 1e-6)
        self.stations[5] = EngineStation(t_total=tt5, p_total=pt5)
        self.math_trace.append(f"LPT: Tt5 = {tt5:.1f} K, Pt5 = {pt5/1e3:.1f} kPa, η_is_lpt = {eta_isen_lpt:.4f}")

        # ── Core nozzle (afterburner optional) ────────────────────────────
        f_ab = 0.0
        pt9_in = pt5 * 0.98
        tt9_in = tt5
        if ab_enabled:
            tt9_in = ab_temp
            pt9_in = pt5 * 0.95
            f_ab   = cp_h * (ab_temp - tt5) / (eta_ab * h_fuel - cp_h * ab_temp)
            f_ab   = max(f_ab, 0.0)
            self.math_trace.append(f"Afterburner: Tt7 = {tt9_in:.1f} K, Pt7 = {pt9_in/1e3:.1f} kPa, f_ab = {f_ab:.4f}")
        self.stations[7] = EngineStation(t_total=tt9_in, p_total=pt9_in)

        # Core nozzle exit
        g_n_c = g_h
        v9, ps9, ts9, m9 = self._nozzle_exit(pt9_in, tt9_in, self.p0, g_n_c, R_AIR)
        self.math_trace.append(f"Core Nozzle Exit: V9 = {v9:.1f} m/s, M9 = {m9:.2f}, Ps9 = {ps9/1e3:.1f} kPa")

        # ── Bypass nozzle ─────────────────────────────────────────────────
        pt19 = pt21 * 0.99
        tt19 = tt21
        self.stations[19] = EngineStation(t_total=tt19, p_total=pt19, mdot_frac=bpr)
        v19, ps19, ts19, m19 = self._nozzle_exit(pt19, tt19, self.p0, g_c, R_AIR)
        self.math_trace.append(f"Bypass Nozzle Exit: V19 = {v19:.1f} m/s, M19 = {m19:.2f}, Ps19 = {ps19/1e3:.1f} kPa")

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

        # ── Installation Losses ──────────────────────────────────────────
        # Losses based on total engine airflow (core + bypass)
        drag_inlet = v0 * phi_inlet
        f_gross_total = ((1.0 + f_total) * v9 + (ps9 - self.p0) * (R_AIR * ts9 / ps9 * (1.0 + f_total) / max(v9, 1.0)) +
                         bpr * v19 + (ps19 - self.p0) * (R_AIR * ts19 / ps19 * bpr / max(v19, 1.0))) / (1.0 + bpr)
        
        # Installed thrust: (F_gross_total * eta) - V0 - D_inlet
        spec_thrust_installed = (f_gross_total * eta_install_nozzle) - v0 - drag_inlet
        drag_nozzle = f_gross_total * (1.0 - eta_install_nozzle)
        
        tsfc_installed = fuel_flow_frac / spec_thrust_installed if spec_thrust_installed > 0 else 0.0
        self.math_trace.append(f"Installation: Drag_inlet={drag_inlet:.1f}, Nozzle_Efficiency={eta_install_nozzle:.3f}")

        # ── Mixed Exhaust Logic ───────────────────────────────────────────
        if mixed_exhaust:
            # MIXER station 5 (core exit) + station 19 (bypass exit) -> station 7 (mixed)
            # Energy Balance: (1+f)*Cp_h*Tt5 + BPR*Cp_c*Tt19 = (1+f+BPR)*Cp_mix*Tt_mix
            m_core = 1.0 + f
            m_bypass = bpr
            m_total = m_core + m_bypass
            cp_mix = (m_core * cp_h + m_bypass * cp_c) / m_total
            tt_mix = (m_core * cp_h * tt5 + m_bypass * cp_c * tt19) / (m_total * cp_mix)
            
            # Pressure Balance: Simplified mixer with moderate pressure loss
            # pt_mix = min(pt5, pt19) * mixer_loss_factor
            pt_mix = min(pt5, pt19) * 0.98
            self.stations[7] = EngineStation(t_total=tt_mix, p_total=pt_mix)
            self.math_trace.append(f"Mixer: Tt_mix = {tt_mix:.1f} K, Pt_mix = {pt_mix/1e3:.1f} kPa")
            
            # Afterburner (Mixed stream)
            f_ab_mix = 0.0
            tt9_in = tt_mix
            pt9_in = pt_mix
            if ab_enabled:
                tt9_in = ab_temp
                pt9_in = pt_mix * 0.95
                f_ab_mix = cp_mix * (ab_temp - tt_mix) / (eta_ab * h_fuel - cp_mix * ab_temp)
                f_ab_mix = max(f_ab_mix, 0.0)
                self.math_trace.append(f"Augmentor (Mixed): Tt7 = {tt9_in:.1f} K, Pt7 = {pt9_in/1e3:.1f} kPa, f_ab = {f_ab_mix:.4f}")
            
            # Use Mixed Nozzle
            g_mix = (m_core * g_h + m_bypass * g_c) / m_total
            v9_mix, ps9_mix, ts9_mix, m9_mix = self._nozzle_exit(pt9_in, tt9_in, self.p0, g_mix, R_AIR)
            self.stations[9] = EngineStation(t_total=ts9_mix, p_total=ps9_mix) # Note: _nozzle_exit returns static
            
            # Mixed Thrust (Thrust per TOTAL unit airflow)
            f_tot_mixed = (f + f_ab_mix) / m_total
            # Gross Thrust: (1+f_tot)*V9 + (Ps9-P0)*A9
            a9_mix = R_AIR * ts9_mix / ps9_mix
            fg_mix = (1.0 + f_tot_mixed) * v9_mix + (ps9_mix - self.p0) * a9_mix / m_total
            
            spec_thrust_installed = (fg_mix * eta_install_nozzle) - v0 - drag_inlet
            spec_thrust = (1.0 + f_tot_mixed) * v9_mix - v0 # uninstalled
            tsfc_installed = f_tot_mixed / spec_thrust_installed if spec_thrust_installed > 0 else 0.0
            
            self.math_trace.append(f"Mixed Nozzle: V9 = {v9_mix:.1f} m/s, M9 = {m9_mix:.2f}")
            # Update result fields for mixed case
            result_update = {
                "spec_thrust": spec_thrust,
                "spec_thrust_installed": spec_thrust_installed,
                "tsfc": f_tot_mixed / spec_thrust if spec_thrust > 0 else 0.0,
                "tsfc_installed": tsfc_installed,
                "f_ab": f_ab_mix,
                "drag_nozzle": fg_mix * (1.0 - eta_install_nozzle),
            }
        else:
            result_update = {}

        # ── Efficiency ────────────────────────────────────────────────────
        q_in     = (f_total / (1.0 + bpr)) * h_fuel
        ke_core  = 0.5 * (1.0 + f_total) / (1.0 + bpr) * v9 ** 2
        ke_byp   = 0.5 * bpr / (1.0 + bpr) * v19 ** 2
        ke_in    = 0.5 * v0 ** 2
        eta_thermal  = (ke_core + ke_byp - ke_in) / q_in if q_in > 0 else 0.0
        eta_prop = spec_thrust * v0 / (ke_core + ke_byp - ke_in) if (ke_core + ke_byp - ke_in) > 0 else 0.0
        eta_overall  = eta_thermal * eta_prop

        res = {
            'engine_type': 'turbofan',
            'bpr': bpr,
            'fpr': fpr,
            'opr': opr,
            # Perf
            'spec_thrust': spec_thrust,
            'spec_thrust_installed': spec_thrust_installed,
            'tsfc': tsfc,
            'tsfc_installed': tsfc_installed,
            'drag_inlet': drag_inlet,
            'drag_nozzle': drag_nozzle,
            'f': f,
            'f_ab': f_ab,
            'f_total': f_total,
            'math_trace': self.math_trace,
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
        res.update(result_update)
        return res
