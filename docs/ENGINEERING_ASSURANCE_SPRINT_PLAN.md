# Engineering Assurance Sprint Plan

Date: 2026-09-05
Status: EA-00 through EA-07 selected gates complete. EA-08 review complete on 2026-09-09; release gate held.
Current EA-07 gates: `engineering/EA07_PLAN.md`.
Current release review: `engineering/EA08_RELEASE_REVIEW.md`. Interface closeout: `engineering/EA07_CLOSEOUT.md`. Physics scope: `engineering/EA06_CLOSEOUT.md`. Dated slice records below are historical.
Evidence: `engineering/VALIDATION_REPORT.md`, `engineering/EA04_REPORT.md`, and `engineering/EA05_REPORT.md`.

## Purpose and authority

Use the supplied PropulsionLab modernization concept as a program backlog. Deliver it through small sprints with explicit evidence gates.

Preserve React, FastAPI, the Python core, SI contracts, and fresh Cantera solutions per call.

This plan governs the authorized sequential EA-00 through EA-08 work. Active planning records link to this scope.
When implementation starts, synchronize that roadmap, `implementation_plan.md`, `task.md`, and `HANDOFF.md` with the selected sprint.
Keep previous verification records as dated evidence. Do not treat them as current proof of physical accuracy.

Priority definitions follow the supplied concept:

| Priority | Meaning |
| --- | --- |
| P0 | Incorrect or misleading engineering results |
| P1 | Model integrity, applicability, or evidence gaps |
| P2 | Usability and maintainability |
| P3 | Cosmetic changes |

These definitions differ from the current roadmap. Reclassify its open items explicitly when this proposal becomes active.

## Planning evidence and limits

The initial working tree was clean. This review inspected planning records, selected solver code, and the existing API error handlers.
It did not execute solvers, tests, benchmarks, or a complete engineering audit.

| Observation | Source | Planning consequence |
| --- | --- | --- |
| Multispool uses eight iterations, temperature-change checks, and an unconditional convergence message | `core/gas_turbine/cycle.py:618-648` | Prioritize termination and physical residual reporting |
| Turbofan and multispool clamp HPC pressure ratio to at least one | `core/gas_turbine/cycle.py:368-369,589` | Test inconsistent architecture through core and API |
| Several cycle paths clamp fuel to zero | `core/gas_turbine/cycle.py:220,388,604,747` | Reproduce combustor infeasibility before correction |
| Nonpositive thrust produces zero TSFC in several cycle paths | `core/gas_turbine/cycle.py:265,456,493,668,761` | Define unavailable metrics and prevent misleading rankings |
| Breguet documentation treats inverse seconds and kg/N/s as alternatives | `core/gas_turbine/mission.py:117-143` | Trace UI-to-core units before changing the equation |
| Request IDs and sanitized HTTP errors already exist | `backend/errors.py` | Extend the current gateway rather than replace it |
| Roadmap records planar MoC and existing E2E tests | `docs/ROADMAP.md`, `frontend/e2e/` | Extend existing capabilities after code verification |
| FBD names a diagnostics path absent from the file inventory | `functional_breakdown_diagram.md`, `core/diagnostics.py` | Correct traceability during the first implementation slice |

These observations confirm code patterns. They do not establish the affected operating domain or quantify output error.
Rocket pressure behavior, atmosphere limits, map units, surge margin, and diagnostic validity remain audit candidates.

## Program sequence

Sprint identifiers use EA to avoid confusion with the completed six-sprint audit.
Sizes describe relative scope. They are not calendar commitments.

