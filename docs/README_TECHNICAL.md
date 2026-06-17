# 🚀 Propulsion Analysis Suite (v2.1.0-STABLE)

A professional, high-fidelity aerospace engineering platform for cycle analysis, rocket engine design, and mission constraint optimization.

---

## 🛠️ CORE ARCHITECTURE

### 🔥 THERMODYNAMIC ENGINE (BACKEND)
The backend is built with **FastAPI** and uses **Cantera** for chemical equilibrium and real-gas properties.

- **`core/gas_turbine/`**: 
  - On-design parametric cycle analysis for Turbojets, Mixed-flow Turbofans, and Separate-flow Turbofans.
  - Off-design matching using compressor map scaling and Newton-Raphson mass-flow iteration.
- **`core/rocket/`**: 
  - Equilibrium combustion (Shifting or Frozen) and Method of Characteristics (MoC) geometry engine.
- **`tools/`**: 
  - Computational audit suites and diagnostic utility scripts.
- **`tests/`**: 
  - Automated regression suite using `pytest`.

### 🎨 DESIGN WORKSPACE (FRONTEND)
A premium **React/Vite** workspace with a modular grid layout and high-fidelity aerospace visualizations.

---

## ⚙️ MAINTENANCE & TROUBLESHOOTING

### 💥 AUTOMATIC PORT MAINTENANCE
The backend automatically attempts to clear port 8000 on startup. If manual intervention is needed:
```powershell
python scripts/kill_port_8000.py
```

### ✅ SYSTEM AUDIT & TESTING
Verify solvers and API integrity:
```powershell
# Run the end-to-end audit
python tools/audit_edge_cases.py

# Run unit tests
pytest tests/
```

---

## 📅 SESSION LOG: 2026-03-24
- **Sprint 3 (QoL)**: Reorganized project structure, moved scripts to `tools/` and `scripts/`.
- **Standardized Versioning**: Updated all components to `v2.1.0-STABLE`.
- **Backend Logging**: Implemented structured `logging` and added `/version` endpoint.
- **Type-Safe Core**: Added full type-hint coverage across all core solvers.
- **Test Suite**: Initialized `tests/` directory with `pytest` for stability.

---

**AUTHOR**: Antigravity AI // COLLABORATION: RE-STABLE SESSION
