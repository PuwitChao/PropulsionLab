import math
from ..units import G, isa_atmosphere, R_AIR, GAMMA_AIR

class MissionAnalyzer:
    """
    Solves the master constraint equations for uninstalled Thrust-to-Weight (T/W)
    versus Wing Loading (W/S).
    """
    def __init__(self, aircraft_data):
        self.k = aircraft_data.get('k', 0.1)  # Induced drag factor
        self.cd0 = aircraft_data.get('cd0', 0.02)  # Zero-lift drag coefficient
        self.q = 0  # Dynamic pressure (calculated later)
        
    def calculate_dynamic_pressure(self, altitude_m, mach):
        p, t, rho = isa_atmosphere(altitude_m)
        a = math.sqrt(GAMMA_AIR * R_AIR * t)
        v = mach * a
        self.q = 0.5 * rho * v**2
        return self.q, v

    _Q_MIN = 1.0  # Pa — guard against divide-by-zero at near-zero Mach/altitude

    def tw_level_flight(self, ws, altitude_m, mach):
        """T/W for constant altitude, constant speed flight."""
        q, _ = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN:
            return float('inf')
        return (q * self.cd0) / ws + self.k / q * ws

    def tw_ps(self, ws, altitude_m, mach, ps):
        """T/W for specific excess power (Ps)."""
        q, v = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN or v < 1.0:
            return float('inf')
        return (ps / v) + (q * self.cd0) / ws + (self.k / q) * ws

    def tw_sustained_turn(self, ws, altitude_m, mach, n):
        """T/W for a sustained turn with load factor n."""
        q, _ = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN:
            return float('inf')
        return (q * self.cd0) / ws + (self.k * n**2 / q) * ws

    def tw_service_ceiling(self, ws, altitude_m, mach, vy=0.5):
        """T/W for a specific vertical rate (vy) [m/s] at service ceiling."""
        q, v = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN or v < 1.0:
            return float('inf')
        return (vy / v) + (q * self.cd0) / ws + (self.k / q) * ws

    def tw_climb(self, ws, altitude_m, mach, angle_deg):
        """T/W for a fixed climb angle."""
        gamma = math.radians(angle_deg)
        q, _ = self.calculate_dynamic_pressure(altitude_m, mach)
        if q < self._Q_MIN:
            return float('inf')
        return math.sin(gamma) + (q * self.cd0) / ws + (self.k * math.cos(gamma)**2 / q) * ws

    def tw_takeoff(self, ws, sto, cl_max, sigma=1.0):
        """
        T/W for takeoff distance.
        sto: Takeoff distance (m)
        cl_max: Max lift coefficient
        sigma: Density ratio (rho/rho0)
        """
        # Simplified takeoff constraint: T/W = (W/S) / (sto * sigma * CL_max * k_to)
        # Using a typical empirical constant for jet aircraft k_to ~ 1.2
        k_to = 1.2
        return ws / (sto * sigma * cl_max * k_to)

    def generate_constraint_data(self, ws_range, constraints):
        """
        Generates plotting data for multiple constraints over a range of Wing Loading.
        """
        results = {'ws': ws_range, 'series': [], 'optimum': None}
        
        all_tw_curves = []
        for c in constraints:
            ctype = c['type']
            label = c['label']
            values = []
            
            for ws in ws_range:
                if ctype == 'level':
                    val = self.tw_level_flight(ws, c['alt'], c['mach'])
                elif ctype == 'ps':
                    val = self.tw_ps(ws, c['alt'], c['mach'], c['ps'])
                elif ctype == 'turn':
                    val = self.tw_sustained_turn(ws, c['alt'], c['mach'], c['n'])
                elif ctype == 'takeoff':
                    val = self.tw_takeoff(ws, c['sto'], c['cl_max'])
                elif ctype == 'ceiling':
                    val = self.tw_service_ceiling(ws, c['alt'], c['mach'])
                elif ctype == 'climb':
                    val = self.tw_climb(ws, c['alt'], c['mach'], c['angle_deg'])
                else:
                    val = 0
                values.append(val)
                
            results['series'].append({'label': label, 'values': values})
            all_tw_curves.append(values)
            
        # Find the Max(T/W) across all constraints for each Wing Loading.
        # Inf values indicate the constraint is infeasible at that q; exclude from optimum.
        if all_tw_curves:
            feasible_boundary = [max(points) for points in zip(*all_tw_curves)]
            finite_pairs = [(tw, ws) for tw, ws in zip(feasible_boundary, ws_range)
                            if math.isfinite(tw)]
            if finite_pairs:
                min_tw, opt_ws = min(finite_pairs, key=lambda x: x[0])
                results['optimum'] = {'ws': opt_ws, 'tw': min_tw}
            else:
                results['optimum'] = None
            
        return results

    def calculate_breguet_range(self, mach, altitude_m, sfc_1_per_s, l_over_d, w_initial, w_final):
        """
        Breguet Range Equation for jet aircraft:
        Range = (V / SFC) * (L/D) * ln(W_initial / W_final)

        Args:
            mach: Cruise Mach number.
            altitude_m: Cruise altitude [m].
            sfc_1_per_s: Specific Fuel Consumption [1/s] or [kg/N/s].
            l_over_d: Lift-to-drag ratio (L/D).
            w_initial: Initial gross weight [N] or [kg].
            w_final: Final empty/zero-fuel weight [N] or [kg].

        Returns:
            dict: range_km, flight_time_hours, fuel_fraction, cruise_velocity_mps.
        """
        _, v = self.calculate_dynamic_pressure(altitude_m, mach)
        if sfc_1_per_s <= 0 or w_final <= 0 or w_initial <= w_final:
            return {'range_km': 0.0, 'flight_time_hours': 0.0, 'fuel_fraction': 0.0, 'cruise_velocity_mps': v}

        fuel_fraction = (w_initial - w_final) / w_initial
        range_m = (v / sfc_1_per_s) * l_over_d * math.log(w_initial / w_final)
        range_km = range_m / 1000.0
        time_hours = (range_m / v) / 3600.0 if v > 0 else 0.0

        return {
            'range_km': range_km,
            'flight_time_hours': time_hours,
            'fuel_fraction': fuel_fraction,
            'cruise_velocity_mps': v
        }

