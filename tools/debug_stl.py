
import math
import numpy as np

class MoCNozzle:
    def __init__(self, gamma=1.2, mach_exit=3.0, throat_radius=0.1):
        self.gamma = gamma
        self.me = mach_exit
        self.rt = throat_radius

    def solve_contour(self, subdivisions=30):
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

    def generate_stl_mesh(self, num_theta=36):
        if not hasattr(self, 'wall_x'):
            self.solve_contour()
        thetas = np.linspace(0, 2*np.pi, num_theta)
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
                stl_lines.append("  facet normal 0 0 0")
                stl_lines.append("    outer loop")
                stl_lines.append(f"      vertex {v1[0]:.6f} {v1[1]:.6f} {v1[2]:.6f}")
                stl_lines.append(f"      vertex {v2[0]:.6f} {v2[1]:.6f} {v2[2]:.6f}")
                stl_lines.append(f"      vertex {v3[0]:.6f} {v3[1]:.6f} {v3[2]:.6f}")
                stl_lines.append("    endloop")
                stl_lines.append("  endfacet")
                stl_lines.append("  facet normal 0 0 0")
                stl_lines.append("    outer loop")
                stl_lines.append(f"      vertex {v1[0]:.6f} {v1[1]:.6f} {v1[2]:.6f}")
                stl_lines.append(f"      vertex {v3[0]:.6f} {v3[1]:.6f} {v3[2]:.6f}")
                stl_lines.append(f"      vertex {v4[0]:.6f} {v4[1]:.6f} {v4[2]:.6f}")
                stl_lines.append("    endloop")
                stl_lines.append("  endfacet")
        stl_lines.append("endsolid nozzle_moc")
        return "\n".join(stl_lines)

if __name__ == "__main__":
    n = MoCNozzle()
    text = n.generate_stl_mesh()
    print(f"STL Size: {len(text)} characters")
    print(text[:100])
    print("...")
    print(text[-100:])