| Sprint | Objective and owned area | Dependencies | Exit evidence | Size |
| --- | --- | --- | --- | --- |
| EA-00 | Inventory solvers and risks across `core/`, API, UI, and tests | None | Eight audit inventories, ranked findings, reproducible baseline, selected EA-01 cases | M |
| EA-01 | Establish WP-00 and correct gas-turbine result integrity | EA-00 | Typed outcomes, measured spool residuals, failure propagation, regression and browser evidence | L |
| EA-02 | Correct rocket pressure semantics and altitude analysis in `core/rocket/analyzer.py` and `core/units.py` | EA-01 contract | Independent Pc/Pe/Pa cases, fixed geometry across altitude, regime and atmosphere boundary tests | L |
| EA-03 | Correct off-design map units and surge reporting in `core/gas_turbine/off_design.py` | EA-01 contract | Documented normalization, consistent chart units, defined surge margin, visible failed points | M |
| EA-04 | Correct mission equations and diagnostic input validity | EA-01 contract and applicable EA-03 interfaces | Dimensional checks, sourced takeoff model, Breguet conversion cases, rejected invalid telemetry | L |
| EA-05 | Expand equation, assumption, and validation registries across all models | Registries start in EA-00/01; all P0 correction sprints precede release | Independent references, uncertainty records, comparison reports, explicit validated domains | L |
| EA-06 | Upgrade gas composition, rocket models, off-design matching, mission coupling, and diagnostics | EA-05 evidence for each affected model | Separate model proposals and benchmarks for each accepted upgrade | Multiple sprints |
| EA-07 | Consolidate presets, scenarios, engineering pages, charts, and validation UI | Stable solver contracts and resolved P0 findings | Versioned scenarios, metadata exports, validity displays, frontend and E2E checks | Multiple sprints |
| EA-08 | Perform release assurance and engineering review | All accepted scope complete | Reproducible reports, CI evidence, documentation truth review, release decision | M |

EA-02, EA-03, and EA-04 can be scheduled independently after the common contract stabilizes.
Serialize changes to `backend/main.py`, `backend/models.py`, shared UI components, and shared test fixtures.
This proposal does not authorize delegated work.

## EA-00: Mandatory audit gate

Produce `docs/engineering/INITIAL_AUDIT.md` before broad solver changes.
Include solver, equation, assumption, clamp/fallback, convergence, validation, error-flow, and prioritized finding inventories.

For each finding, record its source location, triggering inputs, observed behavior, expected behavior, severity, detectability, and verification method.
Distinguish confirmed defects, suspected defects, documented approximations, and missing evidence.
Record every iterative solver's unknowns, method, initial guess, tolerances, iteration limit, residuals, and termination behavior.
Trace failures from the core through HTTP responses to charts, exports, and the user.

Run the existing backend, frontend, and browser checks as a baseline when their dependencies are available.
Record commands, revision, environment, results, and blockers. Do not install dependencies outside the workspace without specific authorization.

Classify historical claims such as validated physics separately from test execution results.
Check the supplied standards' exact editions and official sources before citing their requirements.
Use them as conceptual guidance. Do not claim certification or formal compliance.

## EA-01: First implementation sprint

Objective: A cycle calculation must expose its validity and termination state from the core through the UI.

| Task | Responsibility and proposed files | Dependency | Acceptance and verification |
| --- | --- | --- | --- |
| EA-01.1 | Define result and error contracts in proposed `core/solver_result.py`, `core/errors.py`, and `docs/engineering/SOLVER_ASSURANCE.md` | EA-00 | Define statuses, precedence, optional fields, residual units, schema version, and examples. Test serialization and unknown applicability |
| EA-01.2 | Extend `backend/errors.py`, `backend/models.py`, and `backend/main.py` | EA-01.1 | Preserve request IDs and sanitized internal errors. Test validation, domain, convergence, numerical, and dependency failures |
| EA-01.3 | Add architecture and combustor checks in `core/gas_turbine/cycle.py` and API models | EA-01.2 | Reject inconsistent pressure ratios and infeasible active combustors. Test core calls, API calls, afterburner states, and valid boundary cases |
| EA-01.4 | Correct multispool termination in `core/gas_turbine/cycle.py` | EA-01.3 | Report HP/LP power residuals, iterations, tolerances, and termination reason. Force iteration exhaustion and verify NO_CONVERGENCE |
| EA-01.5 | Correct nozzle, TSFC, finite-value, and physical-output behavior in cycle paths | EA-01.3 | Test Pt below/equal/above Pa and nonpositive thrust. Unavailable TSFC is null with a reason. No silent physical clipping |
| EA-01.6 | Preserve cycle sweep point outcomes in core/API consumers | EA-01.4 and EA-01.5 | Every requested point retains inputs and status. Invalid points cannot become optima or ordinary plot values |
| EA-01.7 | Update `frontend/src/pages/ParametricCycle.jsx`, API helpers, and relevant E2E tests | EA-01.2 through EA-01.6 | Show failed and unvalidated states. Handle null metrics, chart gaps, stale results, and export status without crashes |
| EA-01.8 | Seed engineering registries and synchronize the FBD and active planning records | All EA-01 tasks | Link changed equations and assumptions to code and tests. Report benchmark changes and unresolved limitations |

