# Task List: Full Suite Audit & Playwright E2E Testing

## Sprint 1: Pre-Execution Architecture, Security & Dependency Audit
- [x] Execute Python dependency audit (`pip-audit` / vulnerability check) <!-- id: 1.1 -->
- [x] Execute Frontend dependency audit (`npm audit`) <!-- id: 1.2 -->
- [x] Verify Cantera solution concurrency safety and error isolation boundaries <!-- id: 1.3 -->
- [x] Audit backend REST request/response contracts and safe error envelope <!-- id: 1.4 -->
- [x] Conduct codebase vibe & code smells audit <!-- id: 1.5 -->

## Sprint 2: Gas Turbine, Off-Design & Mission Physics Audit
- [x] Audit `core/gas_turbine/cycle.py` & `thermo.py` (Turbojet, Turbofan, Turboprop, Turboshaft, Afterburning, Ramjet, Station Enthalpy Conservation) <!-- id: 2.1 -->
- [x] Audit Multi-Spool solver (`core/gas_turbine/cycle.py`) & bleed air extractions <!-- id: 2.2 -->
- [x] Audit Off-Design & Compressor Map solver (`core/gas_turbine/off_design.py`) & throttle sweeps <!-- id: 2.3 -->
- [x] Audit Aircraft Mission Constraint solver (`core/gas_turbine/mission.py`) & Breguet range equations <!-- id: 2.4 -->
- [x] Audit Engine Diagnostics & Health engine (`core/diagnostics.py`) <!-- id: 2.5 -->

## Sprint 3: Rocket Propulsion & MoC Nozzle Solver Audit
- [x] Audit Rocket Chemical Equilibrium Solver (`core/rocket/analyzer.py` Cantera Gibbs minimization, frozen vs shifting Isp) <!-- id: 3.1 -->
- [x] Audit Propellant sweep, optimum O/F calculation, and altitude performance table with Summerfield separation <!-- id: 3.2 -->
- [x] Audit Bartz heat flux equation and regenerative cooling jacket solver <!-- id: 3.3 -->
- [x] Audit Method of Characteristics (MoC) 2D contour & 3D mesh generator (`core/rocket/moc.py`) <!-- id: 3.4 -->
- [x] Audit 3D STL and Wavefront OBJ geometry exporter pipelines <!-- id: 3.5 -->

## Sprint 4: Frontend UI/UX, Aesthetics, Themes & Accessibility Audit
- [x] Audit `ParametricCycle.jsx` (Inputs, sliders, blueprint heat map SVG, T-s & Sankey diagrams, unit conversions, CSV/JSON/PDF exports) <!-- id: 4.1 -->
- [x] Audit `PerformanceMap.jsx` (Compressor map Plotly traces, throttle slider, operating lines, surge margin metrics) <!-- id: 4.2 -->
- [x] Audit `RocketAnalysis.jsx` (Propellant selector, equilibrium stats, 2D/3D MoC nozzle Plotly viewer, cooling curves, geometry download triggers) <!-- id: 4.3 -->
- [x] Audit `MissionAnalysis.jsx` (Master constraint diagram T/W vs W/S, feasible envelope polygon, target design marker, payload-range estimator) <!-- id: 4.4 -->
- [x] Audit `Diagnostics.jsx` (Symptom sliders, radar charts, fault distribution bar charts, remediation action cards) <!-- id: 4.5 -->
- [x] Audit `Settings.jsx`, `App.jsx`, Modals & Shared Components (`PresetSelectorModal`, `KeyboardShortcutsModal`, `StatPanel`, `SliderControl`, `ErrorBoundary`) <!-- id: 4.6 -->
- [x] Conduct WCAG 2.1 AA Accessibility & Anti-AI-Slop visual aesthetic review (contrast ratios, focus rings, typography, responsive breakpoints) <!-- id: 4.7 -->

## Sprint 5: Playwright E2E Test Suite Setup & Implementation
- [x] Install Playwright (`@playwright/test`) and browser binaries in `frontend/` <!-- id: 5.1 -->
- [x] Configure `playwright.config.js` (baseURL, webServer orchestration, browser matrix, screenshot on failure) <!-- id: 5.2 -->
- [x] Implement E2E Spec: `e2e/navigation_and_shell.spec.js` (Sidebar navigation, theme toggles, units toggling, modals `?` and `p`, API latency badge) <!-- id: 5.3 -->
- [x] Implement E2E Spec: `e2e/parametric_cycle.spec.js` (Engine modes, preset loader, calculate trigger, SVG station modal, sweep plots, export downloads) <!-- id: 5.4 -->
- [x] Implement E2E Spec: `e2e/performance_map.spec.js` (Map rendering, throttle sweep interaction, engine deck export) <!-- id: 5.5 -->
- [x] Implement E2E Spec: `e2e/rocket_analysis.spec.js` (Propellant change, CEA calculation, 3D MoC plot render, cooling jacket, STL/OBJ download) <!-- id: 5.6 -->
- [x] Implement E2E Spec: `e2e/mission_analysis.spec.js` (Constraint diagram generation, slider changes, feasible space polygon, range sensitivity) <!-- id: 5.7 -->
- [x] Implement E2E Spec: `e2e/diagnostics.spec.js` (Fault sliders, diagnose action, radar plot check, remediation checklist) <!-- id: 5.8 -->
- [x] Implement E2E Spec: `e2e/settings_and_errors.spec.js` (Health check status, cache clearing, API failure fallback UI) <!-- id: 5.9 -->

## Sprint 6: Full Regression Verification, Systems Engineering FBD & Documentation
- [x] Execute backend unit & integration tests (`pytest tests/ -v`) <!-- id: 6.1 -->
- [x] Execute frontend unit tests, ESLint, and production build (`npm run test; npm run lint; npm run build`) <!-- id: 6.2 -->
- [x] Execute complete Playwright E2E test suite in headless mode (26 / 26 passed) <!-- id: 6.3 -->
- [x] Remediate any detected bugs or regressions <!-- id: 6.4 -->
- [x] Update Systems Engineering Functional Breakdown Diagram (`functional_breakdown_diagram.md`) <!-- id: 6.5 -->
- [x] Update `lessons_learned.md` and `walkthrough.md` with complete audit telemetry <!-- id: 6.6 -->
