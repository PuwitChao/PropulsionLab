
# 🚀 Propulsion Analysis Suite (v2.0.1-STABLE)

A high-fidelity aerospace engineering platform for cycle analysis, rocket engine design, and mission constraint optimization.

---

## 🛠️ CORE ARCHITECTURE

### 🔥 THERMODYNAMIC ENGINE (BACKEND)
The backend is built with **FastAPI** and uses **Cantera** for chemical equilibrium and real-gas properties.

- **`core/gas_turbine/`**: 
  - On-design parametric cycle analysis for Turbojets, Mixed-flow Turbofans, and Separate-flow Turbofans.
  - Off-design matching using compressor map scaling and Newton-Raphson mass-flow iteration.
- **`core/rocket/`**:
  - Equilibrium combustion (Shifting or Frozen composition) using GRI-Mech 3.0.
  - Method of Characteristics (MoC) Nozzle Design for minimum length bell (MLB) and conical geometries.
- **`core/mission/`**:
  - Matching chart analysis (Thrust-to-Weight vs Wing Loading) for mission constraint synthesis.

### 🎨 DESIGN WORKSPACE (FRONTEND)
A premium **React/Vite** workspace with a modular grid layout and high-fidelity aerospace visualizations.

- **Visualizations**: D3.js and Plotly.js for Fishhook curves, Compressor Maps, and 3D Nozzle Surfaces.
- **State Management**: React Hooks with local persistence for design parameters.
- **Nomenclature**: Standard NASA/AIAA station identifiers (e.g., Sta 0, 2, 3, 4, 4.5, 5, 7, 9).

---

## ⚙️ MAINTENANCE & TROUBLESHOOTING

### 💥 SOCET CONFLICTS (Windows Error 10048)
If the backend fails to start because port 8000 is occupied, run the maintenance script:
```powershell
python kill_port_8000.py
```

### ✅ SYSTEM AUDIT
Verify all computational paths with the built-in audit suite:
```powershell
# Performs end-to-end testing of all major solvers
python audit_edge_cases.py
```

---

## 📅 SESSION LOG: 2026-03-22
- **Unified Nomenclature**: Replaced technical shorthand with professional titles (e.g., `Specific Thrust`, `Adiabatic Flame T`).
- **Standardized API**: Resolved `NaN` SFC errors by aligning backend `tsfc` and `spec_thrust` keys.
- **Rocket MoC**: Integrated `mach_exit` into the equilibrium solver to feed the 3D geometry engine.
- **Diagnostic Panel**: Added real-time health checks in the Settings workspace.

---

**AUTHOR**: Antigravity AI // COLLABORATION: RE-STABLE SESSION
