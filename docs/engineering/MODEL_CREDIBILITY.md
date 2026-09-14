# Model Credibility

Updated: 2026-09-09. `MODEL_REGISTRY.json` is the authoritative coverage and uncertainty registry.

Exploratory preliminary-design comparisons. No operational qualification.

No model has an independently validated operating domain. Empty domain lists are explicit evidence gaps, not unrestricted applicability.

| Model | Current model and limits | Required evidence |
| --- | --- | --- |
| gas_turbine | Approximate zero-dimensional cycle with sampled properties. Gas composition and mixer energy are approximate. No independent engine dataset. | Measured station states and thrust/fuel data with fuel definition and uncertainty. |
| multispool | Fixed-point shaft work match with final residuals. Work convergence does not validate temperatures, composition, or performance. | Independent spool work and station measurements with accessory loads. |
| ramjet | Approximate ram-compression cycle. Recorded Mach-3 case fails the efficiency consistency screen. | Consistent enthalpy/composition model and independent high-Mach reference. |
| rocket_equilibrium | GRI30 HP/SP equilibrium with prescribed nozzle losses. 300 K gas reactants, propane surrogate for RP1, frozen sonic throat and approximate shifting throat pressure. | Matched reactant phase, enthalpy, species, pressure, mixture mass ratio, and loss conventions. |
| rocket_thermal | Conceptual Bartz-style heat flux. Synthetic stations and wall-temperature assumptions. No measured heat-flux comparison. | Published correlation constants with unit conventions, local geometry, wall state, and measured flux. |
| rocket_structure | Thin-wall thickness and empirical engine-mass multiplier. No stress concentration, thermal stress, buckling, fatigue, or verified material allowables. | Load cases, material temperature data, joint geometry, and independent structural assessment. |
| off_design | Generic normalized map and prescribed throttle schedule. No calibrated dimensional map or fixed-geometry engine match. | Compressor/turbine maps with stations, corrected-unit definitions, geometry, and uncertainty. |
| atmosphere | Four-layer hydrostatic atmosphere. Geometric input converts to geopotential layer height. | Extend independent table coverage and establish output uncertainty. |
| moc | Planar characteristics followed by optional axisymmetric area mapping. Mapped area is not an axisymmetric flow solution. Resolution uncertainty is not an accuracy bound. | Independent wall contour reference and mesh-refinement evidence, then radial-source implementation if selected. |
| mission | Drag-polar constraints, ideal ground roll, constant-condition Breguet cruise. No installed-thrust lapse, obstacle clearance, reserves, or full mission trajectory. | Aircraft polar, engine deck, mission segments, and flight data with consistent masses and units. |
| diagnostics | Constant-gamma telemetry screening. Thresholds are not calibrated fault classifiers. Measurement covariance can be supplied. Model-form uncertainty remains unknown. | Simultaneous calibrated telemetry, sensor covariance, operating-point baseline, and labeled fault cases. |

## Evidence interpretation

The comparison suite contains published atmosphere and perfect-gas table cases. These are checks at named conditions.
They do not establish engine, vehicle, thermal, structural, or diagnostic accuracy.
All calibration and independent-validation case lists remain empty. No application output serves as its own validation target.

The recorded EA-05 geometric-altitude discrepancy is corrected. Both frozen geometric cases now pass.
A CEA liquid-reactant example cannot validate the current 300 K gas-reactant model.
The MoC study measures resolution sensitivity. Its area mapping does not solve axisymmetric flow.

See [EA-05 report](EA05_REPORT.md), [uncertainty record](UNCERTAINTY.md), and [validation plan](VALIDATION_PLAN.md).

NASA-STD-7009B informs the evidence distinction only. No standards compliance or certification is claimed.

## EA-06 research paths

Explicit methane models now cover ramjet, turbojet with optional reheat, separate/mixed turbofan, and three-shaft operation.
They use enthalpy, mass, element, and shaft residuals. Efficiencies remain unavailable pending pressure-energy review.
These numerical checks do not validate an engine. Legacy approximate models remain separately accessible and retain failure screens.
Installed-deck cruise and measurement covariance are optional supplied-data paths. See EA06_CLOSEOUT.md.

## September 10 evidence update

Three matched NASA CEA gas-reactant chamber cases pass the declared code-comparison screen.
The original liquid-reactant case remains an incompatible negative control.
The solver rejects temperatures below the common GRI30 floor before it reports rocket performance.
This conservative floor also rejects an initial frozen entropy state below 300 K before shifting equilibrium.
A broader low-temperature model requires a reviewed species set and thermodynamic data.
High-temperature extrapolation remains unqualified. In particular, the hottest chamber comparison exceeds some GRI30 species temperature ranges.
Agreement between codes at that condition does not validate the extrapolated properties.
See VALIDATION_PLAN.md and EA08_LIMITATIONS.md for the remaining qualification evidence.

## September 14 temperature-domain correction

Rocket calculations now use gri30_highT.yaml for chamber, exit, and frozen-throat states.
Both temperature bounds are enforced at checked states. The common species interval is 300-5000 K.
Earlier high-temperature extrapolation findings describe the previous gri30.yaml implementation.
This data interval does not establish a physically validated operating domain or qualify transport correlations.
Frozen gas-turbine states retain gri30.yaml. Shifting-throat pressure remains approximate.
See HIGH_T_REVIEW.md for the correction and verification record.
