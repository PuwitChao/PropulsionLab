## 2026-09-14 - Rocket temperature domain

- Use gri30_highT.yaml for rocket thermodynamic calculations.
- Preserve the dataset through frozen-throat state reconstruction.
- Enforce the common 300-5000 K interval and report the actual mechanism.
- Retain the gas-turbine default dataset and independent CEA reference values.

## 2026-09-10 - CI test dependency correction

- Pin test AnyIO to the verified 4.14.2 release for Starlette 1.6.0 compatibility.
- Retain warnings-as-errors after remote CI identified dependency drift.

## 2026-09-10 - Engineering assurance limitations

- Replace the deprecated TestClient fallback with a pinned httpx2 test dependency.
- Reject rocket states below the mechanism temperature floor and preserve failed sweep points.
- Add three independent NASA CEA gas-reactant chamber references and provenance checks.
- Define the remaining measurement and qualification requirements in VALIDATION_PLAN.md.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Dependency remediation and sprint closeout (2026-09-09)
- Replace the full Plotly runtime and peer source tree with the official GL3D 3.7.0 npm alias.
- Exclude geographic map modules while preserving engineering scatter and 3D trace support.
- Apply compatible development dependency patches. The full npm audit reports zero vulnerabilities.
- Add a browser regression for the chart runtime boundary and retain built artifact evidence.

### Release assurance (EA-08, 2026-09-09)
- Correct README model claims, pressure semantics, setup commands, and verification guidance.
- Add reference comparisons, portable browser regression, and retained evidence to CI.
- Record the critical MapLibre dependency advisory and hold public release pending remediation and immutable CI evidence.
- Retain the distinction between numerical verification and independent physical validation.

### Engineering interfaces (EA-07.2 through EA-07.5, 2026-09-09)
- Extend versioned scenarios to cycle, rocket, generic map, and mission pages with explicit legacy migration.
- Apply supported preset fields, convert rocket pressure units, and report source limits and omitted inputs.
- Consolidate chart gap handling and expose model evidence through shared assurance displays.
- Add result export metadata and preserve the originating inputs in map CSV exports.
- Guard asynchronous imports, calculations, and reference sweeps against stale results.

### Engineering interfaces (EA-07.1, 2026-09-09)
- Add versioned SI scenario envelopes to all methane research architectures.
- Preserve unversioned methane imports and documented older dry-engine defaults.
- Reject unsupported versions, units, and architectures with visible errors.
- Preserve current inputs and clear old result evidence when an import fails.

### Engineering assurance (GT and EA-06 closeout, 2026-09-09)
- Add separate and mixed methane turbofans and a three-shaft turbofan with explicit shaft and stream evidence.
- Expose research architecture selection, persistent inputs, and scenario exports through the API and UI.
- Use one rocket throat mass flux for c-star, area ratio, and sizing. Solve the frozen sonic condition.
- Add supplied engine-deck cruise calculations and sensor covariance propagation through strict API contracts.
- Add dimensional component-map contracts and separate proposals for data-dependent model upgrades.
- Synchronize model records, functional traceability, sprint status, and final evidence without claiming physical validation.
- Verify 312 backend tests, 5 frontend unit tests, 14 browser tests, lint, build, and 9 compatible reference cases.

### Engineering assurance (GT-F turbojet afterburner, 2026-09-08)
- Integrate methane reheat downstream of the matched turbine with explicit added-fuel accounting.
- Include total fuel in TSFC and nozzle mass flow, while preserving upstream shaft mass.
- Add optional UI/API controls and compatible defaults for older dry research scenarios.
- Add three core/API checks and a wet/dry scenario browser test.

### Engineering assurance (GT-F turbojet, 2026-09-08)
- Assemble the methane turbojet from conserved inlet, compressor, burner, matched shaft, and nozzle components.
- Add explicit API/UI selection with separate scenarios and isentropic efficiency controls.
- Add four core/API tests and a live browser export/import test.
- Preserve legacy cycles and unavailable research efficiency metrics.

