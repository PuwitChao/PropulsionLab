# Uncertainty and Numerical Sensitivity

Updated: 2026-09-08. MODEL_REGISTRY.json records uncertainty separately for each model.

## Current uncertainty state

Measurement, numerical, and model-form output uncertainty remain unknown for every complete model.
Null means unavailable. It does not mean zero error or perfect certainty.
No confidence interval, probability of failure, or combined engineering margin is claimed.

| Component | Evidence needed before quantification | Present treatment |
| --- | --- | --- |
| Input measurement | Sensor calibration, covariance, timing, and operating conditions | Unknown |
| Numerical error | Convergence tolerances, mesh or iteration refinement, independent limiting solutions | Residual and resolution observations only |
| Model form | Matched independent datasets across the intended operating domain | Unknown |
| Reference precision | Printed digits, source version, transcription checks, and units | Per-field comparison tolerances |
| Parameter calibration | Separate fit and holdout datasets with parameter uncertainty | No calibrated dataset |

Printed table precision is not model accuracy. Residual tolerances are not physical uncertainty bounds.
The atmosphere comparison permits 0.02% relative pressure/density differences plus small absolute terms for rounding and the application gas constant.
Temperature permits 0.001 K. NACA expansion angles permit 0.0005 degrees.
The contour area screen permits 0.5% relative difference plus 0.0005 absolute table precision.
That screen is provisional numerical acceptance only. It was not widened after observing the geometric-altitude failures.

## Numerical observations

At gamma 1.4, exit Mach 2, and throat radius 0.1 m, the MoC study uses 12, 24, 48, and 96 subdivisions.
Between 48 and 96 subdivisions, length changes by about 0.0324% and exit area ratio changes by about 0.0568%.
This single sequence does not prove asymptotic convergence or bound the error in wall geometry or flow properties.
No Richardson extrapolation or grid convergence index is assigned without a justified order and asymptotic-range check.

The Breguet study perturbs mass-flow TSFC by plus or minus 1% with other inputs fixed.
Range changes inversely with TSFC. The perturbation is illustrative, not an estimate of sensor or engine uncertainty.
Do not display its output range as a confidence interval.

## Required next steps

1. Select the intended decision and operating domain for each model.
2. Obtain traceable input and reference uncertainty.
3. Separate calibration data from independent validation data.
4. Resolve definition and unit mismatches before comparisons.
5. Propagate justified parameter uncertainty with correlations where available.
6. Report model discrepancies separately from measurement and numerical error.

See EA05_COMPARISONS.json for the complete numerical values and source fingerprints.

## EA-06 supplied measurement covariance

The diagnostic API can propagate a supplied covariance through first-order sensitivities.
It does not infer missing sensor uncertainty, coverage probability, model error, or fault classification confidence.
The default complete-model uncertainty record remains unknown. See EA06_MISSION_DIAGNOSTICS.md.
