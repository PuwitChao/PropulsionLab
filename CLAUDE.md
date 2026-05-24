# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend
```bash
# Start backend (from repo root or backend/)
cd backend && python -m uvicorn main:app --reload
# or: python backend/main.py

# Install dependencies
pip install -r backend/requirements.txt

# Run tests
pytest tests/ -v

# Run a single test
pytest tests/test_core.py::test_turbojet_sls -v

# Run end-to-end audit
python tools/audit_edge_cases.py

# Free port 8000 if stuck (cross-platform)
python scripts/kill_port_8000.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build
npm run lint     # ESLint check
```

## Architecture Overview

The platform is a decoupled client-server application. The React SPA communicates with the FastAPI backend over REST; no SSR.

```
frontend/src/api.js  →  http://127.0.0.1:8000  →  backend/main.py
                                                      ├── core/gas_turbine/cycle.py      (CycleAnalyzer)
                                                      ├── core/gas_turbine/off_design.py (OffDesignSolver)
                                                      ├── core/gas_turbine/mission.py    (MissionAnalyzer)
                                                      ├── core/rocket/analyzer.py        (RocketAnalyzer)
                                                      └── core/rocket/moc.py             (MoCNozzle)
```

**All physical quantities are SI units** throughout the backend and core modules unless a variable name explicitly carries a unit suffix (e.g. `_deg`, `_km`). Frontend receives SI values and converts for display.

### Backend (`backend/main.py`)

Single-file FastAPI app. Pydantic models validate every request. Analytical core classes are instantiated per-request (stateless). Key endpoint groups:

| Prefix | Module |
|---|---|
| `/analyze/cycle` | Gas turbine on-design (turbojet, turbofan, sweeps, sensitivity) |
| `/analyze/offdesign` | Compressor map + throttle sweep |
| `/analyze/rocket` | Chemical equilibrium, O/F sweep, altitude table, MoC, STL/CSV export |
| `/analyze/mission` | T/W vs W/S constraint diagram |

`/analyze/cycle/multispool` is live — 8-iter HP/LP work-matching solver in `core/gas_turbine/cycle.py`. See `tests/test_multispool.py`.

### Core Physics (`core/`)

- **`core/units.py`**: Physical constants, unit converters, and the 4-layer ICAO standard atmosphere (`isa_atmosphere()`). Always use this for pressure/temperature at altitude.
- **`core/gas_turbine/cycle.py`**: `CycleAnalyzer` — on-design solver. Uses station-based enthalpy accounting with real gas properties from **Cantera GRI30**. A fresh `ct.Solution('gri30.yaml')` is created per `get_gas_props()` call to avoid state-mutation race conditions under FastAPI's async workers. Station numbering: S0 (freestream) → S2 (inlet) → S21 (fan) → S3 (HPC) → S4 (combustor) → S45 (LPT inlet) → S5 (turbine exit) → S7 (augmentor) → S9 (nozzle).
- **`core/gas_turbine/off_design.py`**: `OffDesignSolver` — parametric compressor map (corrected flow/speed format) and throttle deck sweeps. Takes a design-point dict from `CycleAnalyzer` to anchor the map.
- **`core/gas_turbine/mission.py`**: `MissionAnalyzer` — constraint diagram synthesis (stall, takeoff, landing, cruise, turn).
- **`core/rocket/analyzer.py`**: `RocketAnalyzer` — Cantera Gibbs-minimisation equilibrium for 20+ propellant combinations. Supports shifting/frozen composition, Bartz heat flux, and engine sizing from a thrust target. Propellant key strings (e.g. `"H2/O2"`, `"CH4/O2"`) map to Cantera species in a dict defined at class init.
- **`core/rocket/moc.py`**: `MoCNozzle` — Method of Characteristics nozzle contour, mesh data for Plotly, and STL generation.

### Frontend (`frontend/src/`)

- **`App.jsx`**: Shell — sidebar nav, header status bar, footer. Renders one page component at a time via `activeTab` state; polls `/health` every 30 s.
- **`api.js`**: `fetchData` (JSON) and `fetchBlob` (binary downloads). Base URL read from `import.meta.env.VITE_API_URL`; falls back to `http://127.0.0.1:8000` for local dev.
- **Pages** (`pages/`): `ParametricCycle`, `PerformanceMap`, `RocketAnalysis`, `MissionAnalysis`, `Settings`. Each page owns its own state and calls the API directly.
- **`context/SettingsContext.jsx`**: `theme` and `textSize` persisted to `localStorage`; `textSize` drives `--font-scale` CSS variable.
- **`hooks/usePersistentState.js`**: `localStorage`-backed `useState` — used for `MissionAnalysis` aircraft configs.
- **Plotly**: Used throughout for 2D charts and the 3D MoC nozzle surface. Chart layout tokens come from a `getLayout()` helper in `utils/chartUtils.js` that respects the current theme.

## Key Conventions

- **Cantera thread safety**: Never share a `ct.Solution` instance across calls. Always create a fresh one — the overhead is negligible (~0.3 ms for gri30).
- **Multispool solver**: `solve_multispool()` in `core/gas_turbine/cycle.py` is fully implemented (8-iter HP/LP work-matching). The `/analyze/cycle/multispool` endpoint is live. Test coverage in `tests/test_multispool.py`.
- **Frontend wiring**: CSV/STL export, sensitivity sweep, O/F sweep, and altitude performance table are all wired to their respective backend endpoints.
- **Deployment**: `Dockerfile` + `docker-compose.yml` in repo root. Set `VITE_API_URL` at build time and `CORS_ORIGINS` at runtime. See `.env.example`.
- **CI**: `.github/workflows/ci.yml` runs `pytest` + `npm run lint` + `npm run build` on every PR.
- **Pending (Sprint 8 physics)**: `MoCNozzle` in `core/rocket/moc.py` uses a quadratic bell contour — real MoC characteristics integration is planned.
