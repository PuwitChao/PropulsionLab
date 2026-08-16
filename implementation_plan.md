# Implementation Plan: Full Application Audit & Playwright End-to-End (E2E) Test Suite

Conduct an exhaustive, end-to-end audit of all subsystems in the Propulsion Analysis Suite (Gas Turbine Parametric Cycle, Off-Design Solver, Rocket Propulsion & MoC Nozzle, Mission Constraint Synthesis, Diagnostics, UI Shell & Themes, Backend API & Security), and construct a production-grade automated E2E testing suite using Playwright.

## User Review Required

> [!IMPORTANT]
> **Playwright E2E Setup**: We will install `@playwright/test` in the `frontend` directory and install the necessary browser binaries (Chromium). The test suite will be runnable via `npx playwright test` or `npm run test:e2e`.
>
> **Multi-Sprint Execution**: To ensure zero sections are missed and full depth is maintained, the audit and testing procedures are partitioned into 6 structured sprints:
> - **Sprint 1**: Pre-Execution Architecture, Security & Dependency Audit
> - **Sprint 2**: Gas Turbine, Off-Design & Mission Physics Audit
> - **Sprint 3**: Rocket Propulsion & MoC Nozzle Solver Audit
> - **Sprint 4**: Frontend UI/UX, Aesthetics, Themes & Accessibility Audit
> - **Sprint 5**: Playwright E2E Test Suite Setup & Implementation
> - **Sprint 6**: Full Regression Verification, Systems Engineering FBD & Documentation

> [!NOTE]
> All existing unit and integration tests (130+ backend pytest cases, frontend API core tests) will be preserved and executed in full as part of the regression gate.

---

## Open Questions

None at this stage. All requirements are well-defined based on the repository architecture and the user's explicit request for an exhaustive audit and Playwright E2E suite.

---

## Proposed Changes

### Sprint 1: Pre-Execution Architecture, Security & Dependency Audit
- **Specialized Skills**: `orchestrate`, `security_audit`, `research_analyst`, `vibe_audit`
- **Actions**:
  - Perform dependency vulnerability scans using `npm audit` and check backend requirements.
  - Verify error handling isolation boundaries: ensure unexpected exceptions return safe structured JSON envelopes with correlation IDs (`request_id`) and without raw traceback leaks.
  - Verify Cantera `ct.Solution` instantiation safety: ensure solutions are created per-call and not cached globally across asynchronous worker threads.
  - Conduct vibe & code smells audit across backend and frontend code to eliminate dead code, redundant console logs, or inconsistent naming.

---

### Sprint 2: Gas Turbine, Off-Design & Mission Physics Audit
- **Specialized Skills**: `debug_expert`, `refactor`, `verify`
- **Target Files**:
  - [cycle.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/cycle.py)
  - [thermo.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/thermo.py)
  - [off_design.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/off_design.py)
  - [mission.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/mission.py)
  - [diagnostics.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/diagnostics.py)
  - [main.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/main.py)
- **Actions**:
  - Audit thermodynamic station calculations ($T_0, P_0, h, s$) and energy balance across compressor, burner, turbine, afterburner, and nozzle.
  - Audit multi-spool turbofan solver, bypass mixing conditions, bleed air extraction, and shaft power balance.
  - Audit off-design corrected speed lines, beta-parameter interpolation, choke limits, and surge margin calculations.
  - Audit aircraft master constraint curves ($T/W$ vs $W/S$), feasible region polygon computation, and Breguet payload-range equations.
  - Audit fault signature matrix and fault classification logic in diagnostics engine.

---

### Sprint 3: Rocket Propulsion & MoC Nozzle Solver Audit
- **Specialized Skills**: `debug_expert`, `verify`
- **Target Files**:
  - [analyzer.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/rocket/analyzer.py)
  - [moc.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/rocket/moc.py)
  - [main.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/main.py)
- **Actions**:
  - Audit Cantera Gibbs free energy chemical equilibrium solver across all supported propellant pairings (LOX/RP-1, LOX/LH2, LOX/CH4, N2O4/UDMH, etc.).
  - Audit frozen vs shifting equilibrium $I_{sp}$, characteristic velocity $c^*$, thrust coefficient $C_F$, and throat/exit area sizing.
  - Audit Summerfield criterion for nozzle flow separation in overexpanded altitude conditions.
  - Audit Bartz heat flux calculation and regenerative cooling jacket channel heat transfer / coolant temperature rise.
  - Audit Method of Characteristics (MoC) contour generation, characteristic mesh wave reflections, and 3D STL & Wavefront OBJ export streams.

---

