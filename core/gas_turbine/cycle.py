import math
from typing import Any
import cantera as ct
from ..units import R_AIR

# ── Thermodynamic constants ──────────────────────────────────────────
# We now use Cantera for high-fidelity gas properties.
# Defaulting to GRI 3.0 for combustion products and air.
GAS = ct.Solution('gri30.yaml')

def get_gas_props(t_k: float, p_pa: float, f: float = 0.0, species: str = 'CH4:1.0') -> tuple[float, float, float]:
    """
    Returns (gamma, cp, mw) at a given (T, P) and fuel-to-air ratio.

    Utilizes Cantera for high-fidelity real-gas properties.

    Args:
        t_k: Stagnation temperature [K].
        p_pa: Stagnation pressure [Pa].
        f: Fuel-to-air ratio. Defaults to 0.0.
        species: Fuel species identifier for Cantera. Defaults to 'CH4:1.0'.

    Returns:
        tuple: (gamma, cp [J/kg/K], mean_molecular_weight [kg/kmol]).
    """
    GAS.TP = t_k, p_pa
    if f > 0:
        # Equivalence ratio from fuel-to-air ratio
        # Assumes stoichiometric f = 0.068 (typical for Jet-A/CH4)
        phi = f / 0.068 
        phi = max(0.0, min(phi, 1.2)) # Bound for stability
        GAS.set_equivalence_ratio(phi, species, 'O2:1.0, N2:3.76')
        GAS.TP = t_k, p_pa
    else:
        # Set to pure air (simplified with N2 and O2)
        GAS.X = 'N2:0.79, O2:0.21'
        GAS.TP = t_k, p_pa
    
    cp = GAS.cp
    mw = GAS.mean_molecular_weight
    gamma = cp / (cp - ct.gas_constant / mw)
    return gamma, cp, mw


class EngineStation:
    """Stores stagnation thermodynamic state at one engine cross-section."""

    def __init__(self, t_total=0.0, p_total=0.0, mach=0.0, mdot_frac=1.0):
        self.tt = t_total
        self.pt = p_total
        self.m  = mach
        self.mdot_frac = mdot_frac   # fraction of inlet mass flow

    def get_entropy(self, cp: float = 1005.0, r: float = R_AIR) -> float:
        """
        Calculates relative entropy.

        Formula: s = cp·ln(Tt) − R·ln(Pt)

        Args:
            cp: Specific heat at constant pressure [J/kg/K].
            r: Specific gas constant [J/kg/K].

        Returns:
            float: Relative entropy.
        """
        if self.tt <= 0 or self.pt <= 0:
            return 0.0
        return cp * math.log(self.tt) - r * math.log(self.pt)


