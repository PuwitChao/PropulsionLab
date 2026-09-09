# EA-06 GT-F: turbojet afterburner integration

Date: 2026-09-08. Status: complete.

## Model and mass basis

The methane research turbojet now accepts an optional afterburner temperature.
A null temperature disables reheat and its pressure loss. Existing API requests remain dry by default.
When enabled, the GT-E afterburner receives the matched turbine outlet and produces equilibrium products at the requested temperature.
The nozzle expands these products with frozen composition.
The pressure bound for shaft matching reserves the afterburner and nozzle pressure losses.
Infeasible heating targets, oxygen shortage, and unavailable shaft work retain explicit errors.

Main fuel ratio f_main uses core-air mass. The afterburner helper reports added fuel per kg of its inlet gas.
The engine conversion is f_afterburner = (1+f_main)*added_fuel_per_inlet_gas.
Total fuel is f_main+f_afterburner. Nozzle mass flow is 1+f_total per unit core-air flow.
TSFC uses total fuel. Shaft matching continues to use 1+f_main because reheat occurs after the turbine.
The result exposes main, added, and total fuel ratios plus the full afterburner state and residuals.

This remains a design-point calculation with a derived nozzle area. It does not predict a fixed-geometry dry-to-wet operating transition.
No independent LHV is added. Efficiency metrics remain unavailable pending the pressure-energy review.

## API and UI

The existing research turbojet endpoint accepts `afterburner_temperature_k`, `afterburner_pressure_loss`, and `afterburner_heat_loss_j_per_kg_inlet_gas`.
The default pressure-loss fraction is 0.03. Afterburner heat loss defaults to zero and uses inlet-gas mass.
Fuel temperature uses the existing methane inlet temperature input.
The turbojet panel provides an Enable methane afterburner checkbox and the three controls.
The result displays added fuel, afterburner energy residual, and product state.
Scenario and assurance exports retain the new fields and component evidence.
Older dry turbojet scenarios receive only the new disabled-afterburner defaults. Cross-model files remain rejected.

## Verification

Seven focused turbojet tests pass. Three new tests check mass/fuel accounting, disabled pressure-loss behavior, and invalid targets plus API reheat.
The nozzle mass flux and area recover total engine mass flow. Its composition matches afterburner products.
The integrated energy and element residuals remain within numerical tolerances.
The browser test covers enabled reheat, full-result export, wet scenario import, and older dry scenario compatibility.
`EA06_GT_F_AFTERBURNER_EVIDENCE.json` records the default wet case at 2200 K with source hashes.

## Remaining scope

Next: assemble and expose the separate-stream methane turbofan research path with HP/LP shaft balances.
Mixed-flow and multi-spool research architecture adoption remain open.
GT-F and EA-06 remain in progress. No operational validation is claimed.

Full verification: 292 backend tests pass in 138.38 seconds, with two existing warnings.
Frontend lint/build, five unit tests, and eight browser tests pass. The rendered panel was inspected.
The recorded wet case has f_main=0.03277718, f_afterburner=0.02261344, and f_total=0.05539062.
Its afterburner energy residual is +1.58703 J/kg of inlet gas.
