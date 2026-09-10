"""
Rocket Propulsion Analysis Core (v2.0.1-STABLE)

Systematic solver for rocket combustion equilibrium and nozzle expansion.
Uses Cantera thermochemistry and declared engineering approximations.

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
from ..gas_turbine.state import _snapshot
from ..gas_turbine.flow import convergent_nozzle
from ..errors import InputValidationError, DependencyError, UnsupportedModelError, ModelDomainError, PhysicalInfeasibilityError, SolverError, ThermochemistryError
from ..solver_result import rocket_result, assurance, failed_point


class RocketAnalyzer:
    """
    Cantera equilibrium and approximate nozzle analyzer.
    
    Equations are based on the NASA Chemical Equilibrium with Applications (CEA) 
    methodology, adapted for real-time design iterations.
    
    This class uses Cantera for thermochemical equilibrium calculations,
    allowing for both shifting and frozen composition flow models.
    It incorporates standard aerospace correlations for nozzle losses (divergence, friction)
    and provides a Bartz model for convective heat transfer distribution along the nozzle wall.
    """

    def _new_gas(self) -> ct.Solution:
        """Returns a fresh, isolated Cantera GRI30 solution object for thread safety."""
        try:
            return ct.Solution('gri30.yaml', transport_model='mixture-averaged')
        except ct.CanteraError as exc:
            raise DependencyError('The GRI30 thermochemistry mechanism is unavailable.') from exc

    @staticmethod
    def _check_temperature_floor(gas, station):
        """Reject states below the common mechanism temperature floor."""
        if gas.T < gas.min_temp:
            raise ModelDomainError(
                'Rocket state is below the mechanism temperature floor.',
                station=station, temperature_k=float(gas.T),
                minimum_temperature_k=float(gas.min_temp),
            )

    def __init__(self, chamber_p_pa: float) -> None:
        """
        Initialize the analyzer with design chamber pressure.

        Args:
            chamber_p_pa: Combustion chamber stagnation pressure [Pa].
        """
        # Load the chemical mechanism. GRI30 provides excellent coverage for CH4, H2, and RP1 surrogates.
        self.pc   = chamber_p_pa
        self.propellants = {
            # Rocket Standard Liquid Propellants
            'H2/O2'       : {'fuel': 'H2',      'ox': 'O2'},
            'CH4/O2'      : {'fuel': 'CH4',     'ox': 'O2'},
            'RP1/O2'      : {'fuel': 'C3H8',    'ox': 'O2'},  # Surrogate (Propane)
            'Propane/O2'  : {'fuel': 'C3H8',    'ox': 'O2'},
            'Ethanol/O2'  : {'fuel': 'C2H5OH',  'ox': 'O2'},  # Ethanol (actual species)
            'Methanol/O2' : {'fuel': 'CH3OH',   'ox': 'O2'},
            'Ammonia/O2'  : {'fuel': 'NH3',     'ox': 'O2'},
            
            # High Energy / Tactical
            'C2H2/O2'     : {'fuel': 'C2H2',    'ox': 'O2'},
            'C2H4/O2'     : {'fuel': 'C2H4',    'ox': 'O2'},
            'C2H6/O2'      : {'fuel': 'C2H6',    'ox': 'O2'},
            
            # Nitrous Oxide based (Hybrid/Small)
            'CH4/N2O'     : {'fuel': 'CH4',     'ox': 'N2O'},
            'C3H8/N2O'    : {'fuel': 'C3H8',    'ox': 'N2O'},
            
            # Hypergolic (Storable)
            'UDMH/N2O4'    : {'fuel': 'C2H8N2',  'ox': 'N2O4'},
            'MMH/N2O4'     : {'fuel': 'CH6N2',   'ox': 'N2O4'},
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
    @rocket_result
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
        p_ambient_pa: float = 101325.0,
    ) -> dict[str, Any]:
        """
        Solves chamber equilibrium and nozzle expansion.

        Args:
            propellant_name: Key from self.propellants (e.g., 'H2/O2').
            of_ratio: Oxidizer-to-fuel mass ratio.
            p_exit_pa: Nozzle design exit static pressure [Pa].
            p_ambient_pa: Ambient pressure [Pa], independent of exit pressure.
            mode: 'shifting' or 'frozen' equilibrium. Defaults to 'shifting'.
            exit_half_angle_deg: Nozzle exit half-angle. Defaults to 15.0.
            thrust_target_N: Optional vacuum thrust target for engine sizing [N].
            compute_heat_transfer: Enables Bartz heat flux calculation. Defaults to True.
            impurity_species: Optional species present in fuel (e.g., 'N2').
            impurity_mass_frac: Mass fraction of impurity in fuel.

        Returns:
            dict: Comprehensive results including Isp, thrust, dimensions, and composition.
        """
        if not all(math.isfinite(v) for v in (self.pc, p_exit_pa, p_ambient_pa, of_ratio, exit_half_angle_deg, impurity_mass_frac)):
            raise InputValidationError('Rocket inputs must be finite.')
        if not 0 < p_exit_pa < self.pc or p_ambient_pa < 0:
            raise InputValidationError('Require 0 < Pe < Pc and Pa >= 0.', pc=self.pc, pe=p_exit_pa, pa=p_ambient_pa)
        if p_ambient_pa >= self.pc:
            raise PhysicalInfeasibilityError('Chamber pressure must exceed ambient pressure.', pc=self.pc, pa=p_ambient_pa)
        if mode not in {'shifting', 'frozen'}:
            raise InputValidationError('Mode must be shifting or frozen.')
        if not 0 <= exit_half_angle_deg < 90 or not 0 <= impurity_mass_frac < 1:
            raise InputValidationError('Invalid nozzle angle or impurity fraction.')
        if thrust_target_N is not None and (not math.isfinite(thrust_target_N) or thrust_target_N <= 0):
            raise InputValidationError('Vacuum thrust target must be finite and positive.')
        if propellant_name not in self.propellants:
            raise InputValidationError(
                f"Unknown propellant '{propellant_name}'. "
                f"Valid keys: {sorted(self.propellants)}"
            )
        if of_ratio <= 0:
            raise InputValidationError(f"O/F ratio must be positive, got {of_ratio}")

        gas = self._new_gas()

        if impurity_species:
            if not (0.0 <= impurity_mass_frac < 1.0):
                raise InputValidationError(
                    f"Impurity mass fraction must be in range [0.0, 1.0), got {impurity_mass_frac}"
                )
            if impurity_species not in gas.species_names:
                raise InputValidationError(
                    f"Impurity species '{impurity_species}' not found in the Cantera mechanism."
                )


        math_trace = []
        prop = self.propellants[propellant_name]
        missing = [prop[key] for key in ('fuel', 'ox') if prop[key] not in gas.species_names]
        if missing:
            raise UnsupportedModelError('The mechanism lacks species: ' + ', '.join(missing), propellant=propellant_name)
        if impurity_mass_frac > 0 and not impurity_species:
            raise InputValidationError('A positive impurity fraction requires an impurity species.')
        # O/F uses total fuel-stream mass, including any impurity.
        fuel_mix = {prop['fuel']: 1.0 - impurity_mass_frac}
        if impurity_mass_frac > 0:
            fuel_mix[impurity_species] = fuel_mix.get(impurity_species, 0.0) + impurity_mass_frac
        reactant_mass = dict(fuel_mix)
        reactant_mass[prop['ox']] = reactant_mass.get(prop['ox'], 0.0) + of_ratio
        gas.TPY = 300.0, self.pc, reactant_mass
        phi = float(gas.equivalence_ratio(fuel_mix, prop['ox'], basis='mass'))
        reactants = {
            'temperature_k': float(gas.T),
            'pressure_pa': float(gas.P),
            'phase': 'ideal-gas',
            'mechanism': 'gri30.yaml',
            'of_ratio': of_ratio,
            'of_basis': 'oxidizer_stream_mass / total_fuel_stream_mass',
            'fuel_stream_mass_fractions': fuel_mix,
            'oxidizer_species': prop['ox'],
            'mass_fractions': {name: float(y) for name, y in zip(gas.species_names, gas.Y) if y > 0},
            'specific_enthalpy_j_per_kg': float(gas.enthalpy_mass),
        }
        math_trace.append(f"Propellants: {propellant_name}; oxidizer/total fuel-stream mass = {of_ratio}")
        math_trace.append(f"Equivalence Ratio φ = {phi:.6f} (mechanism-derived, mass basis)")

        # ── Chamber ──────────────────────────────────────────────────────
        gas.equilibrate('HP')
        self._check_temperature_floor(gas, 'chamber')
        t_chamber    = gas.T
        h_chamber    = gas.h
        math_trace.append(f"Chamber Equilibrium (HP): T={t_chamber:.1f} K, h={h_chamber/1e6:.3f} MJ/kg")
        s_chamber    = gas.s
        rho_chamber  = gas.density
        visc_chamber = gas.viscosity
        cond_chamber = gas.thermal_conductivity
        cp_chamber   = gas.cp
        mw_chamber   = gas.mean_molecular_weight
        gamma_chamber = cp_chamber / (cp_chamber - ct.gas_constant / mw_chamber)
        r_spec_chamber = ct.gas_constant / mw_chamber

        frozen_X = gas.X.copy() if mode == 'frozen' else None
        frozen_throat = convergent_nozzle(_snapshot(gas), self.pc*.1) if mode == 'frozen' else None

        critical_pe = self.pc * (2 / (gamma_chamber + 1)) ** (gamma_chamber / (gamma_chamber - 1))
        if frozen_throat is not None:
            critical_pe = frozen_throat.critical_pressure_pa
        if p_exit_pa >= critical_pe:
            raise ModelDomainError('The divergent nozzle requires a choked throat and lower exit pressure.', critical_pe=critical_pe)
        warnings = []
        # ── Nozzle exit ───────────────────────────────────────────────────
        if mode == 'shifting':
            gas.SP = s_chamber, p_exit_pa
            self._check_temperature_floor(gas, 'nozzle exit')
            try:
                gas.equilibrate('SP')
            except ct.CanteraError as exc:
                raise ThermochemistryError('Nozzle exit equilibrium failed.', pe=p_exit_pa) from exc
        else:
            gas.X = frozen_X
            gas.SP = s_chamber, p_exit_pa
            self._check_temperature_floor(gas, 'nozzle exit')

        self._check_temperature_floor(gas, 'nozzle exit')
        t_exit   = gas.T
        h_exit   = gas.h
        rho_exit = gas.density
        visc_exit = gas.viscosity
        cond_exit = gas.thermal_conductivity

        exit_cp, exit_mw = gas.cp, gas.mean_molecular_weight
        exit_composition = gas.mole_fraction_dict()
        if h_chamber <= h_exit:
            raise PhysicalInfeasibilityError('No positive enthalpy drop is available at the nozzle exit.')
        v_exit_ideal = math.sqrt(2.0 * (h_chamber - h_exit))

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
            gas.TP = t_chamber * (2 / (g + 1)), self.pc * (2 / (g + 1)) ** (g / (g - 1))
            gas.SP = s_chamber, gas.P
            self._check_temperature_floor(gas, 'throat')
            try:
                gas.equilibrate('SP')
            except ct.CanteraError as exc:
                raise ThermochemistryError('Throat equilibrium failed.') from exc
        else:
            gas.X = frozen_X
            gas.SP = s_chamber, critical_pe

        self._check_temperature_floor(gas, 'throat')
        rho_star = gas.density
        if h_chamber <= gas.h:
            raise PhysicalInfeasibilityError('No positive enthalpy drop is available at the throat.')
        v_star = math.sqrt(2.0 * (h_chamber - gas.h))
        c_star_constant_gamma = c_star
        c_star = self.pc / (rho_star * v_star)
        math_trace.append(f'Consistent c*: Pc/(rho_throat*V_throat) = {c_star:.3f} m/s')
        epsilon  = (rho_star * v_star) / (rho_exit * v_exit_ideal) if v_exit_ideal > 0 else 0.0

        # ── Specific impulse ──────────────────────────────────────────────
        pressure_velocity = (p_exit_pa - p_ambient_pa) * epsilon * c_star / self.pc
        isp_delivered = (v_exit_delivered + pressure_velocity) / G
        isp_ideal     = v_exit_ideal / G
        isp_vac       = (v_exit_delivered + (p_exit_pa * epsilon * c_star / self.pc)) / G if self.pc > 0 else 0.0
        isp_sl        = (v_exit_delivered + (p_exit_pa - 101325.0) * epsilon * c_star / self.pc) / G if self.pc > 0 else 0.0

        cf_ideal     = v_exit_ideal / c_star
        cf_delivered = v_exit_delivered / c_star + (p_exit_pa - p_ambient_pa) * epsilon / self.pc

        import math as _math
        for _name, _val in [('isp_delivered', isp_delivered), ('isp_vac', isp_vac), ('c_star', c_star)]:
            if not _math.isfinite(_val):
                raise InputValidationError(f"Solver produced non-finite {_name}={_val}; check inputs.")

        pr_chamber = visc_chamber * cp_chamber / cond_chamber if cond_chamber > 0 else 0.0

        # ── Engine sizing ─────────────────────────────────────────────────
        # At = mdot * c* / Pc  →  mdot = Pc * At / c*
        # F (vacuum) = mdot * (v_exit + Pe/rho_exit/v_exit)
        # Solve At given thrust target
        if thrust_target_N is not None and thrust_target_N > 0 and c_star > 0:
            # Vacuum thrust: F_vac ≈ Cf_vac * Pc * At
            cf_vac = v_exit_delivered / c_star + p_exit_pa * epsilon / self.pc  # approx Cf in vacuum
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
            except (ArithmeticError, ValueError):
                heat_transfer = None
                warnings.append('The optional heat-transfer estimate failed.')

        # ── Flow regime ───────────────────────────────────────────────────
        regime = self.flow_regime(p_exit_pa, p_ambient_pa)

        # Sonic velocity at exit
        cpn_exit = exit_cp
        mwn_exit = exit_mw
        gn_exit  = cpn_exit / (cpn_exit - ct.gas_constant / mwn_exit)
        rn_exit = ct.gas_constant / mwn_exit
        a_exit  = math.sqrt(max(0.1, gn_exit * rn_exit * t_exit))
        mach_exit = v_exit_ideal / a_exit if a_exit > 0 else 1.0

        return {
            # ── Thermochemistry ──────────────────────────────────────────
            '_warnings': warnings,
            'pc': self.pc, 'pe': p_exit_pa, 'pa': p_ambient_pa,
            'thrust_ambient': mdot * isp_delivered * G,
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
            'reactants'    : reactants,
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
            'c_star_constant_gamma': c_star_constant_gamma,
            'throat': {'pressure_pa': float(gas.P), 'temperature_k': float(gas.T),
                       'density_kg_m3': float(rho_star), 'velocity_m_per_s': float(v_star),
                       'method': 'frozen_sonic_root' if frozen_throat else 'chamber_gamma_pressure_equilibrium_state',
                       'sonic_residual_j_per_kg': frozen_throat.sonic_residual_j_per_kg if frozen_throat else None},
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
            'composition_exit'  : exit_composition,
            'math_trace'        : math_trace,
        }

    # ─────────────────────────────────────────────────────────────────────────
    @staticmethod
    def flow_regime(pe, pa):
        if pa == 0 or pe > pa * 1.05:
            return 'Underexpanded'
        if pe < pa * 0.35:
            return 'Separation Warning'
        if pe < pa * 0.95:
            return 'Overexpanded'
        return 'Ideally Expanded'

    def altitude_performance(self, propellant_name, of_ratio, altitudes_m,
                             mode='shifting', p_exit_pa=101325.0, exit_half_angle_deg=15.0):
        """Hold the nozzle design fixed and vary ambient pressure within the atmosphere domain."""
        from ..units import isa_atmosphere
        design = self.solve_equilibrium(propellant_name, of_ratio, p_exit_pa, mode,
                                        exit_half_angle_deg, compute_heat_transfer=False, p_ambient_pa=0)
        results = []
        for alt in altitudes_m:
            try:
                pa, _, _ = isa_atmosphere(alt)
                regime = self.flow_regime(p_exit_pa, pa)
                meta = assurance('rocket_altitude', {'altitude_m': alt, 'pc': self.pc, 'pe': p_exit_pa, 'pa': pa},
                                 assumptions=design['assurance']['assumptions'])
                isp = design['isp_vac'] - pa * design['A_exit'] / (design['mdot_total'] * G)
                if regime == 'Separation Warning':
                    meta['status'] = 'OUTSIDE_MODEL_DOMAIN'
                    meta['applicability']['within_model_domain'] = False
                    meta['warnings'] = ['Separation screening limit exceeded. Attached-flow performance is unavailable.']
                valid = meta['status'] != 'OUTSIDE_MODEL_DOMAIN'
                results.append({'altitude_m': alt, 'p_amb_pa': pa, 'pe': p_exit_pa,
                                'isp_s': isp if valid else None, 'isp_vac': design['isp_vac'],
                                'cf_delivered': isp * G / design['c_star'] if valid else None,
                                'epsilon': design['epsilon'], 'A_throat': design['A_throat'],
                                'A_exit': design['A_exit'], 'mdot_total': design['mdot_total'],
                                'regime': regime, 'status': meta['status'], 'assurance': meta,
                                'error': not valid})
            except SolverError as exc:
                results.append(failed_point(exc, {'altitude_m': alt}, ('isp_s', 'isp_vac', 'cf_delivered')))
        return results