### Engineering assurance (GT-F ramjet interface, 2026-09-08)
- Expose explicit methane research ramjet selection through a strict API request and separate UI panel.
- Add compatible research scenario import/export and component evidence displays.
- Reject legacy model fields and files. Preserve existing cycle behavior.
- Add six API tests and two live browser tests. Broader research architecture adoption remains open.

### Engineering assurance (GT-E, 2026-09-08)
- Add frozen mixing with species mass and enthalpy-flow conservation.
- Add methane afterburner reheat bounded by excess oxygen in the inlet stream.
- Share the bounded combustion solve while preserving distinct air and gas mass bases.
- Add seven mixer/reheat tests. Preserve legacy API behavior.

### Engineering assurance (GT-D, 2026-09-08)
- Add frozen compressor and turbine stages with explicit isentropic efficiencies.
- Add bounded pressure matching for shaft demand with gas/core-air mass and mechanical losses.
- Add 10 analytic and shaft-conservation tests. Preserve legacy API behavior.

### Engineering assurance (GT-C, 2026-09-08)
- Add a lean methane equilibrium burner with a bounded fuel root and energy/element residuals.
- Connect the research inlet, burner, and frozen convergent nozzle with explicit mass and momentum accounting.
- Preserve null efficiency metrics pending pressure-energy review. Add seven focused tests.

### Engineering assurance (GT-B, 2026-09-08)
- Add enthalpy-based freestream states with explicit total-pressure recovery.
- Add frozen convergent nozzle flow with a bounded sonic root and measured residuals.
- Add 12 analytic, conservation, choking, and failure tests.
- Preserve the legacy API solver until subsequent integration gates.

### Engineering assurance (GT-A, 2026-09-08)
- Add isolated GRI30 state snapshots with exact methane/air mass composition.
- Add frozen TP, HP, and SP state changes without shared mutable solutions.
- Add 13 tests for mass, elements, inversion, input errors, and concurrent isolation.
- Keep the legacy cycle solver unchanged pending subsequent model gates.

### Engineering assurance (EA-06 cycle proposal, 2026-09-08)
- Add a reproducible six-case audit of ramjet composition and energy discrepancies.
- Define six implementation gates for a consistent cycle thermochemistry model.
- Add four diagnostic tests. Preserve production behavior and typed efficiency failures.

### Engineering assurance (EA-06 rocket reactants, 2026-09-08)
- Construct rocket reactants with the requested stream mass ratio and fuel impurity mass fraction.
- Expose initial reactant conditions and derive equivalence ratio from the mechanism.
- Reject nonzero impurity fractions without a species. Add eight focused mass and energy checks.

### Engineering assurance (EA-06 altitude slice, 2026-09-08)
- Convert geometric altitude to geopotential height before atmosphere evaluation.
- Preserve the 0-47000 m input limit and provide an explicit geopotential reference mode.
- Retain the frozen EA-05 baseline and record the corrected comparisons separately.

### Engineering assurance (EA-05, 2026-09-08)
- Added model coverage, independent reference cases, source fingerprints, and uncertainty records.
- Added an offline runner that retains differences and incompatible reference definitions.
- Quantified the geometric-altitude mismatch at 10 km and 30 km. The numerical correction remains EA-06 work.
- Corrected source descriptions that overstated gas-property and nozzle-contour fidelity.
- Added 13 focused reference and evidence-integrity tests. No validated operating domain is claimed.

### Engineering assurance (EA-04, 2026-09-07)
- Corrected takeoff dimensions with an explicitly limited ideal ground-roll model.
- Added explicit Breguet SFC units and repaired its UI request and result display.
- Preserved failed mission points and excluded them from sampled optima.
- Rejected contradictory diagnostic telemetry and replaced mechanical fault claims with threshold observations.
- Added mission and diagnostic assurance exports, equation tests, browser cases, and EA04_REPORT.md.

