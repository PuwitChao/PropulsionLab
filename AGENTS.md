# AGENTS.md

This file provides guidance to Codex when working in this repository.

## Project Overview

Propulsion Analysis Suite is a decoupled React + FastAPI application for gas turbine cycle analysis, rocket combustion/nozzle analysis, and aircraft mission constraint synthesis.

- Frontend: React 19, Vite 8, Plotly, vanilla CSS.
- Backend: FastAPI, Pydantic, stateless request handlers.
- Core physics: Cantera, NumPy, pandas, custom gas turbine and rocket analyzers.
- Architecture: React SPA calls the FastAPI backend over REST. There is no SSR layer.

All physical quantities are SI units throughout backend and core modules unless a variable name explicitly carries a unit suffix such as `_deg` or `_km`. The frontend receives SI values and converts values for display.

## Commands

### Backend

```bash
pip install -r backend/requirements.txt
pip install pytest pytest-cov httpx
python -m uvicorn backend.main:app --reload
pytest tests/ -v
pytest tests/test_core.py::test_turbojet_sls -v
python tools/audit_edge_cases.py
python scripts/kill_port_8000.py
```

The backend can also be run from `backend/`:

```bash
cd backend
python -m uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm ci
npm run dev
npm run lint
npm run build
```

Local frontend dev server defaults to `http://localhost:5173`. The API base URL comes from `VITE_API_URL` and falls back to `http://127.0.0.1:8000`.

## Architecture Map

```text
frontend/src/api.js -> http://127.0.0.1:8000 -> backend/main.py
                                                    |-- core/gas_turbine/cycle.py      CycleAnalyzer
                                                    |-- core/gas_turbine/off_design.py OffDesignSolver
                                                    |-- core/gas_turbine/mission.py    MissionAnalyzer
                                                    |-- core/rocket/analyzer.py        RocketAnalyzer
                                                    `-- core/rocket/moc.py             MoCNozzle
```

### Backend

`backend/main.py` is a single-file FastAPI app. Pydantic models validate requests. Core analyzer classes are instantiated per request and should remain stateless.

Endpoint groups:

| Prefix | Purpose |
| --- | --- |
| `/analyze/cycle` | Gas turbine on-design, turbofan, sweeps, sensitivity, multispool |
| `/analyze/offdesign` | Compressor map and throttle sweeps |
| `/analyze/rocket` | Chemical equilibrium, O/F sweep, altitude table, MoC, STL/CSV export |
| `/analyze/mission` | T/W vs W/S constraint diagrams |
| `/analyze/diagnostics` | Engine fault diagnostic calculations and remediation advice |

### Core Physics

- `core/units.py`: Constants, unit converters, and `isa_atmosphere()`. Use this for pressure and temperature at altitude.
- `core/gas_turbine/cycle.py`: `CycleAnalyzer` on-design solver with station-based enthalpy accounting and Cantera GRI30 gas properties.
- `core/gas_turbine/off_design.py`: `OffDesignSolver` for corrected-flow/corrected-speed compressor maps and throttle decks.
- `core/gas_turbine/mission.py`: `MissionAnalyzer` for stall, takeoff, landing, cruise, and turn constraints.
- `core/rocket/analyzer.py`: `RocketAnalyzer` for Cantera Gibbs-minimization equilibrium, propellant sweeps, Bartz heat flux, and engine sizing.
- `core/rocket/moc.py`: `MoCNozzle` for nozzle contour, Plotly mesh data, and STL generation. Current implementation uses a quadratic bell contour; real characteristics integration is still planned.

### Frontend

- `frontend/src/App.jsx`: App shell, sidebar navigation, status bar, page routing through `activeTab`, and `/health` polling.
- `frontend/src/api.js`: `fetchData` for JSON and `fetchBlob` for downloads.
- `frontend/src/pages/`: Main analysis pages own their local state and call API helpers directly.
- `frontend/src/context/SettingsContext.jsx`: Theme and text-size persistence through `localStorage`.
- `frontend/src/hooks/usePersistentState.js`: `localStorage`-backed state helper.
- Plotly is used for 2D charts and 3D MoC nozzle visualization. Keep chart layout tokens centralized through existing chart utilities.

## Engineering Conventions

- Preserve SI-unit contracts between backend, core, and frontend.
- Do not share a `ct.Solution` instance across calls. Create a fresh Cantera solution in property helpers to avoid state mutation and async worker races.
- Keep backend request handlers stateless. Avoid module-level mutable state for calculations.
- Prefer extending existing analyzers, request models, and page patterns over adding parallel abstractions.
- Keep exports wired through API endpoints and `fetchBlob`; avoid duplicating export logic in the frontend.
- When changing physics behavior, add or update focused tests in `tests/`.
- When changing user-facing frontend behavior, run lint/build and check the rendered UI in a browser when practical.

## Verification

Run the smallest useful check first, then broaden when the change touches shared behavior.

- Backend/core change: `pytest tests/ -v`
- Single physics path: run the relevant focused pytest file or test case first.
- Frontend change: `cd frontend && npm run lint && npm run build`
- Full local confidence: backend tests plus frontend lint/build.

CI currently runs backend tests with coverage and frontend lint/build on PRs.

## Git Notes

- Codex branches should use the `codex/` prefix unless the user requests otherwise.
- Do not revert user changes. Inspect dirty files before editing and keep changes scoped to the request.
- Keep generated caches, build outputs, and dependency folders out of commits.
