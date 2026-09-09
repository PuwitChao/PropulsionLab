# EA-06 GT-D: compressor and turbine paths

Date: 2026-09-08. Status: complete.

## Interfaces and definitions

`core/gas_turbine/shaft.py` provides frozen stage calculations and bounded shaft matching.
`compressor` requires outlet pressure at least equal to inlet pressure.
It calculates the isentropic outlet through SP, then applies w = (h_is-h_in)/eta_is.
An HP inversion gives the actual outlet state. Positive work means compressor input work.

`turbine` requires outlet pressure no greater than inlet pressure.
It applies w = eta_is*(h_in-h_is), then uses HP for the actual outlet.
Positive work means turbine output work before mechanical loss.
Both stage work values use J/kg of gas. Composition remains fixed.
These efficiency inputs are isentropic, not polytropic. They do not redefine the legacy API fields.

`match_turbine` accepts shaft demand in J/kg of core air, gas/core-air mass ratio, and mechanical efficiency.
Delivered shaft work equals stage work times gas/core-air mass ratio times mechanical efficiency.
A bounded logarithmic pressure root matches demand between an explicit minimum pressure and inlet pressure.
Demand above the available work returns physical infeasibility. Zero demand preserves the inlet state.
Iteration exhaustion returns a convergence error with the measured residual.
The default maximum is 64 iterations. The shaft tolerance is 0.1 J/kg plus 1e-6 times demand.

The helpers do not size flow areas, match component maps, or enforce a complete engine operating point.
The minimum pressure is an explicit modeling constraint. It is not inferred from engine geometry.

## Acceptance evidence

Ten focused tests pass. Argon tests compare both stages with independent constant-cp analytic relations at efficiencies 1.0 and 0.85.
The ideal limit preserves entropy. Lossy stages increase entropy.
A two-shaft test passes air through LP and HP compressors, then a methane burner and sequential HP/LP turbines.
Each shaft closes its own work balance using product mass and distinct mechanical efficiencies.
Tests also check frozen product composition, zero load, insufficient work, invalid efficiency, and iteration exhaustion.
`EA06_GT_D_EVIDENCE.json` records the two-shaft case and source hashes.

## Remaining scope

These helpers remain separate from the legacy API solver. No operational validation is claimed.
Next: GT-E mixers and afterburners with mass, element, and enthalpy closure.
GT-F API adoption and the pressure-energy efficiency definition remain open. EA-06 remains in progress.

Recorded shaft residuals are +0.0667 J/kg of core air for HP and +0.1026 J/kg for LP.
Both satisfy the declared absolute-plus-relative tolerance.

Full regression: 272 backend tests pass in 111.36 seconds.
Two existing warnings remain: Starlette/httpx deprecation and a rocket sweep temperature below the mechanism range.
Frontend code did not change. Frontend checks were not repeated.