Suggested delivery batches: contract plus API, feasibility checks, multispool residuals, nozzle/TSFC/sweeps, then integrated evidence.
Each batch must remain reviewable. A partial batch does not complete EA-01.

### Contract decisions to settle before implementation

- Preserve existing numerical keys through an additive migration where feasible. Document changes to nullability and failure behavior.
- Keep computation status, physical validity, model applicability, and validation evidence as separate fields.
- Represent unknown validation coverage explicitly. An absent benchmark does not mean a case is inside a validated domain.
- Allow non-iterative solvers to omit iteration data. Do not invent convergence measurements.
- Use absolute and relative residual tolerances with declared units and normalization bases.
- Calculate spool residuals from the final physical state. Do not report algebraically forced zeros as independent evidence.
- Include fuel mass and shaft efficiency consistently in spool power accounting.
- Use 422 for invalid inputs. Select and document one policy for non-convergence before API consumers change.
- Preserve sanitized internal errors. Do not disguise programming failures as ordinary infeasibility.
- Treat unavailable numerical metrics as null. Preserve their reason and status through JSON, charts, and exports.
- Preserve approximation labels until reference comparisons support stronger claims.

The supplied L0-L4 scheme combines model complexity with validation and calibration evidence.
Record these dimensions separately, even if the UI later provides a summary label.
Calibration alone must not imply independent validation.

## Distribution of the proposed 22-item first sprint

| Concept section 102 items | Planned delivery |
| --- | --- |
| 1-2: common result and exceptions | EA-01.1-2 |
| 3-9: multispool, architecture, combustion, nozzle, TSFC, numerical failures, sweep outcomes | EA-01.3-7 for cycle paths; extend to each family in its correction sprint |
| 10-13: atmosphere and rocket pressure/geometry/regime behavior | EA-02 |
| 14-15: map units and surge margin | EA-03 |
| 16-18: takeoff, Breguet, diagnostic telemetry | EA-04 |
| 19-21: equations, assumptions, fidelity metadata | Seed EA-00/01, extend with every solver change, consolidate EA-05 |
| 22: physics regression tests | Required in every correction batch |

All these items remain program commitments subject to the initial audit.
Splitting the work does not lower a confirmed defect's priority.
Open P0 findings block a platform-wide credibility claim. Disable or clearly restrict affected paths if a limited release proceeds.

## Later scope and concept coverage

| Concept sections | Scope and gate |
| --- | --- |
| 0-9, 40-43, 55-60, 90-100 | EA-00/01 assurance policy, status contracts, inventories, credibility records, and review gates |
| 10-17 | EA-01 immediate cycle corrections; EA-06 combustion composition and deeper conservation upgrades |
| 18-27 | EA-02 rocket/atmosphere correctness; EA-06 chemistry capability, c-star, Bartz, structure, and MoC fidelity |
| 28-39 | EA-03/04 correctness; EA-06 map matching, mission coupling, and diagnostic uncertainty |
| 44-45 | EA-07 preset ownership, input pedigree, and versioned scenarios |
| 46-54 | EA-05 reference and robustness infrastructure; focused checks start with each correction |
| 61-74 | CI and failure-state checks accompany corrections; broad UI architecture and validation views belong to EA-07 |
| 75-89 | P0 backlog and subsystem phases map to EA-00 through EA-08; each sprint uses the relevant completion gates |
| 101-105 | Dependency order, first-sprint distribution, change policy, batch reporting, and conservative claims apply throughout |

