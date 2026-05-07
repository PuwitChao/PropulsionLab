"""
Rocket Propulsion Analysis Core (v2.0.1-STABLE)

Systematic solver for rocket combustion equilibrium and nozzle expansion.
Models high-fidelity thermochemistry using Cantera and standard aerospace correlations.

Key Capabilities:
- Equilibrium Composition: Shifting or Frozen flow models.
- Performance Modeling: ISP, Thrust Coefficients, Characteristic Velocity (c*).
- Thermal Loads: Bartz convective heat flux distribution along nozzle axis.
- Engine Sizing: Automated throat and exit area calculation from thrust targets.
"""

import math
from typing import Any, Optional
import cantera as ct
from ..units import G


class RocketAnalyzer:
    """
    High-fidelity rocket combustion and nozzle analyzer.
    
    Equations are based on the NASA Chemical Equilibrium with Applications (CEA) 
    methodology, adapted for real-time design iterations.
    
    This class uses Cantera for thermochemical equilibrium calculations,
    allowing for both shifting and frozen composition flow models.
    It incorporates standard aerospace correlations for nozzle losses (divergence, friction)
    and provides a Bartz model for convective heat transfer distribution along the nozzle wall.
    """

    def __init__(self, chamber_p_pa: float) -> None:
        """
        Initialize the analyzer with design chamber pressure.

        Args:
            chamber_p_pa: Combustion chamber stagnation pressure [Pa]. Must be > 0.
        """
        if chamber_p_pa <= 0:
            raise ValueError(f"chamber_p_pa must be positive, got {chamber_p_pa}")
        # Load the chemical mechanism. GRI30 provides excellent coverage for CH4, H2, and RP1 surrogates.
        # Note: transport_model='mixture-averaged' is required for viscosity/thermal_conductivity
        self.gas  = ct.Solution('gri30.yaml', transport_model='mixture-averaged')
        self.pc   = chamber_p_pa
        self.propellants = {
            # Rocket Standard Liquid Propellants
            'H2/O2'       : {'fuel': 'H2',      'ox': 'O2',     'stoich': 7.94},
            'CH4/O2'      : {'fuel': 'CH4',     'ox': 'O2',     'stoich': 4.00},
            'RP1/O2'      : {'fuel': 'C3H8',    'ox': 'O2',     'stoich': 3.63},  # Surrogate (Propane)
            'Propane/O2'  : {'fuel': 'C3H8',    'ox': 'O2',     'stoich': 3.63},
            'Ethanol/O2'  : {'fuel': 'C2H5OH',  'ox': 'O2',     'stoich': 2.09},  # Ethanol (actual species)
            'Methanol/O2' : {'fuel': 'CH3OH',   'ox': 'O2',     'stoich': 1.50},
            'Ammonia/O2'  : {'fuel': 'NH3',     'ox': 'O2',     'stoich': 1.41},
            
            # High Energy / Tactical
            'C2H2/O2'     : {'fuel': 'C2H2',    'ox': 'O2',     'stoich': 3.07},
            'C2H4/O2'     : {'fuel': 'C2H4',    'ox': 'O2',     'stoich': 3.42},
            'C2H6/O2'      : {'fuel': 'C2H6',    'ox': 'O2',     'stoich': 3.72},
            
            # Nitrous Oxide based (Hybrid/Small)
            'CH4/N2O'     : {'fuel': 'CH4',     'ox': 'N2O',    'stoich': 11.0},
            'C3H8/N2O'    : {'fuel': 'C3H8',    'ox': 'N2O',    'stoich': 9.98},
            
            # Hypergolic (Storable)
            'UDMH/N2O4'    : {'fuel': 'C2H8N2',  'ox': 'N2O4',   'stoich': 2.61},
            'MMH/N2O4'     : {'fuel': 'CH6N2',   'ox': 'N2O4',   'stoich': 1.64},
        }

    # ─────────────────────────────────────────────────────────────────────────
    # Bartz correlation helper
    # ─────────────────────────────────────────────────────────────────────────
    def _bartz_heat_flux(
        self,
        stations_n: int,
        r_throat: float,
        gamma: float,
        mw: float,
        t_chamber: float,
        visc_chamber: float,
        cp_chamber: float,
        cond_chamber: float,
        c_star: float,
        r_curvature_throat: Optional[float] = None,
    ) -> dict[str, Any]:
        """
        Bartz (1957) convective heat transfer coefficient along nozzle axis.

        Evaluates at the throat and along the divergent section using the 
        standard Bartz correlation for rocket nozzles.

        Args:
            stations_n: Number of axial stations to evaluate.
            r_throat: Throat radius [m].
            gamma: Specific heat ratio at chamber/throat.
            mw: Mean molecular weight [kg/kmol].
            t_chamber: Chamber stagnation temperature [K].
            visc_chamber: Gas viscosity at chamber [Pa-s].
            cp_chamber: Specific heat at constant pressure [J/kg/K].
            cond_chamber: Thermal conductivity [W/m/K].
            c_star: Characteristic velocity [m/s].
            r_curvature_throat: Wall curvature radius at throat [m]. 
                Defaults to 1.5 * r_throat.

        Returns:
            dict: Lists of axial stations, area ratios, heat fluxes [MW/m²], and h_gas values.
        """
        if r_curvature_throat is None:
            r_curvature_throat = 1.5 * r_throat

        # Prandtl number at chamber conditions
        pr = visc_chamber * cp_chamber / cond_chamber if cond_chamber > 0 else 0.72
        pr = max(pr, 0.3)

        # Bartz reference heat transfer coeff at throat
        # h_throat = (0.026 / D_t^0.2) * (mu^0.2 * Cp / Pr^0.6) * (Pc/c*)^0.8 * (D_t/Rc)^0.1
        D_t = 2.0 * r_throat
        k1  = 0.026
        mu  = visc_chamber
        h0_factor = (mu ** 0.2 * cp_chamber / pr ** 0.6) * (self.pc / c_star) ** 0.8

        h_throat = (k1 / D_t ** 0.2) * h0_factor * (D_t / r_curvature_throat) ** 0.1

        # Evaluate at several area ratio stations
        area_ratios = []
        x_norm      = []     # x/r_throat
        q_vals      = []
        h_vals      = []

        g = gamma
        r_gas = ct.gas_constant / mw

        for i in range(stations_n):
            frac = i / max(stations_n - 1, 1)
            # Vary Mach from 1.0 at throat to ~3.5 at exit
            m = 1.0 + frac * 2.5

            # Local area ratio ε(M)
            eps = (1.0 / m) * ((2 / (g + 1)) * (1 + (g - 1) / 2 * m ** 2)) ** ((g + 1) / (2 * (g - 1)))
            area_ratios.append(round(eps, 4))

            # Local radius (r/r_throat = sqrt(eps))
            r_local = r_throat * math.sqrt(eps)
            x_norm.append(round(r_local / r_throat, 4))

            # Bartz correction factor σ (accounts for local conditions)
            t_ratio_wall = 0.85   # assumed wall/gas temperature ratio (T_wall/T_adiabatic)
            sigma = (0.5 * t_ratio_wall * (1 + (g - 1) / 2 * m ** 2) + 0.5) ** (-0.68) * \
                    (1 + (g - 1) / 2 * m ** 2) ** (-0.12)

            # Local h_gas using continuity-corrected area
            h_local = h_throat * (1.0 / eps) ** 0.9 * sigma

            # Adiabatic wall temperature (recovery factor ~0.92 for turbulent BL)
            pr_factor = (1 + 0.92 * (g - 1) / 2 * m ** 2)
            t_aw = t_chamber / (1 + (g - 1) / 2 * m ** 2) * pr_factor

            # Heat flux q = h * (T_aw - T_wall)  assuming T_wall = 600 K (typical regenerative)
            t_wall = 600.0
            q = max(h_local * (t_aw - t_wall), 0.0)

            q_vals.append(round(q / 1e6, 4))   # MW/m²
            h_vals.append(round(h_local, 2))

        return {
            'area_ratio'   : area_ratios,
            'x_norm'       : x_norm,
            'q_flux_MW_m2' : q_vals,
            'h_gas_W_m2_K' : h_vals,
            'h_throat'     : round(h_throat, 2),
        }

    # ─────────────────────────────────────────────────────────────────────────
    def solve_equilibrium(
        self,
        propellant_name: str,
        of_ratio: float,
        p_exit_pa: float = 101325,
        mode: str = 'shifting',
        exit_half_angle_deg: float = 15.0,
        thrust_target_N: Optional[float] = None,
        compute_heat_transfer: bool = True,
        impurity_species: Optional[str] = None,
        impurity_mass_frac: float = 0.0,
    ) -> dict[str, Any]:
        """
        Solves chamber equilibrium and nozzle expansion.

        Args:
            propellant_name: Key from self.propellants (e.g., 'H2/O2').
            of_ratio: Oxidizer-to-fuel mass ratio.
            p_exit_pa: Ambient exit pressure [Pa]. Defaults to 101325.
            mode: 'shifting' or 'frozen' equilibrium. Defaults to 'shifting'.
            exit_half_angle_deg: Nozzle exit half-angle. Defaults to 15.0.
            thrust_target_N: Optional vacuum thrust target for engine sizing [N].
            compute_heat_transfer: Enables Bartz heat flux calculation. Defaults to True.
            impurity_species: Optional species present in fuel (e.g., 'N2').
            impurity_mass_frac: Mass fraction of impurity in fuel.

        Returns:
            dict: Comprehensive results including Isp, thrust, dimensions, and composition.
        """
        if of_ratio <= 0:
            raise ValueError(f"of_ratio must be positive, got {of_ratio}")
        if propellant_name not in self.propellants:
            available = ', '.join(sorted(self.propellants.keys()))
            raise KeyError(f"Unknown propellant '{propellant_name}'. Available: {available}")

        math_trace = []
        prop = self.propellants[propellant_name]
        phi  = prop['stoich'] / of_ratio
        math_trace.append(f"Propellants: {propellant_name} (Stoich O/F: {prop['stoich']})")
        math_trace.append(f"Equivalence Ratio φ = {phi:.4f}")

        self.gas.TP = 300.0, self.pc
        if impurity_species and impurity_mass_frac > 0:
            # Handle impurity in fuel
            # Y_fuel = 1 - impurity_mass_frac, Y_impurity = impurity_mass_frac
            fuel_mix = {prop['fuel']: (1.0 - impurity_mass_frac), impurity_species: impurity_mass_frac}
            self.gas.set_equivalence_ratio(phi, fuel_mix, prop['ox'])
        else:
            self.gas.set_equivalence_ratio(phi, prop['fuel'], prop['ox'])

        # ── Chamber ──────────────────────────────────────────────────────
        self.gas.equilibrate('HP')
        t_chamber    = self.gas.T
        h_chamber    = self.gas.h
        math_trace.append(f"Chamber Equilibrium (HP): T={t_chamber:.1f} K, h={h_chamber/1e6:.3f} MJ/kg")
        s_chamber    = self.gas.s
        rho_chamber  = self.gas.density
        visc_chamber = self.gas.viscosity
        cond_chamber = self.gas.thermal_conductivity
        cp_chamber   = self.gas.cp
        mw_chamber   = self.gas.mean_molecular_weight
        gamma_chamber = cp_chamber / (cp_chamber - ct.gas_constant / mw_chamber)
        r_spec_chamber = ct.gas_constant / mw_chamber

        frozen_X = self.gas.X.copy() if mode == 'frozen' else None

        # ── Nozzle exit ───────────────────────────────────────────────────
        if mode == 'shifting':
            self.gas.SP = s_chamber, p_exit_pa
            self.gas.equilibrate('SP')
        else:
            self.gas.X = frozen_X
            self.gas.SP = s_chamber, p_exit_pa
            # In frozen mode composition must remain constant; re-assert the
            # saved mole fractions to prevent Cantera from re-equilibrating.
            self.gas.X = frozen_X

        t_exit   = self.gas.T
        h_exit   = self.gas.h
        rho_exit = self.gas.density
        visc_exit = self.gas.viscosity
        cond_exit = self.gas.thermal_conductivity

        v_exit_ideal = math.sqrt(max(0.0, 2.0 * (h_chamber - h_exit)))

        # ── Loss factors ──────────────────────────────────────────────────
        alpha_rad    = math.radians(exit_half_angle_deg)
        lambda_div   = 0.5 * (1.0 + math.cos(alpha_rad))
        cf_friction  = 0.985
        v_exit_delivered = v_exit_ideal * lambda_div * cf_friction
        math_trace.append(f"Ideal Exit Velocity: sqrt(2Δh) = {v_exit_ideal:.1f} m/s")
        math_trace.append(f"Delivered Velocity: Ve_ideal * λ_div({lambda_div:.3f}) * η_friction(0.985) = {v_exit_delivered:.1f} m/s")

        # ── c* ─────────────────────────────────────────────────────────────
        g  = gamma_chamber
        c_star = math.sqrt(r_spec_chamber * t_chamber / g) / (
            (2 / (g + 1)) ** ((g + 1) / (2 * (g - 1)))
        )
        math_trace.append(f"Characteristic Velocity c*: {c_star:.1f} m/s (using γ={g:.3f})")

        # ── Area ratio ε ──────────────────────────────────────────────────
        if mode == 'shifting':
            self.gas.TP = t_chamber * (2 / (g + 1)), self.pc * (2 / (g + 1)) ** (g / (g - 1))
            self.gas.SP = s_chamber, self.gas.P
            self.gas.equilibrate('SP')
        else:
            self.gas.X = frozen_X
            self.gas.SP = s_chamber, self.pc * (2 / (g + 1)) ** (g / (g - 1))

        rho_star = self.gas.density
        v_star   = math.sqrt(max(0.0, 2.0 * (h_chamber - self.gas.h)))
        epsilon  = (rho_star * v_star) / (rho_exit * v_exit_ideal) if v_exit_ideal > 0 else 0.0

        # ── Specific impulse ──────────────────────────────────────────────
        isp_delivered = v_exit_delivered / G
        isp_ideal     = v_exit_ideal / G
        isp_vac       = (v_exit_delivered + (p_exit_pa * epsilon * c_star / self.pc)) / G if self.pc > 0 else 0.0
        isp_sl        = (v_exit_delivered + (p_exit_pa - 101325.0) * epsilon * c_star / self.pc) / G if self.pc > 0 else 0.0

        cf_ideal     = v_exit_ideal / c_star
        cf_delivered = v_exit_delivered / c_star

        pr_chamber = visc_chamber * cp_chamber / cond_chamber if cond_chamber > 0 else 0.0

        # ── Engine sizing ─────────────────────────────────────────────────
        # At = mdot * c* / Pc  →  mdot = Pc * At / c*
        # F (vacuum) = mdot * (v_exit + Pe/rho_exit/v_exit)
        # Solve At given thrust target
        if thrust_target_N is not None and thrust_target_N > 0 and c_star > 0:
            # Vacuum thrust coefficient: Cf_vac = Cf_delivered + (Pe/Pc)*epsilon
            # Standard form (Sutton & Biblarz, Rocket Propulsion Elements eq 3-30)
            cf_vac = cf_delivered + (p_exit_pa / self.pc) * epsilon
            A_throat = thrust_target_N / (cf_vac * self.pc) if cf_vac * self.pc > 0 else 0.001
            A_exit   = A_throat * epsilon
            r_throat = math.sqrt(A_throat / math.pi)
            r_exit   = math.sqrt(A_exit   / math.pi)
            mdot     = self.pc * A_throat / c_star
            mdot_fuel = mdot / (1.0 + of_ratio)
            mdot_ox   = mdot * of_ratio / (1.0 + of_ratio)
        else:
            # Default: assume At = 1 cm² for reporting ratios only
            A_throat = 1e-4
            A_exit   = A_throat * epsilon
            r_throat = math.sqrt(A_throat / math.pi)
            r_exit   = math.sqrt(A_exit   / math.pi)
            mdot     = self.pc * A_throat / c_star
            mdot_fuel = mdot / (1.0 + of_ratio)
            mdot_ox   = mdot * of_ratio / (1.0 + of_ratio)

        # ── Structural / mass estimation ──────────────────────────────────
        safety_factor = 2.0
        rho_mat   = 8190.0    # Inconel 718 [kg/m³]
        yield_mat = 1000e6    # Pa

        # Characteristic length L* (from throat radius scale)
        l_star     = 1.0   # m (approx. for H2/O2)
        v_chamber  = l_star * A_throat
        r_ch       = max(r_throat * 2.0, 0.05)
        len_chamber = v_chamber / (math.pi * r_ch ** 2) if r_ch > 0 else 0.1
        t_wall     = (self.pc * r_ch) / (yield_mat / safety_factor)
        mass_chamber = 2.0 * math.pi * r_ch * len_chamber * t_wall * rho_mat
        mass_engine  = mass_chamber * 3.0

        # ── Nozzle length estimates ────────────────────────────────────────
        l_cone  = (r_exit - r_throat) / math.tan(math.radians(15.0)) if (r_exit - r_throat) > 0 else 0.0
        l_bell  = 0.80 * l_cone   # 80% bell equivalent

        # ── Bartz heat transfer ────────────────────────────────────────────
        heat_transfer = None
        if compute_heat_transfer and r_throat > 0 and c_star > 0:
            try:
                heat_transfer = self._bartz_heat_flux(
                    stations_n=15,
                    r_throat=r_throat,
                    gamma=g,
                    mw=mw_chamber,
                    t_chamber=t_chamber,
                    visc_chamber=visc_chamber,
                    cp_chamber=cp_chamber,
                    cond_chamber=cond_chamber,
                    c_star=c_star,
                )
            except Exception as ht_err:
                import logging as _logging
                _logging.getLogger(__name__).warning("Bartz heat transfer failed: %s", ht_err)
                heat_transfer = {'error': str(ht_err)}

        # ── Flow regime ───────────────────────────────────────────────────
        regime = 'Ideally Expanded'
        if p_exit_pa > 101325.0 * 1.05:
            regime = 'Underexpanded'
        elif p_exit_pa < 101325.0 * 0.95:
            regime = 'Overexpanded'
            if p_exit_pa < 0.35 * 101325.0:
                regime = 'Separation Warning'

        # Sonic velocity at exit
        cpn_exit = self.gas.cp
        mwn_exit = self.gas.mean_molecular_weight
        gn_exit  = cpn_exit / (cpn_exit - ct.gas_constant / mwn_exit)
        rn_exit = ct.gas_constant / mwn_exit
        a_exit  = math.sqrt(max(0.1, gn_exit * rn_exit * t_exit))
        # Use delivered exit velocity (accounts for divergence and friction losses)
        mach_exit = v_exit_delivered / a_exit if a_exit > 0 else 1.0

        return {
            # ── Thermochemistry ──────────────────────────────────────────
            't_chamber'    : t_chamber,
            'h_chamber'    : h_chamber,
            's_chamber'    : s_chamber,
            'rho_chamber'  : rho_chamber,
            'visc_chamber' : visc_chamber,
            'cond_chamber' : cond_chamber,
            'cp_chamber'   : cp_chamber,
            'pr_chamber'   : pr_chamber,
            'mw_chamber'   : mw_chamber,
            'gamma'        : g,
            'mach_exit'    : mach_exit,
            'phi'          : phi,
            # ── Nozzle conditions ────────────────────────────────────────
            't_exit'       : t_exit,
            'h_exit'       : h_exit,
            'rho_exit'     : rho_exit,
            'visc_exit'    : visc_exit,
            'cond_exit'    : cond_exit,
            # ── Performance ─────────────────────────────────────────────
            'v_exit_ideal'    : v_exit_ideal,
            'v_exit_delivered': v_exit_delivered,
            'isp_ideal'       : isp_ideal,
            'isp_delivered'   : isp_delivered,
            'isp_vac'         : isp_vac,
            'isp_sl'          : isp_sl,
            'c_star'          : c_star,
            'cf_ideal'        : cf_ideal,
            'cf_delivered'    : cf_delivered,
            'lambda_div'      : lambda_div,
            'epsilon'         : epsilon,
            'regime'          : regime,
            'mode'            : mode,
            # ── Engine sizing ────────────────────────────────────────────
            'A_throat'        : A_throat,
            'A_exit'          : A_exit,
            'r_throat'        : r_throat,
            'r_exit'          : r_exit,
            'l_chamber'       : len_chamber,
            'l_nozzle'        : l_bell,
            'mdot_total'      : mdot,
            'mdot_fuel'       : mdot_fuel,
            'mdot_ox'         : mdot_ox,
            # ── Structural ──────────────────────────────────────────────
            'mass_est'     : mass_engine,
            'chamber_dims' : {'r': r_ch, 'l': len_chamber, 't': t_wall},
            'nozzle_dims'  : {'r_t': r_throat, 'r_e': r_exit, 'l_cone': l_cone, 'l_bell': l_bell},
            # ── Heat transfer ────────────────────────────────────────────
            'heat_transfer'     : heat_transfer,
            # ── Thrust ──────────────────────────────────────────────────
            'thrust_vac'        : mdot * isp_vac * G,
            'thrust_sl'         : mdot * isp_sl * G,
            # ── Exit species ─────────────────────────────────────────────
            'composition_exit'  : self.gas.mole_fraction_dict(),
            'math_trace'        : math_trace,
        }

    # ─────────────────────────────────────────────────────────────────────────
    def altitude_performance(
        self,
        propellant_name: str,
        of_ratio: float,
        altitudes_m: list[float],
        mode: str = 'shifting',
    ) -> list[dict[str, Any]]:
        """
        Calculates delivered Isp and Cf at various altitudes.

        Useful for launch vehicle staging and trajectory analysis.

        Args:
            propellant_name: Name of the propellant combination.
            of_ratio: Mixture ratio (O/F).
            altitudes_m: List of altitudes to evaluate [m].
            mode: Equilibrium mode ('shifting' or 'frozen'). Defaults to 'shifting'.

        Returns:
            list: List of dictionaries containing performance metrics at each altitude.
        """
        from ..units import isa_atmosphere
        results = []
        for alt in altitudes_m:
            p_amb, _, _ = isa_atmosphere(alt)
            try:
                res = self.solve_equilibrium(
                    propellant_name, of_ratio, p_exit_pa=p_amb, mode=mode,
                    compute_heat_transfer=False,
                )
                results.append({
                    'altitude_m'   : alt,
                    'p_amb_pa'     : round(p_amb, 2),
                    'isp_s'        : round(res['isp_delivered'], 2),
                    'isp_vac'      : round(res['isp_vac'], 2),
                    'cf_delivered' : round(res['cf_delivered'], 4),
                    'regime'       : res['regime'],
                })
            except Exception as e:
                results.append({'altitude_m': alt, 'error': str(e)})
        return results
