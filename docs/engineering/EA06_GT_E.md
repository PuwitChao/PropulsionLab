# EA-06 GT-E: frozen mixing and methane afterburner

Date: 2026-09-08. Status: complete.

## Mixer contract

`core/gas_turbine/mixer.py` mixes positive mass flows at an explicit outlet pressure.
Inputs are stagnation states. Species mass flows and enthalpy flows are summed before an HP inversion.
The output composition is the mass-weighted mixture. No equilibrium reaction occurs in the mixer.
The outlet pressure must not exceed any inlet pressure. The caller specifies pressure loss.
The result reports total mass flow, energy residual in W, and element residuals in kg/s.
This model does not solve mixer geometry, momentum, static-pressure matching, or pressure loss from flow fields.

## Afterburner contract

`methane_afterburner` in `core/gas_turbine/methane.py` accepts an oxygen-rich inlet gas and added pure methane.
The inlet may contain combustion products and bypass air. Its composition is retained in the reactant mass balance.
A shared internal heat-addition solver serves the air burner and afterburner with unchanged air-burner inputs.
The added fuel bound uses excess oxygen atoms after complete oxidation of existing carbon and hydrogen.
The atom balance is n_O - 2*n_C - n_H/2. Four excess oxygen atoms permit one added CH4 molecule.
A nonpositive excess rejects reheat. A target outside the lean bracket also fails explicitly.
TP equilibrium determines the products at each bounded fuel-root iteration.
Formation enthalpy supplies chemical energy. No independent LHV is added.

Added fuel ratio and heat loss use kg of inlet gas, not kg of core air.
The output mass ratio is 1 plus added fuel ratio. Callers must multiply by inlet mass flow to recover engine-basis quantities.
Fuel defaults to 300 K. Heat loss defaults to zero.
The result reports product state, added fuel ratio, output mass ratio, energy and element residuals, and iteration count.

## Acceptance evidence

Seven new tests and 17 existing burner/shaft tests pass in the focused run.
Argon mixing matches the independent mass-weighted constant-cp temperature result.
An integrated products/bypass mixing and reheat case checks mass, species, elements, and enthalpy.
Tests reject zero/negative/nonfinite flows, mixer pressure gain, and an oxygen-depleted reheat stream.
`EA06_GT_E_EVIDENCE.json` records component states and source hashes.

## Remaining scope

The legacy API still uses its existing solver. These helpers belong to the explicit methane research path.
Next: GT-F model selection, compatible API inputs, frontend display, exports, and regression checks.
Pressure-energy efficiency definitions remain open. No operational model validation is claimed.
EA-06 remains in progress.

Recorded mixer energy residual: +0.00170 W. Afterburner residual: -0.92345 J/kg of inlet gas.
Both satisfy the numerical criteria used for this case.

Full regression: 279 backend tests pass in 118.39 seconds.
Two existing warnings remain: Starlette/httpx deprecation and a rocket sweep temperature below the mechanism range.
Frontend code did not change. Frontend checks were not repeated.