Do not combine all EA-06 model upgrades into one implementation sprint.
Select each upgrade from measured error, intended use, reference availability, and remaining P0 risk.
Retain full axisymmetric MoC, calibrated maps, cooling extensions, and visual polish as explicit later scope.

## Verification and completion gates

For each physics change, preserve a reproducer and add a test against an independent equation or reference where available.
Record expected values, tolerances, units, source versions, and the reason for each tolerance.
Separate equation verification, numerical convergence, model validation, trend checks, and UI checks in reports.
Trend agreement and code coverage do not establish physical accuracy.

Run focused checks first. Then run the relevant repository checks:

```text
.venv\Scripts\python.exe -m pytest tests/ -v
node --test frontend/src/apiCore.test.js
cd frontend
npm run lint
npm run build
npm run test:e2e
```

Confirm runtime availability and scripts during EA-00. Record unavailable checks as blockers, not passes.
Inspect rendered failure states for affected pages. Test API outcomes, null metrics, sweep gaps, and exported metadata.

Update `functional_breakdown_diagram.md` with every implementation change as required by project instructions.
Do not draw proposed solvers as implemented capabilities.

Each implementation batch reports changes, files, rationale, equations, assumptions, tests, reference evidence, limitations, and remaining risks.
Solver batches also report old behavior, new behavior, convergence criteria, failure behavior, and benchmark impact.

EA-01 completes only when all eight tasks meet their acceptance criteria and the cycle audit repeats successfully.
Repeat the full solver audit after EA-04, before broad fidelity or UI upgrades.

## Engineering records

Create these records incrementally under `docs/engineering/`:

- `INITIAL_AUDIT.md`: findings and the eight inventories.
- `MODEL_CREDIBILITY.md`: intended use, evidence, applicability, and limits.
- `SOLVER_ASSURANCE.md`: result contract and solver termination policy.
- `ERROR_TAXONOMY.md`: domain errors and API/UI behavior.
- `FIDELITY_LEVELS.md`: model descriptions and separate evidence levels.
- `VALIDATION_PLAN.md`: cases, sources, uncertainty, and justified tolerances.
- `VALIDATION_REPORT.md`: reproducible comparisons and unresolved differences.
- `ASSUMPTIONS.md`: assumptions, owners, limits, and affected calculations.
- `EQUATION_TRACEABILITY.md`: equations, sources, units, code, and tests.

Use one authoritative record per fact. Generate document views from registries where useful.
Do not create empty documents merely to mark deliverables complete.

## Next action

EA-00 through EA-05 are complete. Proceed with EA-06 through EA-08 in order.
EA-06 starts with EA05-F01, the measured altitude-convention mismatch.
Complete each evidence gate before the next work package.
Do not start with full axisymmetric MoC or broad page refactoring while confirmed P0 findings remain unresolved.

## EA-06 altitude slice: 2026-09-08

The geometric-to-geopotential correction is complete. EA-06 remains in progress.
Evidence: `engineering/EA06_REPORT.md` and `engineering/EA06_COMPARISONS.json`.
All 218 backend tests pass. Frozen comparisons record nine passes and one incompatible case.
Next: exact rocket mixture mass-ratio semantics and matched chemistry reference conditions.

## EA-06 rocket reactant slice: 2026-09-08

Exact O/F and fuel impurity mass semantics are complete. Matched chemistry reference conditions are documented.
All 226 backend tests pass. See `engineering/EA06_ROCKET_REACTANTS.md`.
Next: gas-turbine composition and station energy conservation. EA-06 remains in progress.

## EA-06 rocket reactant slice: 2026-09-08

