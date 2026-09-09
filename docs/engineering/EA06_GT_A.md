# EA-06 GT-A: isolated thermodynamic states

Date: 2026-09-08. Status: complete.

## Contract

`core/gas_turbine/state.py` supplies immutable SI snapshots for the methane research model.
Each operation creates its own Cantera GRI30 solution. No solution object is stored in a snapshot or shared between calls.

- `state_tp` accepts nonnegative species masses on a common mass scale and normalizes them once.
- `methane_air_state` uses CH4 and dry air with O2:N2 mole ratio 1:3.76. Fuel/air ratio is an exact mass ratio.
- `frozen_state` changes pressure and exactly one temperature, enthalpy, or entropy coordinate.
- Snapshots contain species and element mass fractions, enthalpy, entropy, density, heat capacities, and molecular weight.

All state changes retain composition. No helper performs equilibrium or combustion.
Enthalpy includes the GRI30 formation enthalpy. An additional LHV must not be added to this chemical energy balance.
The new air definition belongs to the research model. It does not silently replace the legacy air convention.

Invalid species, negative masses, empty mixtures, nonfinite coordinates, and ambiguous inversions return typed errors.
Mechanism load failures and Cantera state failures use the existing dependency and thermochemistry errors.
No independently validated temperature or pressure domain is claimed. Thermochemical data limits still require review for each future solver path.

## Acceptance evidence

Thirteen focused tests pass. They check exact fuel/air ratios, mass scaling, element fractions, frozen composition, HP/SP inversion, and concurrent isolation.
The HP inverse recovers a prescribed 1600 K state. The SP inverse preserves entropy at a different pressure.
The source snapshot remains unchanged after every operation.

## Integration boundary

The existing cycle solver does not call these helpers yet. Its documented Mach 3 discrepancy remains open.
GT-B will use these states for freestream and frozen nozzle energy balances.
GT-C through GT-F remain separate implementation gates. EA-06 remains in progress.

## Full regression result

All 243 backend tests pass in 97.00 seconds.
Two existing warnings remain: Starlette/httpx deprecation and a rocket sweep temperature below the mechanism range.
Frontend code did not change. Frontend checks were not repeated.
