import math
import numpy as np

class MoCNozzle:
    """
    Supersonic nozzle contour design using Method of Characteristics.
    Calculates a parabolic bell nozzle contour based on exit Mach and gamma.
    """
    def __init__(self, gamma=1.2, mach_exit=3.0, throat_radius=0.1):
        if not (1.05 <= gamma <= 1.67):
            raise ValueError(f"gamma={gamma} out of valid range [1.05, 1.67]")
        if mach_exit <= 1.0:
            raise ValueError(f"mach_exit={mach_exit} must be > 1.0 for supersonic nozzle")
        if throat_radius <= 0:
            raise ValueError("throat_radius must be positive")
        self.gamma = gamma
        self.me = mach_exit
        self.rt = throat_radius
        # Standard bell nozzle: 75 % of the maximum Prandtl-Meyer turndown angle.
        # The factor 0.5 previously used here was incorrect; 60-80 % is the
        # industry-standard range (Rao 1958; Huzel & Huang, NASA SP-125).
        self.nu_max = 0.75 * self.prandtl_meyer(self.me)

    def prandtl_meyer(self, m):
        if m <= 1.0: return 0.0
        g = self.gamma
        factor = math.sqrt((g + 1) / (g - 1))
        nu = factor * math.atan(math.sqrt((g - 1) / (g + 1) * (m**2 - 1))) - math.atan(math.sqrt(m**2 - 1))
        return nu

    def solve_contour(self, subdivisions=30):
        """
        Generates wall points (x, y) for the divergent section of a bell nozzle.
        Uses a parabolic fit anchored at the throat (theta_0) and exit (theta_e).
        """
        # Initial and exit wall angles for the parabolic bell fit.
        # theta_0 ≈ 20-25° is typical for the throat-side expansion wave;
        # theta_e ≈ 8-12° is the nozzle exit half-angle.
        theta_0 = 24 * (math.pi / 180.0)
        theta_e = 8  * (math.pi / 180.0)

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

        # Verify the contour is monotonically non-decreasing in radius
        if not all(y_vals[i] <= y_vals[i+1] + 1e-12 for i in range(len(y_vals)-1)):
            raise ValueError("Nozzle contour is non-monotonic; check input parameters.")

        self.wall_x = x_vals
        self.wall_y = y_vals

        return x_vals.tolist(), y_vals.tolist()

    def get_mesh_data(self, num_rays=10):
        """
        Generates representative C+ and C- characteristic lines with Mach estimates.
        Note: these are visualisation-only approximations, not exact MoC solutions.
        """
        if not hasattr(self, 'wall_x'):
            self.solve_contour()

        traces = []

        # Expansion Fan (C+): linear Mach estimate from throat to exit
        for i in range(num_rays):
            frac = (i + 1) / num_rays
            m_local = 1.0 + frac * (self.me - 1.0)
            x_end = self.wall_x[-1] * (0.2 + 0.8 * frac)
            traces.append({
                'x': [0, x_end],
                'y': [self.rt, 0],
                'type': 'C+',
                'mach': round(m_local, 2)
            })

        # Reflected waves (C-): representative only
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
        Generates an ASCII STL of the nozzle wall by revolving the contour around X.
        Surface normals are computed via cross-product of triangle edges.
        """
        if num_theta < 6:
            raise ValueError("num_theta must be >= 6 for a valid mesh")
        if not hasattr(self, 'wall_x'):
            self.solve_contour()

        thetas = np.linspace(0, 2*np.pi, num_theta)

        def cross(a, b):
            return (
                a[1]*b[2] - a[2]*b[1],
                a[2]*b[0] - a[0]*b[2],
                a[0]*b[1] - a[1]*b[0],
            )

        def normalize(v):
            mag = math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)
            if mag < 1e-12:
                return (0.0, 0.0, 0.0)
            return (v[0]/mag, v[1]/mag, v[2]/mag)

        def tri_normal(p1, p2, p3):
            ab = (p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2])
            ac = (p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2])
            return normalize(cross(ab, ac))

        stl_lines = ["solid nozzle_moc"]

        for i in range(len(self.wall_x) - 1):
            x1, x2 = self.wall_x[i], self.wall_x[i+1]
            r1, r2 = self.wall_y[i], self.wall_y[i+1]

            for j in range(num_theta - 1):
                t1, t2 = thetas[j], thetas[j+1]

                v1 = (x1, r1 * math.cos(t1), r1 * math.sin(t1))
                v2 = (x2, r2 * math.cos(t1), r2 * math.sin(t1))
                v3 = (x2, r2 * math.cos(t2), r2 * math.sin(t2))
                v4 = (x1, r1 * math.cos(t2), r1 * math.sin(t2))

                # Triangle 1: v1-v2-v3
                n1 = tri_normal(v1, v2, v3)
                stl_lines.append(f"  facet normal {n1[0]:.6f} {n1[1]:.6f} {n1[2]:.6f}")
                stl_lines.append("    outer loop")
                stl_lines.append(f"      vertex {v1[0]:.6f} {v1[1]:.6f} {v1[2]:.6f}")
                stl_lines.append(f"      vertex {v2[0]:.6f} {v2[1]:.6f} {v2[2]:.6f}")
                stl_lines.append(f"      vertex {v3[0]:.6f} {v3[1]:.6f} {v3[2]:.6f}")
                stl_lines.append("    endloop")
                stl_lines.append("  endfacet")

                # Triangle 2: v1-v3-v4
                n2 = tri_normal(v1, v3, v4)
                stl_lines.append(f"  facet normal {n2[0]:.6f} {n2[1]:.6f} {n2[2]:.6f}")
                stl_lines.append("    outer loop")
                stl_lines.append(f"      vertex {v1[0]:.6f} {v1[1]:.6f} {v1[2]:.6f}")
                stl_lines.append(f"      vertex {v3[0]:.6f} {v3[1]:.6f} {v3[2]:.6f}")
                stl_lines.append(f"      vertex {v4[0]:.6f} {v4[1]:.6f} {v4[2]:.6f}")
                stl_lines.append("    endloop")
                stl_lines.append("  endfacet")

        stl_lines.append("endsolid nozzle_moc")
        return "\n".join(stl_lines)
