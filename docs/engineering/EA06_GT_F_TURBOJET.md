# EA-06 GT-F: methane turbojet interface slice

Date: 2026-09-08. Status: complete.

## Research path

`methane_turbojet` connects the GT-B inlet, GT-D compressor, GT-C equilibrium burner, matched turbine, and frozen convergent nozzle.
The compressor pressure ratio and compressor/turbine isentropic efficiencies are explicit inputs.
Mechanical efficiency converts turbine gas work to shaft work. Product mass includes added methane.
The turbine supplies the compressor demand on a kg-of-core-air basis.
The lower turbine pressure bound reserves positive nozzle pressure after the specified nozzle pressure loss.
This numerical bound does not define a geometric engine operating map.
An unavailable shaft work solution returns physical infeasibility. No fallback stage calculation is substituted.

The result includes compressor and matched shaft states, residuals, and all ramjet-style research evidence.
Methane is the declared fuel. Efficiencies remain unavailable pending the pressure-energy definition review.
The default scenario uses sea-level static operation, pressure ratio 10, and burner temperature 1800 K.
Compressor/turbine isentropic efficiencies are 0.88/0.90. Shaft mechanical efficiency is 0.98.

## API and UI

POST `/analyze/cycle/methane-turbojet` requires `model: methane_turbojet_research`.
The request rejects ramjet model identifiers and legacy eta_c fields.
Select Methane research turbojet in the Cycle Solver.
The shared research panel displays the new stage controls, turbine outlet state, and shaft residual.
Turbojet scenarios use `methane_turbojet_research_params` for local storage and carry their model identifier in JSON.
Cross-architecture imports fail explicitly. Legacy cycle tabs and their inputs remain unchanged.

## Verification

Four focused core/API tests pass. They check static and flight shaft closure, product transport, unavailable work, and architecture rejection.
`EA06_GT_F_TURBOJET_EVIDENCE.json` records the default case with source hashes.
The browser test covers a live solve, shaft result export, scenario round-trip, and rejection by the ramjet panel.

## Remaining scope

This slice exposes a dry single-shaft turbojet. It does not claim turbofan, multi-spool, mixer, or afterburner integration.
Next: connect the GT-E methane afterburner to the turbojet path with explicit fuel and stream-mass accounting.
Turbofan and multi-spool research paths remain to be assembled and exposed.
GT-F and EA-06 remain in progress.

Full verification: 289 backend tests pass in 122.58 seconds, with the two existing warnings.
Frontend lint/build, five unit tests, and seven browser tests pass. The rendered panel was inspected.
The recorded default case gives 1098.154 N per kg/s of inlet air and a shaft residual of -0.36453 J/kg of core air.
