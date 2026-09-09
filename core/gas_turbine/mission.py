import math
from ..units import G, isa_atmosphere, R_AIR, GAMMA_AIR
from ..errors import InputValidationError, ModelDomainError, SolverError
from ..solver_result import assurance, failed_point, require_finite

class MissionAnalyzer:
    """
    Solves the master constraint equations for uninstalled Thrust-to-Weight (T/W)
    versus Wing Loading (W/S).
    """
    def __init__(self, aircraft_data):
        self.k = aircraft_data.get('k', 0.1)  # Induced drag factor
        self.cd0 = aircraft_data.get('cd0', 0.02)  # Zero-lift drag coefficient
        self._positive(k=self.k)
        if not math.isfinite(self.cd0) or self.cd0 < 0:
            raise InputValidationError('cd0 must be finite and nonnegative.')
        self.q = 0  # Dynamic pressure (calculated later)
        
    @staticmethod
    def _positive(**values):
        for name, value in values.items():
            if not isinstance(value, (int, float)) or not math.isfinite(value) or value <= 0:
                raise InputValidationError('The input must be finite and positive.', field=name)

    def calculate_dynamic_pressure(self, altitude_m, mach):
        self._positive(mach=mach)
        p, t, rho = isa_atmosphere(altitude_m)
        a = math.sqrt(GAMMA_AIR * R_AIR * t)
        v = mach * a
        self.q = 0.5 * rho * v**2
        return self.q, v

    _Q_MIN = 1.0  # Pa — guard against divide-by-zero at near-zero Mach/altitude

    def tw_level_flight(self, ws, altitude_m, mach):
        """T/W for constant altitude, constant speed flight."""
        self._positive(ws=ws)
        q, _ = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN:
            raise ModelDomainError('Dynamic pressure or speed is below the constraint model limit.')
        return (q * self.cd0) / ws + self.k / q * ws

    def tw_ps(self, ws, altitude_m, mach, ps):
        """T/W for specific excess power (Ps)."""
        self._positive(ws=ws)
        q, v = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN or v < 1.0:
            raise ModelDomainError('Dynamic pressure or speed is below the constraint model limit.')
        if not math.isfinite(ps) or ps < 0:
            raise InputValidationError('Specific excess power must be finite and nonnegative.')
        return (ps / v) + (q * self.cd0) / ws + (self.k / q) * ws

    def tw_sustained_turn(self, ws, altitude_m, mach, n):
        """T/W for a sustained turn with load factor n."""
        self._positive(ws=ws)
        q, _ = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN:
            raise ModelDomainError('Dynamic pressure or speed is below the constraint model limit.')
        self._positive(n=n)
        if n < 1:
            raise InputValidationError('Sustained turn load factor must be at least one.')
        return (q * self.cd0) / ws + (self.k * n**2 / q) * ws

    def tw_service_ceiling(self, ws, altitude_m, mach, vy=0.5):
        """T/W for a specific vertical rate (vy) [m/s] at service ceiling."""
        self._positive(ws=ws)
        q, v = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN or v < 1.0:
            raise ModelDomainError('Dynamic pressure or speed is below the constraint model limit.')
        if not math.isfinite(vy) or vy < 0:
            raise InputValidationError('Climb rate must be finite and nonnegative.')
        return (vy / v) + (q * self.cd0) / ws + (self.k / q) * ws

    def tw_climb(self, ws, altitude_m, mach, angle_deg):
        """T/W for a fixed climb angle."""
        if not math.isfinite(angle_deg) or not 0 <= angle_deg < 90:
            raise InputValidationError('Climb angle must be in [0, 90) degrees.')
        gamma = math.radians(angle_deg)
        self._positive(ws=ws)
        q, _ = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN:
            raise ModelDomainError('Dynamic pressure or speed is below the constraint model limit.')
        return math.sin(gamma) + (q * self.cd0) / ws + (self.k * math.cos(gamma)**2 / q) * ws

    def tw_takeoff(self, ws, sto, cl_max, sigma=1.0):
        """Ideal ground-roll lower bound. Excludes drag, friction, wind, and obstacle clearance."""
        self._positive(ws=ws, sto=sto, cl_max=cl_max, sigma=sigma)
        rho0 = isa_atmosphere(0)[2]
        # V_liftoff = 1.2 V_stall. Constant acceleration gives T/W = V_liftoff**2 / (2 g s).
        return 1.2**2 * ws / (rho0 * sigma * G * cl_max * sto)

    def generate_constraint_data(self, ws_range, constraints):
        """
        Generates plotting data for multiple constraints over a range of Wing Loading.
        """
        if not ws_range or not constraints:
            raise InputValidationError('Wing loading and constraints must not be empty.')
        for ws in ws_range:
            self._positive(ws=ws)
        results = {'ws': list(ws_range), 'series': [], 'optimum': None}
        for c in constraints:
            points = []
            for ws in ws_range:
                try:
                    ctype = c.get('type')
                    if ctype == 'level':
                        val = self.tw_level_flight(ws, c['alt'], c['mach'])
                    elif ctype == 'ps':
                        val = self.tw_ps(ws, c['alt'], c['mach'], c['ps'])
                    elif ctype == 'turn':
                        val = self.tw_sustained_turn(ws, c['alt'], c['mach'], c['n'])
                    elif ctype == 'takeoff':
                        val = self.tw_takeoff(ws, c['sto'], c['cl_max'], c.get('sigma', 1.0))
                    elif ctype == 'ceiling':
                        val = self.tw_service_ceiling(ws, c['alt'], c['mach'], c.get('vy') if c.get('vy') is not None else 0.5)
                    elif ctype == 'climb':
                        val = self.tw_climb(ws, c['alt'], c['mach'], c['angle_deg'])
                    else:
                        raise InputValidationError('Unknown constraint type.', constraint_type=ctype)
                    require_finite(val)
                    points.append({'ws': ws, 'tw': val, 'status': 'OUTSIDE_VALIDATED_DOMAIN'})
                except KeyError as exc:
                    points.append(failed_point(InputValidationError('Missing constraint input.', field=str(exc)), {'ws': ws}, ('tw',)))
                except SolverError as exc:
                    points.append(failed_point(exc, {'ws': ws}, ('tw',)))
            results['series'].append({'label': c.get('label', c.get('type', 'Unknown')), 'values': [p['tw'] for p in points], 'points': points})
        boundary = [None if any(s['values'][i] is None for s in results['series']) else max(s['values'][i] for s in results['series']) for i in range(len(ws_range))]
        candidates = [(tw, ws) for tw, ws in zip(boundary, ws_range) if tw is not None]
        if candidates:
            tw, ws = min(candidates)
            results['optimum'] = {'ws': ws, 'tw': tw}
        results['feasible_boundary'] = boundary
        results['status'] = 'OUTSIDE_VALIDATED_DOMAIN' if candidates else 'INFEASIBLE'
        results['assurance'] = assurance('mission_constraints', {'k': self.k, 'cd0': self.cd0, 'constraints': constraints, 'ws': list(ws_range)}, status=results['status'], physical_valid=True if candidates else None,
            warnings=['Constraint curves use local thrust. No engine thrust lapse or installed-thrust matching is applied.', 'Takeoff is an ideal ground-roll lower bound, not a runway or obstacle-clearance prediction.'],
            assumptions=['Parabolic drag polar.', 'Takeoff uses 1.2 times stall speed with zero drag and rolling resistance.'])
        require_finite(results)
        return results

    def calculate_breguet_range(self, mach, altitude_m, sfc_1_per_s=None, l_over_d=16.0, w_initial=70000.0, w_final=45000.0, *, tsfc_kg_per_n_s=None):
        """
        Breguet Range Equation for jet aircraft:
        Range = (V / SFC) * (L/D) * ln(W_initial / W_final)

        Args:
            mach: Cruise Mach number.
            altitude_m: Cruise altitude [m].
            sfc_1_per_s: Weight-flow specific fuel consumption [1/s]. Use tsfc_kg_per_n_s for mass-flow TSFC.
            l_over_d: Lift-to-drag ratio (L/D).
            w_initial: Initial weight [N].
            w_final: Final weight [N].

        Returns:
            dict: range_km, flight_time_hours, fuel_fraction, cruise_velocity_mps.
        """
        self._positive(l_over_d=l_over_d, w_initial=w_initial, w_final=w_final)
        if w_final >= w_initial:
            raise InputValidationError('Final weight must be below initial weight.')
        if (sfc_1_per_s is None) == (tsfc_kg_per_n_s is None):
            raise InputValidationError('Provide exactly one of sfc_1_per_s and tsfc_kg_per_n_s.')
        rate = sfc_1_per_s if sfc_1_per_s is not None else G * tsfc_kg_per_n_s
        self._positive(sfc_1_per_s=rate)
        _, v = self.calculate_dynamic_pressure(altitude_m, mach)
        time_s = l_over_d * math.log(w_initial / w_final) / rate
        result = {'range_km': v * time_s / 1000, 'flight_time_hours': time_s / 3600,
                  'fuel_fraction': 1 - w_final / w_initial, 'cruise_velocity_mps': v,
                  'status': 'OUTSIDE_VALIDATED_DOMAIN'}
        result['assurance'] = assurance('breguet_range', {'mach': mach, 'altitude_m': altitude_m,
            'sfc_1_per_s': rate, 'tsfc_kg_per_n_s': rate / G, 'l_over_d': l_over_d,
            'w_initial': w_initial, 'w_final': w_final},
            assumptions=['Constant speed, lift-to-drag ratio, and TSFC in steady level cruise.'],
            warnings=['Cruise segment only. Reserves, climb, descent, and wind are excluded.'])
        require_finite(result)
        return result
