import math

class StageAero:
    """
    Performs 2D mean-line flow analysis for axial stages (Compressors/Turbines).
    """
    def __init__(self, u_mean, ca):
        self.u = u_mean  # Blade speed at mean radius
        self.ca = ca    # Axial velocity
        
    def calculate_stage(self, psi, phi, degree_of_reaction=0.5):
        """
        psi: Stage loading coefficient (delta_h_0 / u^2)
        phi: Flow coefficient (ca / u)
        """
        # Velocity Triangles
        # V1: Absolute entry (assume axial entry V1 = Ca, Vw1 = 0)
        v1 = self.ca
        vw1 = 0
        
        # V2: Absolute exit
        # delta_vw = psi * u
        vw2 = psi * self.u
        v2 = math.sqrt(self.ca**2 + vw2**2)
        
        # Relative Velocities (W)
        # w1 = sqrt(ca^2 + (u - vw1)^2)
        w1_tan = self.u - vw1
        w1 = math.sqrt(self.ca**2 + w1_tan**2)
        
        # w2 = sqrt(ca^2 + (u - vw2)^2)
        w2_tan = self.u - vw2
        w2 = math.sqrt(self.ca**2 + w2_tan**2)
        
        # Blade Angles (from axial)
        alpha1 = math.degrees(math.atan2(vw1, self.ca))
        alpha2 = math.degrees(math.atan2(vw2, self.ca))
        beta1 = math.degrees(math.atan2(w1_tan, self.ca))
        beta2 = math.degrees(math.atan2(w2_tan, self.ca))
        
        return {
            'velocities': {
                'v1': v1, 'vw1': vw1,
                'v2': v2, 'vw2': vw2,
                'w1': w1, 'w1_tan': w1_tan,
                'w2': w2, 'w2_tan': w2_tan
            },
            'angles': {
                'alpha1': alpha1, 'alpha2': alpha2,
                'beta1': beta1, 'beta2': beta2
            }
        }
