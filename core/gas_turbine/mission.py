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

    def tw_level_flight(self, ws, altitude_m, mach):
        """T/W for constant altitude, constant speed flight."""
        q, _ = self.calculate_dynamic_pressure(altitude_m, mach)
        return (q * self.cd0) / ws + self.k / q * ws

    def tw_ps(self, ws, altitude_m, mach, ps):
        """T/W for specific excess power (Ps)."""
        q, v = self.calculate_dynamic_pressure(altitude_m, mach)
        return (ps / v) + (q * self.cd0) / ws + (self.k / q) * ws

    def tw_sustained_turn(self, ws, altitude_m, mach, n):
        """T/W for a sustained turn with load factor n."""
        q, _ = self.calculate_dynamic_pressure(altitude_m, mach)
        return (q * self.cd0) / ws + (self.k * n**2 / q) * ws

    def tw_service_ceiling(self, ws, altitude_m, mach, vy=0.5):
        """T/W for a specific vertical rate (vy) [m/s] at service ceiling."""
        q, v = self.calculate_dynamic_pressure(altitude_m, mach)
        return (vy / v) + (q * self.cd0) / ws + (self.k / q) * ws

    def tw_climb(self, ws, altitude_m, mach, angle_deg):
        """T/W for a fixed climb angle."""
        gamma = math.radians(angle_deg)
        q, _ = self.calculate_dynamic_pressure(altitude_m, mach)
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
                else:
                    val = 0
                values.append(val)
                
            results['series'].append({'label': label, 'values': values})
            all_tw_curves.append(values)
            
        # Find the Max(T/W) across all constraints for each Wing Loading
        if all_tw_curves:
            feasible_boundary = [max(points) for points in zip(*all_tw_curves)]
            min_tw = min(feasible_boundary)
            min_idx = feasible_boundary.index(min_tw)
            results['optimum'] = {
                'ws': ws_range[min_idx],
                'tw': min_tw
            }
            
        return results
