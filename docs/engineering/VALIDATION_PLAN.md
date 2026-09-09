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
