# EA-05 Reference Evidence and Model Coverage

Date: 2026-09-08. Status: complete for EA-05 evidence deliverables. Independent operational validation remains unestablished.

## Outcome

All 11 model groups now have equation links, assumption links, source records, uncertainty state, and explicit missing evidence.
The reference run records seven passes, two differences, and one incompatible case. No comparison was removed to obtain a clean result.
No complete model has an independently validated operating domain. The result metadata continues to state unknown validation coverage.

## Deliverables

| Deliverable | Record |
| --- | --- |
| Model coverage and uncertainty state | MODEL_REGISTRY.json |
| Complete equation and assumption records | EQUATION_TRACEABILITY.md and ASSUMPTIONS.md |
| Frozen primary-source cases and tolerances | REFERENCE_CASES.json |
| Reproducible numeric results and fingerprints | EA05_COMPARISONS.json |
| Source editions and locators | REFERENCES.md |
| Numerical sensitivity and uncertainty limits | UNCERTAINTY.md |
| Execution and interpretation rules | VALIDATION_PLAN.md |

## Independent reference comparisons

| Case | Status | Measurement | Expected | Actual | Relative difference |
| --- | --- | --- | ---: | ---: | ---: |
| ATM-H-0 | PASS | pressure_pa | 101325 | 101325 | 0.000000% |
| ATM-H-0 | PASS | temperature_k | 288.15 | 288.15 | 0.000000% |
| ATM-H-0 | PASS | density_kg_m3 | 1.225 | 1.22501227 | 0.001001% |
| ATM-H-10000 | PASS | pressure_pa | 26436 | 26435.8875 | -0.000426% |
| ATM-H-10000 | PASS | temperature_k | 223.15 | 223.15 | -0.000000% |
| ATM-H-10000 | PASS | density_kg_m3 | 0.41271 | 0.412704735 | -0.001276% |
| ATM-H-30000 | PASS | pressure_pa | 1171.8 | 1171.81057 | 0.000902% |
| ATM-H-30000 | PASS | temperature_k | 226.65 | 226.65 | -0.000000% |
| ATM-H-30000 | PASS | density_kg_m3 | 0.018012 | 0.0180112617 | -0.004099% |
| ATM-Z-10000 | DIFFERENCE | pressure_pa | 26499 | 26435.8875 | -0.238170% |
| ATM-Z-10000 | DIFFERENCE | temperature_k | 223.252 | 223.15 | -0.045688% |
| ATM-Z-10000 | DIFFERENCE | density_kg_m3 | 0.41351 | 0.412704735 | -0.194739% |
| ATM-Z-30000 | DIFFERENCE | pressure_pa | 1197 | 1171.81057 | -2.104380% |
| ATM-Z-30000 | DIFFERENCE | temperature_k | 226.509 | 226.65 | 0.062249% |
| ATM-Z-30000 | DIFFERENCE | density_kg_m3 | 0.01841 | 0.0180112617 | -2.165879% |
| PM-1.5 | PASS | angle_deg | 11.905 | 11.9052088 | 0.001754% |
| MOC-AREA-1.5 | PASS | area_ratio | 1.176 | 1.17577799 | -0.018878% |
| PM-2.0 | PASS | angle_deg | 26.38 | 26.3797608 | -0.000907% |
| MOC-AREA-2.0 | PASS | area_ratio | 1.688 | 1.68590435 | -0.124150% |
| CEA8-COMPATIBILITY | INCOMPATIBLE | Reactant phase and enthalpy mismatch | - | - | - |