### Engineering assurance (EA-00 through EA-03, 2026-09-07)
- Added typed solver outcomes, convergence residuals, explicit validity checks, and retained failed sweep points.
- Corrected turbine efficiency conversion and pressure-work accounting.
- Separated rocket exit and ambient pressure. Altitude analysis now preserves nozzle geometry and rejects altitude above 47 km.
- Corrected map normalization, surge margin, and SI TSFC exports.
- Added visible assurance states, evidence exports, focused regressions, and engineering records.
- Model accuracy remains unvalidated. See `docs/engineering/VALIDATION_REPORT.md` for evidence and limits.

### Fixed
- Resolved the backend CI dependency audit failure by upgrading FastAPI to `0.141.1` and explicitly pinning patched Starlette `1.6.0`.
- Hardened unexpected-exception logging to use the ASGI routed path instead of `request.url.path`.

---
## [2.3.0] - 2026-07-06

### Added
- Refactored `DiagnosticsAnalyzer` in a dedicated `core/diagnostics.py` file to cleanly decouple diagnostic math.
- Added `backend/models.py` to centralize and share all FastAPI Pydantic request and response schemas.
- Consolidated Brayton cycle thermodynamic calculation helpers in a dedicated `core/gas_turbine/thermo.py` file.
- Added full responsive UI layout support for mobile, tablet, and desktop dimensions.
- Added state-driven mobile navigation hamburger menu and toggle panel overlay.

### Changed
- Refactored `RocketAnalyzer` to create `ct.Solution` instances locally and dynamically (`_new_gas()`), ensuring multi-threaded request safety.
- Streamlined `backend/main.py` by removing redundant model and diagnostic definitions, dropping file lines from 975 to 550.
- Unified frontend HTTP requests to route consistently through the `fetchData` client wrapper in `App.jsx` and `Settings.jsx`.
- Replaced buggy and unstable WebGL-based Plotly 3D nozzle meshes in `RocketAnalysis.jsx` with responsive 2D cross-section contour plots.
- Unified responsive grid systems (`grid-cols-*`) and spacing variables across all panels to prevent text and button overlapping.

---

## [2.2.0-dev] - 2026-03-27

### Added

- `POST /analyze/rocket/export/csv` â€” Nozzle contour (X, R) export for CFD and CAD meshing.
- `POST /analyze/cycle/sensitivity` â€” Multi-parameter sensitivity sweep (T4, Altitude, OPR) for gas turbine analysis.
- `POST /analyze/cycle/multispool` â€” Stub endpoint for multi-spool turbofan work matching (Sprint 5 deliverable).
- `MultispoolRequest` Pydantic model with full parameter set for future implementation.
- `CycleAnalyzer.solve_multispool()` stub with detailed work-matching algorithm docstring.
- `test_moc_contour_csv_format` and `test_moc_contour_monotonic` regression tests.

### Changed

- Version bumped to `v2.2.0-dev`.

---

## [2.1.0] - 2026-03-24

### Added

- Created `tools/` directory for internal audit and debug scripts.
- Created `scripts/` directory for operational scripts (`run_platform.bat`, `kill_port_8000.py`).
- Added GET `/version` endpoint to the backend.
- Integrated `logging` module in the backend for structured diagnostic output.

### Changed

- Moved utility scripts from root and `core/` to `tools/` and `scripts/`.
- Standardized backend response keys for `tsfc` and `spec_thrust`.
- Improved thermodynamic solver documentation with standardized docstrings and type hints.
- Integrated automatic port clearing (port 8000) directly into the backend startup.

### Removed

- Cleaned up redundant log and error files from the root directory (`backend_crash.log`, `error_rocket.txt`, `full_error.txt`).

## [2.0.1] - 2026-03-22

### Added

- Unified aerospace nomenclature across the frontend and backend.
- Integrated `mach_exit` into `RocketAnalyzer` for MoC visualization.
- Implemented `kill_port_8000.py` for Windows maintenance.

### Fixed

- Resolved `NaN` errors in cycle charts by standardizing API keys.
- Fixed Windows socket reuse errors ([Errno 10048]).
