# EA-06 GT-F: methane ramjet interface slice

Date: 2026-09-08. Status: ramjet API and UI slice complete. Broader research engine adoption remains open.

## User flow

Select Methane research ramjet in the Cycle Solver tabs.
The panel uses SI inputs and names CH4 explicitly. Existing cycle tabs keep their current solvers and stored parameters.
The research model has its own parameter storage key: `methane_ramjet_research_params`.
A solve is explicit. Parameter edits clear the previous result and invalidate pending responses.
The panel displays thrust, TSFC, fuel ratio, burner residual, and thermodynamic states.
Efficiencies remain unavailable with an explicit explanation. Validation coverage remains unknown.
The nozzle is convergent and frozen. The panel does not advertise Jet-A or independently validated performance.

## API contract

POST `/analyze/cycle/methane-ramjet` requires `model: methane_ramjet_research`.
The request defines geometric altitude, Mach, burner temperature, inlet pressure recovery, burner/nozzle pressure losses, fuel temperature, and heat loss.
The API converts altitude through the shared atmosphere model. All physical quantities use SI units.
`MethaneRamjetRequest` forbids unknown fields. Legacy eta_b and h_fuel inputs are rejected instead of ignored.
The legacy `/analyze/cycle/ramjet` endpoint remains unchanged, including its explicit Mach 3 efficiency failure.
The response retains research component states, residuals, model identity, and assurance metadata.

## Files and exports

Scenario export includes the required model identifier and all research input fields.
Import accepts only this schema and checks numeric bounds. Legacy cycle files are rejected with a visible message.
The existing assurance export includes the full result, component states, model identifier, and null efficiency values.
No automatic migration changes a legacy fuel or efficiency definition.

## Verification

Six focused API tests pass. The full backend suite passes 285 tests with two existing warnings.
Frontend lint, build, and five unit tests pass.
Six browser tests pass, including two research flows and four existing assurance flows.
The browser checks cover a live solve, result export, scenario round-trip, legacy import rejection, and return to the turbojet tab.
Rendered review found cramped table columns. Padding and full-width layout correct the spacing.

## Remaining GT-F work

Only the assembled methane ramjet research path is exposed.
GT-D shaft stages and GT-E mixer/reheat helpers require complete engine orchestration before API adoption.
Next: assemble a methane turbojet research path from the compressor, burner, matched turbine, and nozzle helpers.
Then add explicit API/UI selection and tests for each supported architecture.
The pressure-energy efficiency definition remains open. Keep efficiency values unavailable until reviewed.
GT-F and EA-06 remain in progress. EA-07 and EA-08 remain pending.

## Turbojet follow-up

The dry methane turbojet path is now exposed with separate API/UI model selection and scenarios.
See `EA06_GT_F_TURBOJET.md`. Afterburner and other architecture integration remain open.

## Turbojet afterburner follow-up

Optional methane turbojet reheat is integrated with API/UI controls and compatible dry defaults.
See `EA06_GT_F_AFTERBURNER.md`. Separate-stream turbofan adoption is next.
