# EA-06 and GT closeout

Date: 2026-09-09. Status: GT-A through GT-F and the EA-06 selected-upgrade/proposal gate complete.

## Completion boundary

The master plan requires separate proposals and benchmarks for accepted upgrades.
It explicitly leaves calibrated maps, cooling extensions, and full axisymmetric MoC for later work.
This closeout completes that gate. It does not establish physical validation or replace every legacy solver.
EA-07 and EA-08 remain pending.

## Scope and evidence

| Area | Delivered result | Evidence |
| --- | --- | --- |
| GT-A | Immutable thermodynamic states and exact composition | EA06_GT_A.md; test_gas_state.py |
| GT-B | Conserved inlet energy and frozen sonic nozzle root | EA06_GT_B.md; test_frozen_flow.py |
| GT-C | Methane equilibrium burner and ramjet | EA06_GT_C.md; test_methane_cycle.py |
| GT-D | Compressor, turbine, and bounded shaft balances | EA06_GT_D.md; test_shaft_stages.py |
| GT-E | Conserved mixer and methane reheat | EA06_GT_E.md; test_mixing_reheat.py |
| GT-F | Ramjet, dry/wet turbojet, separate/mixed turbofan, and three-shaft turbofan API/UI | test_methane_api.py; test_methane_turbojet.py; test_research_turbofan.py; methane_research.spec.js |
| Atmosphere | Geometric-to-geopotential conversion | EA06_REPORT.md; EA06_COMPARISONS.json |
| Rocket | Exact reactant mass ratio and consistent throat/exit mass flux | EA06_ROCKET_REACTANTS.md; EA06_ROCKET_UPGRADES.md; test_rocket_throat.py |
| Off-design | Dimensional map contract and fixed-geometry matching proposal | EA06_MATCHING_PROPOSAL.md; test_map_contract.py |
| Mission | Supplied installed-deck interpolation and cruise fuel integration | EA06_MISSION_DIAGNOSTICS.md; test_engine_deck.py; test_ea06_interfaces.py |
| Diagnostics | Supplied sensor covariance propagation | EA06_MISSION_DIAGNOSTICS.md; test_diagnostic_uncertainty.py; test_ea06_interfaces.py |
| Thermal, structure, contour | Separate benchmark proposals and explicit selection limits | EA06_ROCKET_UPGRADES.md |

Paths in the evidence column refer to this directory, tests/, or frontend/e2e/ as applicable.

## Final GT integration

`core/gas_turbine/turbofan.py` assembles two-shaft separate and mixed turbofans, plus a three-shaft separate turbofan.
Fan work includes bypass air. Booster and compressor work use core air.
Each shaft reports its work residual in J/kg of core air.
Separate nozzles preserve their stream masses. Mixed flow uses conserved composition and enthalpy before optional reheat.
Specific thrust uses total inlet air. The response also exposes core-air fuel and thrust quantities.

`POST /analyze/cycle/methane-turbofan` selects the three architectures with a strict request model.
The cycle page exposes each architecture, independent saved inputs, scenario import/export, station states, and shaft evidence.
Research calculations retain OUTSIDE_VALIDATED_DOMAIN. Thermal and propulsive efficiencies remain unavailable pending pressure-energy review.
These methane models do not represent Jet-A. Legacy calculations remain separate.

## Verification

- Full backend suite: 312 passed in 162.11 seconds.
- Final reference-registry check after documentation changes: 15 passed.
- Frontend lint and production build: passed.
- Frontend unit tests: 5 passed.
- Chromium research, mission, and solver assurance tests: 14 passed.
- Final reference comparisons: 9 PASS, 1 INCOMPATIBLE, no DIFFERENCE or ERROR.
- Backend-directory import confirms the new turbofan route is registered.

The incompatible case uses cryogenic CEA reactants. The current model uses gas reactants with different inlet enthalpy.
The two backend warnings concern Starlette/httpx deprecation and a Cantera temperature below its mechanism range.
Browser failure-path tests intentionally produce API errors and verify that invalid results remain unavailable.

`EA06_FINAL_EVIDENCE.json` records three GT architecture checks, two rocket throat checks, reference comparisons, and source hashes.
Reproduce it with `.venv\Scripts\python.exe tools/ea06_evidence.py` from the repository root.
The reference runner's default output is CURRENT_COMPARISONS.json. Historical EA-05 and EA-06 reports remain unchanged.
Numerical conservation checks and synthetic interface benchmarks do not establish engine accuracy.

## Remaining model limits

- No complete model has an independently validated operating domain or a total uncertainty bound.
- Research efficiency definitions require a pressure-energy review. The legacy Mach 3 efficiency failure remains explicit.
- Calibrated off-design matching requires component maps, stable boundaries, geometry, and measured engine points.
- Shifting rocket expansion retains an approximate throat pressure. Only frozen mode solves the sonic root.
- Cryogenic chemistry, thermal calibration, structural qualification, and full axisymmetric MoC require the stated later evidence.
- Deck cruise excludes climb, reserves, wind, dry-mass limits, and a full mission model.
- Diagnostic covariance covers measurement propagation only. It does not calibrate a fault classifier or include model discrepancy.

The next planned package is EA-07. Do not treat the limits above as completed physical capabilities.
No commit or push was requested or performed for this closeout.
