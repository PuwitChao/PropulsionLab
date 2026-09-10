# Verification and Validation Plan

Updated: 2026-09-08. This plan distinguishes software verification from independent operational model validation.

## Evidence gates

1. Verify each reference source, version, unit convention, and operating condition.
2. Freeze reference values independently of the application output.
3. Define the comparison tolerance and its purpose before execution.
4. Reject incompatible reference definitions before an accuracy decision.
5. Retain every comparison result, including discrepancies and execution errors.
6. Record model and fixture hashes so results can be checked against later changes.
7. Establish a validated domain only after independent intended-use review.

MODEL_REGISTRY.json covers all 11 model groups, their equation and assumption IDs, evidence gaps, and uncertainty state.
REFERENCE_CASES.json contains ten cases: seven matched comparisons, two geometric-altitude comparisons, and one incompatible CEA case.
EA05_COMPARISONS.json is the machine-readable result. EA05_REPORT.md interprets it.

## Reproducible commands

Run from the repository root:

```text
.venv\Scripts\python.exe tools/validate_references.py
.venv\Scripts\python.exe -m pytest tests/test_reference_validation.py -q
.venv\Scripts\python.exe -m pytest tests/ -q
```

The comparison command returns exit code one if any case reports DIFFERENCE or ERROR. It still writes the complete report.
EA-06 corrects the two geometric-altitude differences. Current comparisons record nine passes and one incompatible CEA case.
Pytest verifies matched table cases and the report behavior. Its pass result does not erase the recorded model differences.
The runner needs existing project dependencies only. It does not download reference data during execution.

The 0.5% contour-area tolerance is a provisional numerical screen, not a validated nozzle-design accuracy requirement.
The printed atmosphere and perfect-gas rows establish reference agreement only at their named inputs.
Do not extrapolate those isolated cases to an operating envelope.

## Unresolved reference coverage

The gas-turbine models lack matched station and performance data with fuel/composition definitions.
Rocket CEA comparison requires matching phase, inlet enthalpy, species, exact O/F mass ratio, and nozzle-loss conventions.
Generic off-design maps require dimensional engine maps and an independent matching reference.
Thermal and structural models require sourced coefficients, material state, geometry, loads, and measurement data.
Mission and diagnostic validation requires aircraft/engine data and calibrated simultaneous telemetry respectively.

These gaps prevent an independent operational validation claim. They do not prevent completion of the EA-05 evidence records.
EA-06 selections and benchmark dispositions are recorded in EA06_CLOSEOUT.md.
Repeat reference comparisons after any change to the model, constants, units, or source data.

## Matched chamber comparison and qualification sequence (2026-09-10)

Three frozen NASA CEA gas-reactant cases now supplement the original ten cases.
CEA_GAS_REFERENCE.json records the product species, inputs, version, binary hashes, and database hashes.
The generator uses no application output. The comparison uses a preselected 1% screen for chamber temperature and molecular weight.
This screen measures code agreement. It does not provide experimental uncertainty or a validated domain.

1. Reproduce the frozen chamber references with the optional backend/requirements-reference.txt environment.
2. Run tools/generate_cea_reference.py only when an intentional reference refresh is required.
3. Review reference changes separately from solver changes.
4. Run tools/validate_references.py against the frozen values.
5. Acquire independent measurements before any physical qualification decision.

For chamber chemistry, acquire measured temperature and composition with pressure, exact stream mass ratios, phase, inlet enthalpy, and uncertainty.
For nozzle performance, also match geometry, frozen or shifting chemistry, ambient pressure, and loss definitions.
Keep CEA Example 8 as an incompatible cryogenic negative control. Do not replace its liquid inputs with gas inputs under the same identifier.

| Validation work | Evidence required before domain approval |
| --- | --- |
| Gas turbine, multispool, ramjet | Independent station states, fuel definition, shaft loads, thrust, mass flow, and measurement uncertainty |
| Rocket chamber and nozzle | Matched measurements, thermodynamic data ranges, geometry, reaction convention, and uncertainty |
| Rocket thermal and structure | Local heat flux, wall state, geometry, material allowables, loads, and independent assessment |
| Off-design | Dimensional compressor and turbine maps, station definitions, geometry, and measured matching points |
| Atmosphere and MoC | Extended reference coverage, contour coordinates, refinement studies, and bounded error for the declared use |
| Mission and diagnostics | Aircraft polar, engine deck, flight records, calibrated telemetry, covariance, and labeled fault data |

An intended-use owner must specify outputs, allowed error, and operating limits before the independent validation review.
No such measurement package or intended-use acceptance limits exist in the current workspace.
The current request therefore closes software warnings and adds code-comparison evidence. Operational qualification remains open.
