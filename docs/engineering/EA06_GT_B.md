# EA-06 GT-B: freestream and frozen nozzle energy

Date: 2026-09-08. Status: complete.

## Interfaces and equations

`core/gas_turbine/flow.py` uses immutable GT-A states and fresh Cantera solutions.
`freestream_total` calculates flight velocity from the ambient sound speed.
It sets total enthalpy to h + V^2/2 through an HP inversion.
At fixed composition, entropy gives ideal total pressure through p2/p1 = exp((s(T2,p1)-s1)/R).
An explicit pressure recovery in (0,1] reduces total pressure without changing total enthalpy.
The result includes total state, flight velocity, ideal total pressure, and the energy residual.

`convergent_nozzle` models a frozen, isentropic convergent nozzle. Its choked exit is the throat.
A bounded temperature root solves h_total-h_static = gamma_static*R*T_static/2.
The sonic temperature bracket is [T_total/2, T_total]. An absent bracket returns a convergence error.
Entropy determines critical pressure. Below this pressure, the exit remains sonic.
Above critical pressure, an SP inversion sets exit pressure equal to ambient pressure.
Velocity follows sqrt(2*(h_total-h_exit)). Composition remains fixed throughout expansion.
The result includes critical pressure, Mach, mass flux, energy and sonic residuals, and iteration count.

The sonic root tolerance is 0.0001 J/kg plus 1e-8*cp_total*T_total. The default iteration limit is 64.
These are numerical controls, not physical accuracy claims.
Ambient pressure must be positive and below total pressure. Invalid pressure and failed convergence remain explicit errors.

## Acceptance evidence

Twelve focused tests pass. Pure argon supplies the independent constant-cp analytic limit for inlet and nozzle calculations.
Both choked and unchoked nozzle cases match the analytic temperature, pressure, and velocity.
A hot methane/air mixture checks choking continuity, local sonic Mach, entropy, energy, and frozen composition.
A pressure-loss case preserves total enthalpy and increases entropy.
Tests also cover invalid pressures and a deliberately exhausted iteration limit.

## Remaining scope

These helpers do not replace the existing API cycle solver yet. Its Mach 3 efficiency discrepancy remains explicit.
The nozzle is convergent. It does not model a divergent section, shocks, separation, or pressure-energy efficiency definitions.
Thermochemical data limits and independent engine validation remain separate requirements.
Next: GT-C methane burner and ramjet path, with a bounded fuel root and explicit fuel identity.

Recorded numerical evidence: `EA06_GT_B_EVIDENCE.json`, with source hashes.
The Mach 3 inlet residual is about 7.57e-10 J/kg. The hot-mixture sonic residual is about -0.00868 J/kg.

Full regression: 255 backend tests pass in 102.45 seconds.
Two existing warnings remain: Starlette/httpx deprecation and a rocket sweep temperature below the mechanism range.
Frontend code did not change. Frontend checks were not repeated.
