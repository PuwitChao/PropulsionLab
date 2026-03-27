import math
import numpy as np

class MoCNozzle:
    """
    Supersonic nozzle contour design using Method of Characteristics.
    Calculates a 'Simple' Bell Nozzle contour based on exit Mach and Gamma.
    """
    def __init__(self, gamma=1.2, mach_exit=3.0, throat_radius=0.1):
        self.gamma = gamma
        self.me = mach_exit
        self.rt = throat_radius
        self.nu_max = self.prandtl_meyer(self.me) / 2.0 # Approximation for bell
        
    def prandtl_meyer(self, m):
        if m <= 1.0: return 0.0
        g = self.gamma
        factor = math.sqrt((g + 1) / (g - 1))
        nu = factor * math.atan(math.sqrt((g - 1) / (g + 1) * (m**2 - 1))) - math.atan(math.sqrt(m**2 - 1))
        return nu

    def solve_contour(self, subdivisions=30):
        """
        Generates wall points (x, y) for a bell nozzle divergent section.
        """
        # Theta at throat (exit of initial expansion)
        theta_0 = 24 * (math.pi / 180.0) 
        theta_e = 8 * (math.pi / 180.0)
        
        g = self.gamma
        area_ratio = (1.0/self.me) * ((2.0/(g+1.0)) * (1.0 + (g-1.0)/2.0 * self.me**2))**((g+1.0)/(2.0*(g-1.0)))
        re = self.rt * math.sqrt(area_ratio)
        
        l_cone = (re - self.rt) / math.tan(15.0 * math.pi / 180.0)
        l_bell = 0.85 * l_cone
        
        b = math.tan(theta_0)
        a = (math.tan(theta_e) - b) / (2.0 * l_bell)
        c = self.rt
        
        x_vals = np.linspace(0, l_bell, subdivisions)
        y_vals = a * x_vals**2 + b * x_vals + c
        
        self.wall_x = x_vals
        self.wall_y = y_vals
        
        return x_vals.tolist(), y_vals.tolist()

    def get_mesh_data(self, num_rays=10):
        """
        Generates C+ and C- characteristic lines with associated Mach numbers.
        """
        if not hasattr(self, 'wall_x'):
            self.solve_contour()

        traces = []
        
        # 1. Expansion Fan (C+)
        for i in range(num_rays):
            frac = (i + 1) / num_rays
            # Estimate Mach along the ray (linear increase from 1.0 to Me)
            m_local = 1.0 + frac * (self.me - 1.0)
            
            x_end = self.wall_x[-1] * (0.2 + 0.8 * frac)
            traces.append({
                'x': [0, x_end],
                'y': [self.rt, 0],
                'type': 'C+',
                'mach': round(m_local, 2)
            })

        # 2. Reflected waves (C-)
        for i in range(num_rays):
            frac = (i + 1) / num_rays
            m_local = 1.2 + frac * (self.me - 1.2)
            
            x_start = self.wall_x[-1] * (0.2 + 0.8 * frac)
            idx = min(len(self.wall_x)-1, int(len(self.wall_x) * min(1.0, (frac * 1.5))))
            
            traces.append({
                'x': [x_start, self.wall_x[idx]],
                'y': [0, self.wall_y[idx]],
                'type': 'C-',
                'mach': round(m_local, 2)
            })
        return traces

    def generate_stl_mesh(self, num_theta=36):
        """
        Generates an ASCII STL representation of the nozzle wall.
        Revolves the wall contour around the X-axis.
        """
        if not hasattr(self, 'wall_x'):
            self.solve_contour()

        thetas = np.linspace(0, 2*np.pi, num_theta)
        
        stl_lines = ["solid nozzle_moc"]
        
        for i in range(len(self.wall_x) - 1):
            x1, x2 = self.wall_x[i], self.wall_x[i+1]
            r1, r2 = self.wall_y[i], self.wall_y[i+1]
            
            for j in range(num_theta - 1):
                t1, t2 = thetas[j], thetas[j+1]
                
                # quad vertices
                v1 = (x1, r1 * math.cos(t1), r1 * math.sin(t1))
                v2 = (x2, r2 * math.cos(t1), r2 * math.sin(t1))
                v3 = (x2, r2 * math.cos(t2), r2 * math.sin(t2))
                v4 = (x1, r1 * math.cos(t2), r1 * math.sin(t2))
                
                # Triangle 1
                stl_lines.append("  facet normal 0 0 0")
                stl_lines.append("    outer loop")
                stl_lines.append(f"      vertex {v1[0]:.6f} {v1[1]:.6f} {v1[2]:.6f}")
                stl_lines.append(f"      vertex {v2[0]:.6f} {v2[1]:.6f} {v2[2]:.6f}")
                stl_lines.append(f"      vertex {v3[0]:.6f} {v3[1]:.6f} {v3[2]:.6f}")
                stl_lines.append("    endloop")
                stl_lines.append("  endfacet")
                
                # Triangle 2
                stl_lines.append("  facet normal 0 0 0")
                stl_lines.append("    outer loop")
                stl_lines.append(f"      vertex {v1[0]:.6f} {v1[1]:.6f} {v1[2]:.6f}")
                stl_lines.append(f"      vertex {v3[0]:.6f} {v3[1]:.6f} {v3[2]:.6f}")
                stl_lines.append(f"      vertex {v4[0]:.6f} {v4[1]:.6f} {v4[2]:.6f}")
                stl_lines.append("    endloop")
                stl_lines.append("  endfacet")
                
        stl_lines.append("endsolid nozzle_moc")
        return "\n".join(stl_lines)
