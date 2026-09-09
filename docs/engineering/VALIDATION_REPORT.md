# EA-00 through EA-03 verification report

Date: 2026-09-07. Baseline commit: `71d6bdfad6215d2492ae574c52ff36e632b78658`.
Scope: gas-turbine result integrity, rocket pressure and altitude behavior, and generic off-design map integrity.

## Verification evidence

| Check | Baseline | Final evidence |
| --- | --- | --- |
| `.venv\Scripts\python.exe -m pytest tests/ -q` | 134 passed | 177 passed, one outdated assertion failed. Corrected assertion passed in a focused rerun. All 178 cases covered. |
| Frontend `npm run test` | 5 passed | 5 passed |
| Frontend `npm run lint` | Passed | Passed |
| Frontend `npm run build` | Passed | Passed |
| Frontend `npm run test:e2e` | 26 passed | 29 passed, one ambiguous locator failed. All three affected-file cases passed after correction. All 30 cases covered. |

The final full backend run took 102.92 seconds. The focused backend rerun passed in 0.52 seconds.
The final full browser run took approximately 1.6 minutes. The affected-file rerun passed in 23.1 seconds.
No production code changed after those full runs. Only test expectations and documentation changed.

The pressure test now requires HTTP 422 and INFEASIBLE when chamber pressure is below ambient pressure.
The browser test uses an exact metric label because the explanatory status text also contains surge margin.

Two backend warnings remain: Starlette's httpx deprecation and a Cantera equilibrium temperature below its stated range in an O/F case.
Browser logs include a harmless NO_COLOR/FORCE_COLOR conflict and an expected mocked convergence error.
These warnings do not establish model accuracy. The thermochemical range warning remains an applicability limitation.

## Reproduced findings and corrections

| Case | Previous behavior | Current behavior and evidence |
| --- | --- | --- |
| OPR 20, FPR 3, LPC 8 | Effective OPR 24 with convergence message | Reject inconsistent architecture through core and API |
| Multispool iteration exhaustion | Unconditional convergence message | NO_CONVERGENCE with iterations, tolerances, and residuals |
| Active combustor cooling or nozzle without expansion | Clipped fuel or numerical failure | Typed physical infeasibility |
| Failed sweep point | Dropped point or plausible zero | Retained inputs and status with null unavailable metrics |
| Atmosphere at 100 km | Same state as 47 km | Reject outside 0 to 47,000 m |
| Rocket altitude sweep | Redesign exit pressure and geometry per altitude | Solve geometry once, vary ambient pressure only |
| Rocket ambient pressure | Implicit sea-level pressure | Independent Pc, Pe, and Pa, including vacuum |
| Map and throttle | Normalized flow labeled kg/s, TSFC in display units | Explicit normalized flow and SI TSFC at the API boundary |
| Surge margin | Fabricated difference between operating points | Defined same-speed pressure and flow margin |

Focused cases are in `tests/test_solver_assurance.py`, with API and legacy regression updates in the existing test files.
Browser evidence is in `frontend/e2e/solver_assurance.spec.js` and the existing performance-map suite.
Cases cover finite inputs, architecture boundaries, forced non-convergence, work identities, pressure thrust, fixed geometry, and dependency failures.
Unexpected exceptions retain sanitized HTTP 500 responses and request identifiers.

## Numerical comparison

The nominal turbojet uses 101325 Pa, 288.15 K, Mach 0, pressure ratio 20, and turbine inlet temperature 1500 K.
Specific thrust changed from 957.913602094063 to 915.412058255981 N s/kg, approximately minus 4.44 percent.
The change follows the corrected turbine efficiency conversion and pressure calculation. It is not independent validation of accuracy.
The resulting TSFC is 3.0978426107597714e-05 kg/(N s).

The multispool case uses OPR 32, BPR 0.3, FPR 3.5, LPC ratio 4, and TIT 1850 K.
It terminates after four iterations from a budget of 50.
Final HP and LP work errors are approximately -0.00000189 and -0.001009 J/kg of core air.
Relative residuals are approximately -8.77e-12 and -2.32e-9.
Termination uses absolute tolerance 0.1 J/kg and relative tolerance 1e-6, with final-state property evaluation.

The H2/O2 case at Pc 7.5 MPa, O/F 6, and Pe 101325 Pa returns vacuum Isp 415.75021986363134 s.
Its expansion ratio is 10.325492053536491. These values are regression observations, not independent reference measurements.
The generic map design point at normalized speed 1 and normalized flow 1 returns pressure ratio 20 and efficiency 0.88.

## Intentional compatibility changes

- Invalid architectures, active heat removal, unsupported chemistry, and out-of-domain atmosphere inputs now return explicit failures.
- Unavailable metrics use null. Consumers must inspect status and assurance metadata before comparison or ranking.
- Off-design TSFC now uses kg/(N s). The UI converts it to mg/(N s) for display.
- Rocket altitude defaults stop at 47 km. Geometry remains fixed across altitude rows.
- The ramjet regression at Mach 3 exposes a propulsive-efficiency inconsistency as NUMERICAL_FAILURE.

The ramjet case previously accepted positive TSFC despite efficiency above one.
The current guard retains diagnostic outputs and suppresses invalid efficiency and TSFC metrics. Its underlying approximation still requires later work.
Existing tests changed only where previous expectations accepted the behavior this scope corrects.

## Evidence limits and next work

All affected models remain unvalidated against independent engineering benchmarks.
OUTSIDE_VALIDATED_DOMAIN identifies unknown validation coverage. It does not mean that convergence failed.
Generic compressor maps remain uncalibrated. Throttle estimates do not solve fixed-geometry engine matching.
Rocket separation uses an inherited screening ratio of 0.35. It does not predict separated-flow performance.
Thermal, structural, equilibrium, and contour approximations retain their documented limits.

EA-04 remains open for mission equations and diagnostic validity. EA-05 and EA-06 address broader evidence and model fidelity.
See MODEL_CREDIBILITY.md, VALIDATION_PLAN.md, ASSUMPTIONS.md, and EQUATION_TRACEABILITY.md for details.
No certification or formal standards compliance is claimed.