Exact O/F and fuel impurity mass semantics are complete. Matched chemistry reference conditions are documented.
All 226 backend tests pass. See `engineering/EA06_ROCKET_REACTANTS.md`.
Next: gas-turbine composition and station energy conservation. EA-06 remains in progress.

## EA-06 cycle proposal slice: 2026-09-08

Six diagnostic cases quantify the current ramjet composition and energy discrepancies.
Four audit tests pass. Production physics remains unchanged.
Next: GT-A in `engineering/EA06_CYCLE_MODEL_PROPOSAL.md`, then GT-B through GT-F.
EA-06 remains in progress.

## GT-A completion: 2026-09-08

Isolated thermodynamic state helpers are complete. All 243 backend tests pass.
See `engineering/EA06_GT_A.md`. Next: GT-B freestream and frozen nozzle energy.
EA-06 remains in progress.

## GT-B completion: 2026-09-08

Freestream and frozen convergent nozzle helpers are complete. All 255 backend tests pass.
See `engineering/EA06_GT_B.md`. Next: GT-C methane burner and ramjet path.
EA-06 remains in progress.

## GT-C completion: 2026-09-08

The methane burner and ramjet research path are complete. All 262 backend tests pass.
See `engineering/EA06_GT_C.md`. Next: GT-D compressor and turbine paths.
Efficiency definition and GT-F API adoption remain open. EA-06 remains in progress.

## GT-D completion: 2026-09-08

Compressor, turbine, and shaft-matching helpers are complete. All 272 backend tests pass.
See `engineering/EA06_GT_D.md`. Next: GT-E mixers and afterburners.
EA-06 remains in progress.

## GT-E completion: 2026-09-08

Frozen mixing and methane afterburner helpers are complete. All 279 backend tests pass.
See `engineering/EA06_GT_E.md`. Next: GT-F API and frontend model adoption.
EA-06 remains in progress.

## GT-F ramjet interface slice: 2026-09-08

Explicit methane ramjet API/UI and compatible exports are complete. All 285 backend tests pass.
See `engineering/EA06_GT_F.md`. GT-F remains open for other research architectures.
Next: assemble and expose the methane turbojet research path.

## GT-F turbojet slice: 2026-09-08

The dry methane turbojet research path and API/UI selection are complete. All 289 backend tests pass.
Next: turbojet afterburner integration. GT-F and EA-06 remain in progress.

## GT-F turbojet afterburner slice: 2026-09-08

Turbojet reheat and wet/dry scenario compatibility are complete. All 292 backend tests pass.
Next: separate-stream methane turbofan with HP/LP shaft balances. GT-F and EA-06 remain in progress.

## GT and EA-06 closeout: 2026-09-09

GT-A through GT-F are complete for all selected methane research architectures.
EA-06 selected upgrades and separate model proposals meet the stated exit gate.
See `engineering/EA06_CLOSEOUT.md` for the disposition of each model and final verification.
Calibrated maps, cooling extensions, structural qualification, and full axisymmetric MoC remain later work.
No independently validated model domain is claimed. EA-07 and EA-08 remain pending.

## EA-07 closeout: 2026-09-09

EA-07.1 through EA-07.5 are complete. All 51 Chromium tests and 13 unit tests pass. Lint and build pass.
See `engineering/EA07_CLOSEOUT.md` for delivered interfaces and verification limits.
EA-08 release assurance remains pending. No release or physical-validation claim is made.

## EA-08 review: 2026-09-09

Local review is complete with a HOLD release decision. The release gate is not passed.
All 312 backend tests, 13 frontend unit tests, and 51 Chromium tests pass.
Production npm audit fails on EA08-R01. Immutable remote CI evidence remains unavailable.
See `engineering/EA08_RELEASE_REVIEW.md` for the required actions and evidence.

## EA08-R01 remediation closeout: 2026-09-09

The dependency blocker is fixed locally. The full npm audit reports zero vulnerabilities.
Lint, build, 13 unit tests, and 52 Chromium tests pass. Remote CI remains the final software release gate.
See `engineering/EA08_REMEDIATION.md`. Physical qualification remains outside the completed evidence.
