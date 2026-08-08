# Implementation Plan: Modernization & Resilience Hardening (2026-08-09)

## CI Audit Remediation (2026-08-09)

### Problem

The latest GitHub Actions run for `ac1076c7` failed in the backend `Audit Python dependencies` step. The prior dependency set allowed `starlette==0.50.0`, which is covered by current advisories and fails `pip-audit --strict`.

### Fix Plan

1. Upgrade FastAPI to a version that supports patched Starlette releases.
2. Pin Starlette explicitly so the audit gate resolves a non-vulnerable version deterministically.
3. Remove backend logging dependence on `request.url.path` by using the routed ASGI scope path.
4. Reproduce the failed audit gate locally, then rerun backend tests with coverage and frontend gates.
5. Update the changelog, handoff, FBD, roadmap, task list, and test plan before commit/push.

### Acceptance

- `pip-audit -r backend/requirements.txt --strict` reports no known vulnerabilities.
- The full backend suite remains green with the upgraded FastAPI/Starlette set.
- Frontend tests, lint, build, and production npm audit remain green.
- The pushed commit triggers a replacement GitHub Actions run on `main`.

## Current Workstream

This workstream follows the completed UI and physics overhaul documented below. It modernizes dependency and delivery guardrails, hardens backend and frontend failure behavior, and adds regression coverage without changing SI-unit physics contracts or solver outputs.

### Objectives

1. Keep dependency upgrades compatibility-safe and reproducible.
2. Return structured, non-sensitive API errors while retaining detailed server logs.
3. Ensure frontend requests terminate cleanly on network failure or timeout.
4. Preserve module-level recovery through the React error boundary without exposing raw runtime details.
5. Add acceptance tests for validation, server failures, malformed responses, timeout behavior, and recovery UI.

### Scope and Ownership

| Area | Files | Deliverable |
| --- | --- | --- |
| Tracking | implementation_plan.md, task.md, test_plan.md | Durable plan, checklist, test matrix, rollback notes |
| Backend errors | backend/main.py, backend/errors.py | Safe error envelope, centralized handlers, correlation logging |
| Frontend errors | frontend/src/api.js, frontend/src/components/ErrorBoundary.jsx | Timeout/abort handling, normalized errors, generic fallback copy |
| Dependencies and CI | backend/requirements.txt, frontend/package.json, frontend/package-lock.json, .github/workflows/ci.yml | Safe patch/minor refreshes, audit gate, explicit runtime checks |
| Tests | tests/test_api.py, tests/test_error_handling.py, frontend/src/api.test.js | Positive, negative, boundary, malformed-response, and recovery coverage |
| Traceability | functional_breakdown_diagram.md, walkthrough.md | Confirm architecture/error-boundary traceability and verification record |

### Execution Order and Dependencies

1. Update tracking artifacts and acceptance criteria.
2. Add backend error primitives and handlers; update API tests.
3. Add frontend request recovery and safe render fallback; add focused helper tests.
4. Refresh only compatible dependency ranges/lock entries and add CI audit checks.
5. Run focused tests, then the full backend suite and frontend lint/build.
6. Synchronize FBD/walkthrough and record any unresolved audit-tool limitations.

### Migration and Rollback

- Dependency changes are limited to versions proven by the existing Python 3.11 and Node 20 CI matrix. Major upgrades are deferred unless a focused compatibility test proves them safe.
- Backend and frontend error envelopes are additive: existing successful response schemas remain unchanged, and validation remains HTTP 422.
- Rollback is file-scoped: restore changed dependency manifests/lockfile or revert the error-handler/request-helper changes; no data migrations or external state changes are introduced.

### Acceptance Criteria

- API failures expose a stable error_code, safe message, and request identifier; raw exception text is logged server-side only.
- Frontend requests abort after a bounded timeout, normalize JSON and non-JSON failures, and always clear loading state through existing callers.
- ErrorBoundary renders a generic recovery action without printing raw runtime details.
- Existing backend tests remain green; new negative/boundary tests pass.
- Frontend lint/build remain green; dependency audit has no unresolved high/critical findings and the known Plotly transitive advisory is remediated or explicitly documented.
- functional_breakdown_diagram.md and walkthrough.md reflect the finalized error/recovery flow.

## Current Workstream

This workstream follows the completed UI and physics overhaul documented below. It modernizes dependency and delivery guardrails, hardens backend and frontend failure behavior, and adds regression coverage without changing SI-unit physics contracts or solver outputs.

### Objectives

1. Keep dependency upgrades compatibility-safe and reproducible.
2. Return structured, non-sensitive API errors while retaining detailed server logs.
3. Ensure frontend requests terminate cleanly on network failure or timeout.
4. Preserve module-level recovery through the React error boundary without exposing raw runtime details.
5. Add acceptance tests for validation, server failures, malformed responses, timeout behavior, and recovery UI.