Atmosphere rows come from [U.S. Standard Atmosphere 1976](https://www.ngdc.noaa.gov/stp/space-weather/online-publications/miscellaneous/us-standard-atmosphere-1976/us-standard-atmosphere_st76-1562_noaa.pdf), Table I.
H identifies geopotential altitude. Z identifies geometric altitude. The pressure conversion is 100 Pa per millibar.
Perfect-gas angle and area rows come from [NACA Report 1135](https://www.nasa.gov/wp-content/uploads/2023/03/equations-tables-charts-compressibleflow-report-1135.pdf), Table II, printed page 634.
The rows were visually checked against the source PDFs. Reference values are frozen independently of the solver output.

### Atmosphere finding EA05-F01

The function applies layer equations directly to the input height. The previous description identifies that input as geometric altitude.
At geometric 10 km, pressure differs from the published row by about -0.238%. At 30 km, it differs by about -2.104%.
The corresponding geopotential rows pass the declared numerical screen. This isolates the convention mismatch.
The tolerance remains 0.02% plus the stated absolute term. It was not enlarged to accept the discrepancy.

Priority: P0 result-contract mismatch. Resolve the altitude convention in EA-06 before any broader atmosphere or coupled-mission accuracy claim.
This sprint records the difference and corrects misleading source descriptions. It does not change atmospheric calculations.

### CEA compatibility finding EA05-F02

[NASA CEA Example 8](https://nasa.github.io/cea/examples/rocket/example8.html) uses liquid H2/O2, distinct cryogenic temperatures, and chamber pressure 53.3172 bar.
The application uses 300 K gas reactants. The inlet enthalpy therefore differs before either equilibrium solver runs.
The case is INCOMPATIBLE, with no computed accuracy error or pass threshold.
A matched comparison requires phase, enthalpy, species database, exact mixture ratio, and nozzle-loss conventions.
Priority: P1 evidence gap for EA-06 rocket work. Do not compare these unlike cases as validation.

### MoC finding EA05-F03

The reference angle helper passes both published values at gamma 1.4 and Mach 1.5 and 2.
The mapped exit areas pass a provisional 0.5% numerical screen at 48 subdivisions.
The Mach-2 exit area differs from the rounded table by about -0.124%. It is not exact.
The 12, 24, 48, and 96 subdivision study records decreasing successive changes for this case.
It does not prove axisymmetric accuracy or establish a global mesh-error bound.
The source documentation now states these limits and removes unsupported exactness and validation claims.

## Uncertainty and missing validation

MODEL_REGISTRY.json records measurement, numerical, and model-form uncertainty as unknown for every full model.
Reference rounding and helper tolerances do not replace output uncertainty.
The Breguet TSFC perturbation is a deterministic sensitivity example, not a confidence interval.

Independent engine, thermal, structural, map, aircraft, and calibrated diagnostic datasets remain unavailable in the current records.
Each model lists the evidence needed to proceed. None receives an invented accuracy percentage or unrestricted validated domain.
EA-05 completes the evidence records and runnable comparisons. It does not certify the engineering models.

## Verification

The focused reference suite passes 13 tests. It checks matched rows, registry links, and preservation of differences, invalid metrics, and incompatible cases.
The reference command returns exit code one because the two geometric-altitude comparisons differ. It writes the complete result before exit.
There are no execution errors in the reference report. Runtime and source hashes are recorded in EA05_COMPARISONS.json.
Full backend regression: 208 passed in 109.63 seconds, with the two previously recorded warnings.
A final empty-reference guard was added during that run. The focused rerun passed all 13 reference tests.
All 209 collected backend cases are covered across the full run and focused rerun.
No frontend behavior changed in EA-05. Frontend and browser checks were not repeated for this documentation and offline-reference scope.

Commands:

```text
.venv\Scripts\python.exe tools/validate_references.py
.venv\Scripts\python.exe -m pytest tests/test_reference_validation.py -q
.venv\Scripts\python.exe -m pytest tests/ -q
```

## Next work

EA-06 is authorized next. Address EA05-F01 before coupled-mission model upgrades.
Use the per-model required_evidence entries to bound composition, rocket, matching, and diagnostic upgrades.
Keep unavailable data and incompatible references explicit. Do not promote evidence levels from regression counts.
No commit, push, dependency installation, or production configuration change was performed.