### Sprint 4: Frontend UI/UX, Aesthetics, Themes & Accessibility Audit
- **Specialized Skills**: `ui_review`, `accessibility`, `vibe_audit`
- **Target Files**:
  - [App.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/App.jsx)
  - [ParametricCycle.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/ParametricCycle.jsx)
  - [PerformanceMap.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/PerformanceMap.jsx)
  - [RocketAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/RocketAnalysis.jsx)
  - [MissionAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/MissionAnalysis.jsx)
  - [Diagnostics.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/Diagnostics.jsx)
  - [Settings.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/Settings.jsx)
  - [EngineBlueprintDiagram.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/components/EngineBlueprintDiagram.jsx)
  - [index.css](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/index.css)
- **Actions**:
  - Verify glassmorphic dark/light UI tokens, responsive layouts, active tab indicators, and button hover states.
  - Verify Anti-AI-Slop compliance: no excessive generic glowing effects, clean typography hierarchy, balanced padding and margins.
  - Audit WCAG 2.1 AA accessibility standards: test color contrast ratios, keyboard accessibility (`Tab`, `Enter`, `Escape`, `U`, `P`, `?`), ARIA labels, and error boundary recovery.
  - Verify interactive Plotly charts: responsive resizing, hover templates, SI vs Imperial unit switching behavior.

---

### Sprint 5: Playwright E2E Test Suite Setup & Implementation
- **Specialized Skills**: `test_engineer`, `test_generator`, `system_integrator`
- **New Files**:
  - `frontend/playwright.config.js`
  - `frontend/e2e/navigation_and_shell.spec.js`
  - `frontend/e2e/parametric_cycle.spec.js`
  - `frontend/e2e/performance_map.spec.js`
  - `frontend/e2e/rocket_analysis.spec.js`
  - `frontend/e2e/mission_analysis.spec.js`
  - `frontend/e2e/diagnostics.spec.js`
  - `frontend/e2e/settings_and_errors.spec.js`
- **Actions**:
  - Install `@playwright/test` in `frontend/` and configure `playwright.config.js`.
  - Add npm script: `"test:e2e": "playwright test"`.
  - Write comprehensive E2E tests simulating real user workflows:
    - **Navigation & Shell**: Sidebar navigation across all 6 tabs, theme switching, unit toggles (SI/Imperial), keyboard shortcuts modal (`?`), preset selector modal (`p`), latency badge.
    - **Cycle Solver**: Switch engine types (turbojet, turbofan, ramjet), load preset (CFM56, F100), adjust sliders, execute calculation, inspect SVG blueprint station modal, view T-s and Sankey charts, export CSV and JSON.
    - **Performance Map**: Trigger off-design calculation, manipulate throttle slider, verify operating lines and surge margin display, download engine deck CSV.
    - **Rocket Analysis**: Select propellants (LOX/RP-1, LOX/LH2), run equilibrium analysis, view Isp vs O/F sweep, render 3D MoC nozzle mesh, inspect cooling jacket profile, test 3D STL and OBJ export triggers.
    - **Mission Synthesis**: Adjust takeoff, climb, cruise, and turn sliders, render constraint diagram, verify feasible region shading, inspect target design point, test Breguet range calculator.
    - **Diagnostics**: Adjust fault symptoms, trigger diagnosis, inspect radar chart and fault ranking table, verify remediation checklist items.
    - **Settings & Resilience**: Run system diagnostic check, toggle font sizing, clear local cache, test fallback error banners on backend disconnection.

---

### Sprint 6: Full Regression Verification, Systems Engineering FBD & Documentation
- **Specialized Skills**: `verify`, `functional_breakdown_diagram`, `documentation`, `handoff`
- **Target Files**:
  - [functional_breakdown_diagram.md](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/functional_breakdown_diagram.md)
  - [lessons_learned.md](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/lessons_learned.md)
  - [walkthrough.md](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/walkthrough.md)
- **Actions**:
  - Run full backend test suite (`pytest tests/ -v`).
  - Run frontend linting, unit test, and production build (`npm run test; npm run lint; npm run build`).
  - Run complete Playwright E2E suite (`npx playwright test`).
  - Update `functional_breakdown_diagram.md` maintaining zero line-crossing Mermaid FBD standards.
  - Document all audit findings, bugfixes, and E2E testing logs in `walkthrough.md` and `lessons_learned.md`.

---

## Verification Plan

### Automated Tests
1. **Backend Tests**: `pytest tests/ -v` (verify all unit and integration tests pass).
2. **Frontend Static Checks**: `cd frontend; npm run test; npm run lint; npm run build`.
3. **Playwright E2E Tests**: `cd frontend; npx playwright test`.

### Manual Verification
- Verify browser interaction and UI responsiveness in light and dark themes.
- Confirm seamless unit switching between SI and Imperial across all pages and blueprint components.
- Confirm 3D STL/OBJ downloads and CSV/JSON report exports download valid files.