### Scope and Ownership

| Area | Files | Deliverable |
| --- | --- | --- |
| Tracking | implementation_plan.md, task.md, test_plan.md | Durable plan, checklist, test matrix, rollback notes |
| Backend errors | backend/main.py, backend/errors.py | Safe error envelope, centralized handlers, correlation logging |
| Frontend errors | frontend/src/api.js, frontend/src/components/ErrorBoundary.jsx | Timeout/abort handling, normalized errors, generic fallback copy |
| Dependencies and CI | backend/requirements.txt, frontend/package.json, frontend/package-lock.json, .github/workflows/ci.yml | Safe patch/minor refreshes, audit gate, explicit runtime checks |
| Tests | tests/test_api.py, tests/test_error_handling.py, frontend/src/api.test.js | Positive, negative, boundary, malformed-response, and recovery coverage |
| Traceability | functional_breakdown_diagram.md, walkthrough.md | Confirm architecture/error-boundary traceability and verification record |

### Execution Order and Dependencies

1. Update tracking artifacts and acceptance criteria.
2. Add backend error primitives and handlers; update API tests.
3. Add frontend request recovery and safe render fallback; add focused helper tests.
4. Refresh only compatible dependency ranges/lock entries and add CI audit checks.
5. Run focused tests, then the full backend suite and frontend lint/build.
6. Synchronize FBD/walkthrough and record any unresolved audit-tool limitations.

### Migration and Rollback

- Dependency changes are limited to versions proven by the existing Python 3.11 and Node 20 CI matrix. Major upgrades are deferred unless a focused compatibility test proves them safe.
- Backend and frontend error envelopes are additive: existing successful response schemas remain unchanged, and validation remains HTTP 422.
- Rollback is file-scoped: restore changed dependency manifests/lockfile or revert the error-handler/request-helper changes; no data migrations or external state changes are introduced.

### Acceptance Criteria

- API failures expose a stable error_code, safe message, and request identifier; raw exception text is logged server-side only.
- Frontend requests abort after a bounded timeout, normalize JSON and non-JSON failures, and always clear loading state through existing callers.
- ErrorBoundary renders a generic recovery action without printing raw runtime details.
- Existing backend tests remain green; new negative/boundary tests pass.
- Frontend lint/build remain green; dependency audit has no unresolved high/critical findings and the known Plotly transitive advisory is remediated or explicitly documented.
- functional_breakdown_diagram.md and walkthrough.md reflect the finalized error/recovery flow.

Full app audit and major UI/UX and functional overhaul for the Propulsion Analysis Suite. The goal is to elevate the application to a polished, professional, state-of-the-art engineering platform ready for public deployment and rigorous use, featuring expanded physics solvers, engine presets, interactive SVG blueprint heatmaps, MoC Prandtl-Meyer nozzle characteristics, dynamic constraint envelope visualization, robust error handling, and comprehensive stability verification.

## User Review Required

> [!IMPORTANT]
> This overhaul includes:
> 1. **Physics & Core Expansion**: Addition of Turbofan with Reheat/Afterburner cycle mode, Ramjet cycle mode, Method of Characteristics (MoC) Prandtl-Meyer characteristic net solver, and aircraft mission constraint synthesis with payload-range estimation.
> 2. **Real-World Engine & Rocket Presets**: Built-in instant configuration presets for CFM56-7B, GE90-115B, F100-PW-229, Olympus 593, Merlin 1D, RS-25, Raptor 2, F-16 Falcon, and Concorde.
> 3. **Interactive Station Heatmap & MoC Visualizations**: Dynamic SVG engine schematic with temperature/pressure heat map gradients and interactive station inspection; 3D MoC nozzle mesh and Mach characteristic lines.
> 4. **Units System Toggle**: Seamless UI-level toggle between Standard International (SI) and Imperial units for all displays, cards, and tooltips.
> 5. **Stability & Error Recovery**: Global error boundaries, toast notifications, offline resilience, and input range guardrails.

## Proposed Changes

### Core Physics & Backend Solver Extensions

#### [MODIFY] [cycle.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/cycle.py)
#### [MODIFY] [moc.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/rocket/moc.py)
#### [MODIFY] [analyzer.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/rocket/analyzer.py)
#### [MODIFY] [mission.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/mission.py)
#### [MODIFY] [main.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/main.py)
- Extend `CycleAnalyzer` to support afterburner reheat combustion and high-speed Ramjet cycle thermodynamics.
- Extend `MoCNozzle` in `core/rocket/moc.py` to calculate Prandtl-Meyer expansion characteristic waves, exit wall turn angle, and generate STL/OBJ geometry export buffers.
- Add preset data provider endpoint `/analyze/presets` in `backend/main.py` serving real-world turbofan, rocket, and mission specs.
- Enhance input parameter validation and edge-case numerical fallback logic.

