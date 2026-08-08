# Task List: Modernization & Resilience Hardening (2026-08-09)

- [x] 1. Tracking and acceptance criteria
  - [x] Record scope, dependencies, rollback, and acceptance criteria in implementation_plan.md
  - [x] Add the execution checklist and test matrix sections to durable project docs

- [x] 2. Backend error hardening
  - [x] Add a structured safe error envelope and request correlation ID
  - [x] Centralize unexpected exception handling and remove raw exception details from 500 responses
  - [x] Preserve HTTP 422 validation behavior and existing successful response schemas

- [x] 3. Frontend failure recovery
  - [x] Add bounded request timeout/abort behavior and normalized API errors
  - [x] Keep retry behavior explicit and safe for health/read-only requests
  - [x] Replace raw render-error details with a generic recovery message

- [x] 4. Dependency and CI guardrails
  - [x] Refresh only compatibility-safe dependency versions and lock entries
  - [x] Add repeatable npm and Python audit checks with clear tool-availability reporting
  - [x] Keep Python 3.11 / Node 20 support explicit until compatibility evidence supports a runtime change

- [x] 5. Regression verification
  - [x] Add backend tests for structured errors, exception sanitization, and correlation IDs
  - [x] Add frontend helper tests for non-JSON errors, timeout/abort, and successful JSON/blob responses
  - [x] Run full backend tests plus frontend lint/build

- [x] 6. Traceability and handoff
  - [x] Update functional_breakdown_diagram.md for error/recovery boundaries if needed
  - [x] Update walkthrough.md with changed behavior and verification evidence
  - [x] Record unresolved audit-tool limitations and final status

- [x] 1. Research & Master Implementation Plan Creation
  - [x] Audit backend physics solvers (`core/`), REST endpoints (`backend/main.py`), and React frontend (`frontend/src/`)
  - [x] Create `implementation_plan.md` and `task.md` in workspace root on D: drive

- [x] 2. Core Physics & Backend Solver Expansion
  - [x] Add Afterburner/Reheat turbofan and Ramjet cycle analysis mode to `core/gas_turbine/cycle.py`
  - [x] Add Method of Characteristics (MoC) Prandtl-Meyer characteristic line solver, STL 3D export, and Wavefront OBJ 3D export to `core/rocket/moc.py`
  - [x] Add real-world engine presets module `core/presets.py` and API endpoint `/analyze/presets` in `backend/main.py`
  - [x] Extend Mission Analysis solver `core/gas_turbine/mission.py` with Breguet payload-range calculation

- [x] 3. Units Conversion & Presets Layer
  - [x] Create `frontend/src/utils/unitConversion.js` for seamless SI <-> Imperial unit formatting
  - [x] Create `frontend/src/data/presets.js` with comprehensive turbofan, rocket, aircraft mission, and diagnostic profiles

- [x] 4. App Shell & Global Layout Polish
  - [x] Refine `frontend/src/index.css` with enhanced dark/light glassmorphic styling, interactive focus rings, and custom tabs
  - [x] Upgrade `frontend/src/App.jsx` with real-time backend API latency badge, Units Toggle button, Quick Presets modal trigger, and Keyboard Shortcuts overlay (`?`)
  - [x] Create `frontend/src/components/PresetSelectorModal.jsx` and `frontend/src/components/KeyboardShortcutsModal.jsx`

- [x] 5. Interactive Page Overhaul & Blueprint Diagrams
  - [x] Build `frontend/src/components/EngineBlueprintDiagram.jsx` (Interactive SVG engine schematic with real-time temperature/pressure heat map color gradients and station inspector modal)
  - [x] Overhaul `ParametricCycle.jsx` with preset loader, afterburner/ramjet mode toggle, interactive SVG heatmap, and report export
  - [x] Overhaul `RocketAnalysis.jsx` with 2D/3D MoC nozzle characteristics viewer, STL & Wavefront OBJ 3D geometry exports, propellant equilibrium summary, and presets
  - [x] Overhaul `MissionAnalysis.jsx` with feasible constraint envelope polygon shading, target design point marker, and Breguet payload-range estimator
  - [x] Overhaul `Diagnostics.jsx` with fault signature radar, telemetry gauges, and failure injection controls
  - [x] Overhaul `Settings.jsx` with system diagnostic health check, default unit preferences, cache clear, and API endpoint config

- [x] 6. Comprehensive Verification & Systems Engineering Documentation
  - [x] Run backend unit and integration test suite (`pytest tests/ -v`) (130/130 passed!)
  - [x] Run frontend linter and production build (`npm run lint; npm run build`) (0 errors!)
  - [x] Maintain zero line-crossing Systems Engineering FBD diagram in `functional_breakdown_diagram.md`
  - [x] Document audit results, features, and verification in `walkthrough.md`