class CycleAnalyzer:
    """
    Gas Turbine Cycle Analysis Core (v2.0.1-STABLE)

    High-fidelity Brayton cycle solver using Cantera for real-gas thermodynamic properties.
    Models on-design performance for turbojets and turbofans.

    Propulsion models are based on constant-pressure combustion and 
    polytropic/adiabatic component efficiencies.

    Station Convention (AIAA):
    - 0: Ambient / Free-stream
    - 2: Fan / Compressor Inlet
    - 3: High-Pressure Compressor Exit / Burner Inlet
    - 4: Turbine Inlet (TIT)
    - 4.5: High-Pressure Turbine Exit / Low-Pressure Turbine Inlet
    - 5: Core Exit
    - 7: Afterburner / Mixer Inlet
    - 9: Nozzle Exit
    """

    def __init__(self, p0_pa: float, t0_k: float, mach: float):
        self.p0 = p0_pa
        self.t0 = t0_k
        self.m0 = mach
        
        # Initial guess for gamma
        g0, cp0, _ = get_gas_props(t0_k, p0_pa)
        
        self.tt0 = t0_k * (1.0 + 0.5 * (g0 - 1.0) * mach ** 2)
        
        # Accurate gas props at freestream total condition
        g_t0, cp_t0, _ = get_gas_props(self.tt0, p0_pa)
        self.pt0 = p0_pa * (1.0 + 0.5 * (g_t0 - 1.0) * mach ** 2) ** (
            g_t0 / (g_t0 - 1.0)
        )
        self.stations: dict[int, EngineStation] = {}
        self.math_trace = []
        
        self.math_trace.append(f"Ambient Conditions (Cantera): P0={p0_pa/1e3:.1f} kPa, T0={t0_k:.1f} K, M={mach:.2f}")
        self.math_trace.append(f"Freestream Total: tt0={self.tt0:.1f} K, pt0={self.pt0/1e3:.1f} kPa (gamma={g_t0:.4f})")
        self.stations[0] = EngineStation(t_total=self.tt0, p_total=self.pt0, mach=mach)

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────
    def _poly_to_isen_comp(self, prc: float, eta_poly: float, g: float) -> float:
        """Compressor isentropic efficiency from polytropic efficiency."""
        exp = (g - 1.0) / g
        ideal = prc ** exp - 1.0
        actual = prc ** (exp / eta_poly) - 1.0
        return ideal / actual if actual != 0 else 1.0

    def _poly_to_isen_turb(self, tau_t: float, eta_poly: float, g: float) -> float:
        """Turbine isentropic efficiency from polytropic efficiency & temp ratio."""
        if abs(1.0 - tau_t) < 1e-9:
            return eta_poly
        exp = (g - 1.0) / g
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
        eta_mech_hp: float = 0.99,
        eta_mech_lp: float = 0.99,
    ) -> dict[str, Any]:
        """
        Solves a single-spool turbojet cycle using Cantera properties.

        Args:
            prc: Compressor Pressure Ratio.
            tit: Turbine Inlet Temperature [K].
            eta_c: Compressor polytropic efficiency.
            eta_t: Turbine polytropic efficiency.
            eta_ab: Afterburner efficiency.
            h_fuel: Lower Heating Value of fuel [J/kg].
            ab_enabled: Whether afterburning is active.
            ab_temp: Afterburner exit temperature [K].
            inlet_recovery: Inlet total pressure recovery factor.
            burner_eta: Combustion efficiency.
            burner_dp_frac: Burner total pressure drop fraction.
            nozzle_dp_frac: Nozzle total pressure drop fraction.
            phi_inlet: Inlet spillage/drag fraction.
            eta_install_nozzle: Nozzle installation efficiency.
            eta_mech_hp: Mechanical efficiency of HP spool.
            eta_mech_lp: Mechanical efficiency of LP spool.

        Returns:
            dict: Performance metrics including specific thrust and TSFC.
        """
        # ── Station 2: Inlet exit ─────────────────────────────────────────
        pt2 = self.pt0 * inlet_recovery
        tt2 = self.tt0
        self.stations[2] = EngineStation(t_total=tt2, p_total=pt2)
        g2, cp2, _ = get_gas_props(tt2, pt2)

        # ── Station 3: HPC exit ───────────────────────────────────────────
        eta_isen_c = self._poly_to_isen_comp(prc, eta_c, g2)
        tt3_ideal  = tt2 * prc ** ((g2 - 1.0) / g2)
        tt3        = tt2 + (tt3_ideal - tt2) / eta_isen_c
        pt3        = pt2 * prc
        
        # Use mid-point gas props for more accurate work
        _, cp_c_avg, _ = get_gas_props(0.5*(tt2+tt3), pt3)
        w_comp     = cp_c_avg * (tt3 - tt2)
        self.stations[3] = EngineStation(t_total=tt3, p_total=pt3)
        self.math_trace.append(f"Compression: Tt3={tt3:.1f} K, Work={w_comp/1e3:.1f} kJ/kg (η_is={eta_isen_c:.4f})")

        # ── Station 4: Turbine inlet ───────────────────────────────────────
        tt4 = tit
        pt4 = pt3 * (1.0 - burner_dp_frac)
        
        # Iterative f calculation using enthalpy balance
        # h_fuel_eff = burner_eta * h_fuel
        # (1+f)*h4 = h3 + f*h_fuel_eff  => f = (h4 - h3) / (h_fuel_eff - h4)
        _, cp4_0, _ = get_gas_props(tt4, pt4, f=0.02) # Guess f for props
        f = (cp4_0 * tt4 - cp_c_avg * tt3) / (burner_eta * h_fuel - cp4_0 * tt4)
        f = max(f, 0.0)
        
        # Refine with calculated f
        g4, cp4, mw4 = get_gas_props(tt4, pt4, f=f)
        self.stations[4] = EngineStation(t_total=tt4, p_total=pt4)
        self.math_trace.append(f"Combustor: Tt4={tt4:.1f} K, f={f:.4f}, Gas Props: gamma={g4:.4f}, cp={cp4:.1f}")

        # ── Station 5: Turbine exit ────────────────────────────────────────
        # Power balance: cp_turb_avg * (1+f) * ΔTt_turb * eta_mech_hp = cp_comp_avg * ΔTt_comp
        # ΔTt_turb = w_comp / (cp_turb_avg * (1+f) * eta_mech_hp)
        tt5 = tt4 - w_comp / (cp4 * (1.0 + f) * eta_mech_hp)
        tau_t = tt5 / tt4
        eta_isen_t = self._poly_to_isen_turb(tau_t, eta_t, g4)
        pt5_ratio  = (1.0 - (1.0 - tau_t) / eta_isen_t) if (eta_isen_t > 0 and abs(1-tau_t) > 1e-6) else 1.0
        pt5        = pt4 * max(pt5_ratio, 1e-4) ** (g4 / (g4 - 1.0))
        
        # Refine tt5 with mid-point properties
        _, cp_t_avg, _ = get_gas_props(0.5*(tt4+tt5), 0.5*(pt4+pt5), f=f)
        tt5   = tt4 - w_comp / (cp_t_avg * (1.0 + f) * eta_mech_hp)
        self.stations[5] = EngineStation(t_total=tt5, p_total=pt5)
        self.math_trace.append(f"Turbine: Tt5={tt5:.1f} K, Pt5/Pt4={pt5/pt4:.3f}, η_is={eta_isen_t:.4f}")

        # ── Afterburner ────────────────────────────────────────────────────
        f_ab = 0.0
        pt9_in = pt5 * (1.0 - nozzle_dp_frac)
        tt9_in = tt5
        if ab_enabled:
            tt9_in = ab_temp
            pt9_in = pt5 * 0.95
            _, cp7, _ = get_gas_props(tt9_in, pt9_in, f=f+0.05)
            f_ab   = cp4 * (ab_temp - tt5) / (eta_ab * h_fuel - cp7 * ab_temp)
            f_ab   = max(f_ab, 0.0)
            self.math_trace.append(f"Afterburner: Tt7={tt9_in:.1f} K, f_ab={f_ab:.4f}")
        self.stations[7] = EngineStation(t_total=tt9_in, p_total=pt9_in)

        # ── Station 9: Nozzle exit ─────────────────────────────────────────
        f_total = f + f_ab
        gn, cpn, mwn = get_gas_props(tt9_in, pt9_in, f=f_total)
        rn = ct.gas_constant / mwn
        v9, ps9, ts9, m9 = self._nozzle_exit(pt9_in, tt9_in, self.p0, gn, rn)
        
        v0 = self.m0 * math.sqrt(g2 * R_AIR * self.t0)

        f_gross = (1.0 + f_total) * v9 + (ps9 - self.p0) * (rn * ts9 / ps9 * (1.0 + f_total) / max(v9, 1.0))
        spec_thrust_installed = (f_gross * eta_install_nozzle) - v0 - (v0 * phi_inlet)
        tsfc_installed = f_total / spec_thrust_installed if spec_thrust_installed > 0 else 0.0
        
        # ── Efficiency ─────────────────────────────────────────────────────
        q_in = f_total * h_fuel
        # Ideal exhaust velocity for thermal efficiency (expanded to P0)
        v9_fe = math.sqrt(max(0.0, 2.0 * cpn * tt9_in * (1.0 - (self.p0 / pt9_in) ** ((gn - 1.0) / gn))))
        eta_thermal = (0.5 * (1.0 + f_total) * v9_fe**2 - 0.5 * v0**2) / q_in if q_in > 0 else 0.0
        eta_prop = 2.0 * v0 / (v9 + v0) if (v9 + v0) > 1e-3 else 0.0

        return {
            'engine_type': 'turbojet',
            'spec_thrust': spec_thrust_installed, # Standardized key
            'tsfc': tsfc_installed,               # Standardized key
            'f_total': f_total,
            'eta_thermal': eta_thermal,
            'eta_propulsive': eta_prop,
            'eta_overall': eta_thermal * eta_prop,
            'tt3': tt3, 'tt5': tt5, 'pt5': pt5, 'v9': v9, 'm9': m9,
            'math_trace': self.math_trace,
            'stations': { k: {'tt': v.tt, 'pt': v.pt, 's': v.get_entropy()} for k, v in self.stations.items() }
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
        eta_mech_hp: float = 0.99,
        eta_mech_lp: float = 0.99,
        lpc_pr: float = 1.0,
    ) -> dict[str, Any]:
        """
        Solves a dual-spool turbofan cycle using Cantera properties.

        Args:
            bpr: Bypass Ratio.
            fpr: Fan Pressure Ratio.
            opr: Overall Pressure Ratio.
            tit: Turbine Inlet Temperature [K].
            eta_fan: Fan polytropic efficiency.
            eta_c: HPC polytropic efficiency.
            eta_t: Turbine polytropic efficiency.
            eta_ab: Afterburner efficiency.
            h_fuel: Lower Heating Value of fuel [J/kg].
            ab_enabled: Whether afterburning is active.
            ab_temp: Afterburner exit temperature [K].
            inlet_recovery: Inlet total pressure recovery factor.
            burner_eta: Combustion efficiency.
            burner_dp_frac: Burner total pressure drop fraction.
            mixed_exhaust: Whether core and bypass streams are mixed.
            phi_inlet: Inlet spillage/drag fraction.
            eta_install_nozzle: Nozzle installation efficiency.
            eta_mech_hp: Mechanical efficiency of HP spool.
            eta_mech_lp: Mechanical efficiency of LP spool.
            lpc_pr: Low Pressure Compressor (Booster) pressure ratio.

        Returns:
            dict: Performance metrics including specific thrust and TSFC.
        """
        # ── Station 2: Inlet exit ─────────────────────────────────────────
        pt2 = self.pt0 * inlet_recovery
        tt2 = self.tt0
        self.stations[2] = EngineStation(t_total=tt2, p_total=pt2)
        g2, cp2, _ = get_gas_props(tt2, pt2)

        # ── Station 21: Fan exit (bypass & core entry) ───────────────────
        eta_isen_fan = self._poly_to_isen_comp(fpr, eta_fan, g2)
        tt21_ideal   = tt2 * fpr ** ((g2 - 1.0) / g2)
        tt21         = tt2 + (tt21_ideal - tt2) / eta_isen_fan
        pt21         = pt2 * fpr
        _, cp_fan_avg, _ = get_gas_props(0.5*(tt2+tt21), pt21)
        w_fan_per_kg = cp_fan_avg * (tt21 - tt2) # Work spent on 1kg of total air
        self.stations[21] = EngineStation(t_total=tt21, p_total=pt21, mdot_frac=bpr)

        # ── LPC / Booster (core flow only, driven by LP spool) ────────────
        g21, cp21, _ = get_gas_props(tt21, pt21)
        eta_isen_lpc = self._poly_to_isen_comp(lpc_pr, eta_fan, g21) # assume fan eta for lpc for now
        tt25_ideal   = tt21 * lpc_pr ** ((g21 - 1.0) / g21)
        tt25         = tt21 + (tt25_ideal - tt21) / eta_isen_lpc
        pt25         = pt21 * lpc_pr
        _, cp_lpc_avg, _ = get_gas_props(0.5*(tt21+tt25), pt25)
        w_lpc        = cp_lpc_avg * (tt25 - tt21) # per kg of core flow
        self.stations[25] = EngineStation(t_total=tt25, p_total=pt25)

        # ── HPC pressure ratio ────────────────────────────────────────────
        hpc_pr = opr / (fpr * lpc_pr) if (fpr * lpc_pr) > 0 else opr
        hpc_pr = max(hpc_pr, 1.0)
        
        # ── Station 3: HPC exit ───────────────────────────────────────────
        g25, cp25, _ = get_gas_props(tt25, pt25)
        eta_isen_c = self._poly_to_isen_comp(hpc_pr, eta_c, g25)
        tt3_ideal  = tt25 * hpc_pr ** ((g25 - 1.0) / g25)
        tt3        = tt25 + (tt3_ideal - tt25) / eta_isen_c
        pt3        = pt25 * hpc_pr
        _, cp_hpc_avg, _ = get_gas_props(0.5*(tt25+tt3), pt3)
        w_comp_hp  = cp_hpc_avg * (tt3 - tt25) # specific work into core compressor
        self.stations[3] = EngineStation(t_total=tt3, p_total=pt3)

        # ── Station 4: HPT inlet ─────────────────────────────────────────
        tt4 = tit
        pt4 = pt3 * (1.0 - burner_dp_frac)
        _, cp4, mw4 = get_gas_props(tt4, pt4, f=0.04) # Initial guess
        f = cp_hpc_avg * (tt4 - tt3) / (burner_eta * h_fuel - cp4 * tt4)
        f = max(f, 0.0)
        gh, cph, mwh = get_gas_props(tt4, pt4, f=f)
        self.stations[4] = EngineStation(t_total=tt4, p_total=pt4)

        # ── HPT (drives HPC) ─────────────────────────────────────────────
        # W_hpt * (1+f) * eta_mech_hp = W_hpc
        tt45 = tt4 - w_comp_hp / (cph * (1.0 + f) * eta_mech_hp)
        tau_hpt = tt45 / tt4
        eta_isen_hpt = self._poly_to_isen_turb(tau_hpt, eta_t, gh)
        pt45 = pt4 * max( (1.0 - (1.0-tau_hpt)/eta_isen_hpt), 1e-4)**(gh/(gh-1.0))
        self.stations[45] = EngineStation(t_total=tt45, p_total=pt45)

        # ── LPT (drives Fan & LPC) ───────────────────────────────────────
        # LPT work * (1 + f) * eta_mech_lp = Power_Fan + Power_LPC
        # w_fan_total is work on whole air per kg of core flow: W_fan * (1+BPR)
        # Power_LPC is W_lpc * 1 (per 1kg core flow)
        w_lp_spool_total = w_fan_per_kg * (1.0 + bpr) + w_lpc
        _, cph_avg_lp, _ = get_gas_props(tt45, pt45, f=f)
        tt5 = tt45 - w_lp_spool_total / (cph_avg_lp * (1.0 + f) * eta_mech_lp)
        tau_lpt = tt5 / tt45
        eta_isen_lpt = self._poly_to_isen_turb(tau_lpt, eta_t, gh)
        pt5 = pt45 * max( (1.0 - (1.0-tau_lpt)/eta_isen_lpt), 1e-4)**(gh/(gh-1.0))
        self.stations[5] = EngineStation(t_total=tt5, p_total=pt5)

        # ── Nozzle / Exhaust Analysis ─────────────────────────────────────
        v0 = self.m0 * math.sqrt(g2 * R_AIR * self.t0)
        
        if mixed_exhaust:
            # MIXER station 5 (core exit) + station 21 (bypass exit) -> station 7 (mixed)
            m_core = 1.0 + f
            m_bypass = bpr
            m_total = m_core + m_bypass
            
            # Use Enthalpy balance for Tt_mix: sum(mdot * h_total) / sum(mdot)
            # h(T) = Cp_avg * T. We'll use a precise iterate or mass-weighted average.
            _, cp21_m, _ = get_gas_props(tt21, pt21)
            _, cp5_m, _ = get_gas_props(tt5, pt5, f=f)
            
            h_tot_core = cp5_m * tt5
            h_tot_byp  = cp21_m * tt21
            h_tot_mix  = (m_core * h_tot_core + m_bypass * h_tot_byp) / m_total
            
            # Resulting Tt_mix (initial guess)
            tt_mix = h_tot_mix / ((m_core*cp5_m + m_bypass*cp21_m)/m_total)
            # Refine Tt_mix with mixed gas props
            g_mix, cp_mix, _ = get_gas_props(tt_mix, min(pt5, pt21), f=(f/m_total))
            tt_mix = h_tot_mix / cp_mix
            
            pt_mix = min(pt5, pt21) * 0.98
            
            if ab_enabled:
                tt9_in = ab_temp
                pt9_in = pt_mix * 0.95
                _, cp7, mw7 = get_gas_props(tt9_in, pt9_in, f=(f/m_total)+0.05)
                f_ab = (m_total * cp7 * (ab_temp - tt_mix)) / (eta_ab * h_fuel)
                f_ab = max(f_ab, 0.0)
            else:
                tt9_in = tt_mix
                pt9_in = pt_mix
                f_ab = 0.0
            
            gn, cpn, mwn = get_gas_props(tt9_in, pt9_in, f=((f+f_ab)/m_total))
            rn = ct.gas_constant / mwn
            v9, ps9, ts9, m9 = self._nozzle_exit(pt9_in, tt9_in, self.p0, gn, rn)
            
            fg_mix = (m_total) * v9 + (ps9 - self.p0) * (rn * ts9 / ps9 * m_total / max(v9, 1.0))
            spec_thrust = (fg_mix - (1.0 + bpr) * v0) / (1.0 + bpr)
            spec_thrust_installed = (fg_mix * eta_install_nozzle - (1.0 + bpr) * v0 - v0 * phi_inlet) / (1.0 + bpr)
            tsfc_installed = (f + f_ab) / ((1.0 + bpr) * spec_thrust_installed) if spec_thrust_installed > 0 else 0.0
            
            return {
                'engine_type': 'turbofan_mixed',
                'spec_thrust': spec_thrust_installed, # Standardized key
                'tsfc': tsfc_installed,               # Standardized key
                'f_total': (f + f_ab),
                'math_trace': self.math_trace + [f"Mixed exhaust logic applied: Tt_mix={tt_mix:.1f} K, Pt_mix={pt_mix/1e3:.1f} kPa"],
                'stations': { k: {'tt': v.tt, 'pt': v.pt} for k, v in self.stations.items() }
            }
        else:
            # Separate streams
            # Core Nozzle (9)
            pt9_in = pt5 * 0.98
            gn_c, cpn_c, mwn_c = get_gas_props(tt5, pt9_in, f=f)
            v9, ps9, ts9, m9 = self._nozzle_exit(pt9_in, tt5, self.p0, gn_c, ct.gas_constant/mwn_c)
            # Bypass Nozzle (19)
            pt19_in = pt21 * 0.99
            gn_b, cpn_b, mwn_b = get_gas_props(tt21, pt19_in)
            v19, ps19, ts19, m19 = self._nozzle_exit(pt19_in, tt21, self.p0, gn_b, ct.gas_constant/mwn_b)
            
            f_gross_core = (1.0 + f) * v9 + (ps9 - self.p0) * (ct.gas_constant/mwn_c * ts9 / ps9 * (1.0+f) / max(v9, 1.0))
            f_gross_byp = bpr * v19 + (ps19 - self.p0) * (ct.gas_constant/mwn_b * ts19 / ps19 * bpr / max(v19, 1.0))
            
            spec_thrust_installed = ( (f_gross_core + f_gross_byp) * eta_install_nozzle - (1.0 + bpr) * v0 - v0 * phi_inlet ) / (1.0 + bpr)
            tsfc_installed = (f / (1.0 + bpr)) / spec_thrust_installed if spec_thrust_installed > 0 else 0.0
            
            return {
                'engine_type': 'turbofan_separate',
                'spec_thrust': spec_thrust_installed, # Standardized key (fixed from spec_thrust_installed)
                'tsfc': tsfc_installed,               # Standardized key (fixed from tsfc_installed)
                'f_total': f,
                'math_trace': self.math_trace + ["Separate exhaust turbofan solved using Cantera."],
                'stations': { k: {'tt': v.tt, 'pt': v.pt} for k, v in self.stations.items() }
            }

    # ─────────────────────────────────────────────────────────────────────────
    # [STUB] Multi-Spool Work Matching (Sprint 5)
    # ─────────────────────────────────────────────────────────────────────────
    def solve_multispool(
        self,
        opr: float,
        bpr: float,
        fpr: float,
        lpc_pr: float,
        tit: float,
        eta_fan: float = 0.90,
        eta_lpc: float = 0.88,
        eta_hpc: float = 0.86,
        eta_hpt: float = 0.91,
        eta_lpt: float = 0.92,
        eta_mech_hp: float = 0.99,
        eta_mech_lp: float = 0.99,
        h_fuel: float = 42.8e6,
    ) -> dict:
        """
        [STUB] High-fidelity multi-spool turbofan work matching solver.

        Target Architecture: Military turbofan (LPC + HPC + HPT + LPT, separate or mixed exhaust).

        Planned work-matching algorithm (Sprint 5):
        ---------------------------------------------------------
        1. FAN (Station 21): Solve fan compression, fixed FPR.
           W_fan = mdot_total * Cp_fan * ΔTt_fan

        2. LPC / BOOSTER (Station 25): Solve LPC with its own lpc_pr.
           W_lpc = mdot_core * Cp_lpc * ΔTt_lpc

        3. HPC (Station 3): hpc_pr = opr / (fpr * lpc_pr).
           W_hpc = mdot_core * Cp_hpc * ΔTt_hpc

        4. COMBUSTOR (Station 4): Enthalpy balance for fuel-to-air ratio.
           f = (Cp4*T4 - Cp3*T3) / (eta_b * LHV - Cp4*T4)

        5. HPT (Station 45): Power balance to drive HPC only.
           W_hpt * (1+f) * eta_mech_hp = W_hpc
           Iterate until Tt45 and Pt45 converge.

        6. LPT (Station 5): Power balance to drive FAN + LPC.
           W_lpt * (1+f) * eta_mech_lp = W_fan*(1+BPR) + W_lpc
           Iterate until Tt5 and Pt5 converge.

        7. NOZZLE (Station 9 / 19): Choked/unchoked nozzle exit for core/bypass.

        8. WORK MATCH ITERATION: Outer loop adjusts N1/N2 operating lines
           until LP spool power balance closes to < 0.1% error.
        ---------------------------------------------------------

        Args:
            opr: Overall Pressure Ratio.
            bpr: Bypass Ratio.
            fpr: Fan Pressure Ratio.
            lpc_pr: LPC/Booster Pressure Ratio.
            tit: Turbine Inlet Temperature [K].
            eta_fan: Fan polytropic efficiency.
            eta_lpc: LPC polytropic efficiency.
            eta_hpc: HPC polytropic efficiency.
            eta_hpt: HPT polytropic efficiency.
            eta_lpt: LPT polytropic efficiency.
            eta_mech_hp: HP spool mechanical efficiency.
            eta_mech_lp: LP spool mechanical efficiency.
            h_fuel: Fuel Lower Heating Value [J/kg].

        Returns:
            dict: Placeholder (stub). Will return full station data and performance metrics.

        Raises:
            NotImplementedError: Always, until Sprint 5 implementation.
        """
        # TODO (Sprint 5): Implement full iterative work-matching loop.
        raise NotImplementedError(
            "solve_multispool() is a Sprint 5 deliverable. "
            "Use solve_turbofan() with lpc_pr parameter for interim analysis."
        )