---

### Presets & Data Layer

#### [NEW] [presets.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/presets.py)
#### [NEW] [presets.js](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/data/presets.js)
- Define authoritative preset profiles for gas turbines (CFM56-7B, GE90-115B, F100-PW-229, Olympus 593), rocket engines (Merlin 1D, RS-25, Raptor 2, RL10), aircraft missions (F-16 Falcon, Commercial Jetliner, Concorde, U-2 Recon), and fault scenarios.

---

### App Shell, Global Controls & Units Conversion

#### [MODIFY] [index.css](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/index.css)
#### [MODIFY] [App.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/App.jsx)
#### [NEW] [unitConversion.js](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/utils/unitConversion.js)
#### [NEW] [KeyboardShortcutsModal.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/components/KeyboardShortcutsModal.jsx)
#### [NEW] [PresetSelectorModal.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/components/PresetSelectorModal.jsx)
- Implement global SI / Imperial unit display converter.
- Add top header controls: backend ping latency badge, unit toggle pill, Quick Presets modal, keyboard shortcuts dialog (`?`).
- Polish dark/light glassmorphic UI design tokens and animation curves.

---

### Interactive Page Views & Visualizations

#### [MODIFY] [ParametricCycle.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/ParametricCycle.jsx)
#### [NEW] [EngineBlueprintDiagram.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/components/EngineBlueprintDiagram.jsx)
- Build an interactive SVG Engine Blueprint Schematic featuring real-time temperature/pressure station heat-map color gradients, flow direction animation, and click-to-inspect station modal.
- Add preset loader selector, afterburner and ramjet cycle mode toggles, and calculation report export.

#### [MODIFY] [PerformanceMap.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/PerformanceMap.jsx)
- Enhance compressor map with operating line path, surge line warning zone shading, efficiency contours, and corrected throttle deck export.

#### [MODIFY] [RocketAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/RocketAnalysis.jsx)
- Enhance MoC nozzle view with 2D Prandtl-Meyer characteristic line mesh and 3D surface plot viewer, STL 3D model export button, propellant equilibrium summary, and rocket presets.

#### [MODIFY] [MissionAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/MissionAnalysis.jsx)
- Render filled polygon envelope for feasible T/W vs W/S operating domain, design point target marker, payload-range estimate, and aircraft mission presets.

#### [MODIFY] [Diagnostics.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/Diagnostics.jsx)
- Radar spider chart for component fault signature visual diagnosis, telemetry gauge meters, and fault injector presets.

#### [MODIFY] [Settings.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/Settings.jsx)
- System diagnostic status panel, default units settings, cache management, and API URL config.

---

### Verification, Tests & Systems Engineering Traceability

#### [MODIFY] [test_api.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/tests/test_api.py)
#### [MODIFY] [test_core.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/tests/test_core.py)
#### [MODIFY] [functional_breakdown_diagram.md](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/functional_breakdown_diagram.md)
#### [MODIFY] [walkthrough.md](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/walkthrough.md)
- Add backend unit/integration tests for afterburner, ramjet, MoC characteristic net, presets, and error edge cases.
- Execute full backend `pytest tests/ -v` and frontend `npm run lint; npm run build`.
- Maintain zero line-crossing Systems Engineering FBD diagram in `functional_breakdown_diagram.md`.

## Recommended Skills

- **`orchestrate`**: Task decomposition and tracking.
- **`refactor`**: Internal code structure, cleanliness, and readability.
- **`system_integrator`**: REST API endpoints, Pydantic schemas, React hooks, unit conversion layer.
- **`ui_review`**: Anti-AI-Slop visual aesthetics, glassmorphic layout, font hierarchy, active state indicators.
- **`error_handling`**: Toast alerts, boundary fallbacks, numerical solver recovery.
- **`verify`**: Automated test suite and build verification.

## Verification Plan

### Automated Tests
- Backend pytest suite: `pytest tests/ -v`
- Frontend linter: `cd frontend && npm run lint`
- Frontend production bundle build: `cd frontend && npm run build`

### Manual Verification
- Test interactive SVG station blueprint diagram hover & station modal.
- Test SI <-> Imperial unit toggle across all page metrics and Plotly charts.
- Test loading presets (CFM56-7B, Merlin 1D, F-16, etc.) on each analysis page.
- Test STL 3D export for MoC rocket nozzle geometry.
- Test keyboard shortcuts (`?` key overlay).
