# Model Fidelity and Evidence

Updated: 2026-09-09. Model complexity, calibration, and independent validation are separate properties.

| Model | Implemented description | Reference comparisons | Validated domain |
| --- | --- | --- | --- |
| gas_turbine | Approximate zero-dimensional cycle with sampled properties. | No independent numerical reference case | None established |
| multispool | Fixed-point shaft work match with final residuals. | No independent numerical reference case | None established |
| ramjet | Approximate ram-compression cycle. | No independent numerical reference case | None established |
| rocket_equilibrium | GRI30 HP/SP equilibrium with prescribed nozzle losses. | CEA8-COMPATIBILITY | None established |
| rocket_thermal | Conceptual Bartz-style heat flux. | No independent numerical reference case | None established |
| rocket_structure | Thin-wall thickness and empirical engine-mass multiplier. | No independent numerical reference case | None established |
| off_design | Generic normalized map and prescribed throttle schedule. | No independent numerical reference case | None established |
| atmosphere | Four-layer hydrostatic atmosphere. | ATM-H-0, ATM-H-10000, ATM-H-30000, ATM-Z-10000, ATM-Z-30000 | None established |
| moc | Planar characteristics followed by optional axisymmetric area mapping. | PM-1.5, MOC-AREA-1.5, PM-2.0, MOC-AREA-2.0 | None established |
| mission | Drag-polar constraints, ideal ground roll, constant-condition Breguet cruise. | No independent numerical reference case | None established |
| diagnostics | Constant-gamma telemetry screening. | No independent numerical reference case | None established |

Reference comparisons use `REFERENCE_CASES.json`. The result report retains passes, differences, incompatible references, and execution errors.
A successful helper comparison does not promote the complete solver to a higher fidelity or evidence level.
The API continues to report unknown validation coverage. Optional diagnostic covariance covers measurement uncertainty only.

`MODEL_REGISTRY.json` owns model descriptions, sources, limits, missing evidence, and uncertainty state.

EA-06 adds explicit methane research architectures, mass-consistent rocket throat sizing, supplied-deck cruise, and covariance propagation.
Their complete-model validated domains remain empty. See EA06_CLOSEOUT.md for selected scope and deferred validation.
