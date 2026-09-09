# EA-00 Initial Engineering Audit

Date: 2026-09-05. Baseline revision: `71d6bdfad6215d2492ae574c52ff36e632b78658`.
Scope: all core modules, request models, API error paths, affected pages, and existing tests.
This report records the pre-correction state. Subsequent results belong in `VALIDATION_REPORT.md`.

## Baseline

- Backend: 134 tests passed in 153.05 seconds. Warnings concern Starlette's httpx adapter and a Cantera temperature range.
- Frontend: five tests, lint, and production build passed.
- Browser baseline: 26 tests passed. Post-change evidence is recorded in VALIDATION_REPORT.md.
- These checks demonstrate software behavior. They do not establish model validation.

## Solver inventory

| Module | Functions and method |
| --- | --- |
| cycle | Turbojet, separate/mixed turbofan, multispool, ramjet. Station temperature and pressure equations with sampled Cantera cp |
| thermo | Compressor/turbine polytropic conversions and choked/unchoked convergent nozzle relations |
| off_design | Generic speed/flow map, efficiency correlations, algebraic turbine work estimate, throttle sampling |
| rocket/analyzer | Cantera HP chamber equilibrium, SP nozzle expansion, approximate throat state, sizing, Bartz, altitude sampling |
| rocket/moc | Prandtl-Meyer inversion, planar characteristic intersections, wall construction, axisymmetric area mapping, mesh export |
| mission | Dynamic pressure, level/turn/climb/ceiling/excess-power constraints, empirical takeoff, Breguet range |
| diagnostics | Station-based component efficiency and pressure-loss calculations with threshold classifications |
| units | Fixed SI conversions and four-layer lapse/isothermal atmosphere |
| presets | Static input records. No independent solver |

`SOURCE_INVENTORY.md` lists individual functions, loops, exception handlers, and max/min/abs calls.
Regenerate the inventory with `tools/assurance_inventory.py`. Interpret physical effects from the categories below.

## Equation inventory

| ID | Equation or relationship | Implementation | Evidence level |
| --- | --- | --- | --- |
| EQ-01 | Compressor pressure/temperature relation and polytropic conversion | cycle, thermo | Existing regression tests |
| EQ-02 | Approximate fuel balance using cp*T | cycle | Approximation, composition consistency unresolved |
| EQ-03 | Shaft work = mass fraction * cp * temperature drop * mechanical efficiency | cycle, off_design | Residual evidence absent |
| EQ-04 | Critical pressure ratio and isentropic Mach relation | thermo | Analytical verification available |
| EQ-05 | Momentum plus pressure thrust; TSFC = fuel flow / thrust | cycle | Invalid-state behavior defective |
| EQ-06 | HP/SP equilibrium and velocity from enthalpy drop | rocket | Cantera dependency, no independent CEA validation |
| EQ-07 | F = mdot*Ve + (Pe-Pa)*Ae; Isp = F/(mdot*g) | rocket | Ambient/exit semantics inconsistent |
| EQ-08 | Approximate c-star and throat/exit continuity | rocket | Constant-gamma throat assumption |
| EQ-09 | Bartz heat transfer and thin-wall mass estimate | rocket | Conceptual correlations |
| EQ-10 | Prandtl-Meyer compatibility and area mapping | moc | Existing geometry tests, no axisymmetric integration |
| EQ-11 | Generic normalized map and efficiency correlations | off_design | Uncalibrated heuristic |
| EQ-12 | ISA lapse/isothermal pressure and density | units | Layer tests, upper-domain handling defective |
| EQ-13 | Drag polar and flight constraints | mission | Regression/trend tests |
| EQ-14 | Empirical takeoff and Breguet range | mission | Unit and source review required in EA-04 |
| EQ-15 | Inverse component efficiencies and threshold fault labels | diagnostics | Regression tests, telemetry validity unresolved |

## Assumption inventory

Cycle uses unequilibrated methane/air property mixtures with a Jet-A-like default LHV and a fixed fuel equivalence conversion.
Component work uses sampled cp rather than a consistent combustion-product enthalpy model.
Mixer pressure equals the lower stream pressure with a two-percent loss. Mixer temperature uses approximate cp*T accounting.
Afterburner and bypass losses use fixed fractions. Installation losses use scalar factors.
Off-design speed, flow, TIT, and efficiencies use prescribed correlations rather than fixed-geometry engine matching.
Rocket reactants start at 300 K. Several named fuels use surrogate species.
Rocket c-star and throat pressure use chamber gamma. Bartz uses fixed wall temperature and a synthetic Mach distribution.
Rocket structure uses fixed material properties, safety factor, characteristic length, and a mass multiplier.
MoC is planar with radius mapping. The atmosphere stops at 47 km and lacks geometric/geopotential conversion.
Mission uses a fixed drag polar. Diagnostics uses fixed thresholds without sensor uncertainty or unique fault identification.

## Clamp and fallback inventory

| Category | Locations | Disposition |
| --- | --- | --- |
| Physical changes | cycle fuel, HPC PR, equivalence ratio, turbine pressure base, efficiency clips | EA-01 remove invalid-state concealment or expose explicit model assumptions |
| Pressure-thrust denominator floors | cycle nozzle velocity | EA-01 reject no-expansion and use actual positive velocity |
| Mixer lower-pressure choice and losses | cycle mixer | Retain as declared approximation |
| Sampling denominators and absolute residual scales | sweep counts and multispool | Numerical control. Validate count/range first |
| Map clipping and turbine PR=50 fallback | off_design | EA-03 reject outside domain and expose heuristic limits |
| Negative enthalpy-drop clipping | rocket | EA-02 reject infeasible nozzle states |
| Bartz Prandtl/flux floors and structure radius minimum | rocket | Retain as declared conceptual model limits pending EA-06 |
| Optional heat-transfer exception suppression | rocket | EA-02 attach warning instead of silent omission |
| Supersonic Mach limits, minimum mesh count, near-parallel intersection guards | moc | Record as numerical/model controls. Detailed convergence study remains EA-05/06 |
| Atmosphere upper clamp | units | EA-02 reject outside 0-47 km |
| Infinite mission constraints, zero unknown type/range | mission | EA-04 explicit statuses and unit review |
| Zero efficiencies for invalid telemetry | diagnostics | EA-04 reject inconsistent states |
| Recursive NaN/Inf-to-null conversion | backend/main | EA-01 attach numerical failure for affected solver outputs |

## Convergence inventory

| Solver | Unknown, seed, method, tolerance, limit, failure behavior |
| --- | --- |
| Multispool | Tt45/Tt5, station-4 cp seed, fixed point, 0.001 relative temperature change, eight passes, always reports convergence |
| Off-design | Turbine efficiency, 0.90 seed, fixed point through algebraic pressure estimate, 0.001 change, three passes, no failure status |
| MoC inverse angle | Mach, bracket 1+1e-9 to 60, bisection, fixed 100 passes, returns midpoint without residual metadata |
| MoC field intersection | Characteristic slopes, two correction passes, no convergence test, denominator guard |
| Cantera HP/SP | Species and temperature, mechanism/reactant state, dependency solver defaults, exceptions propagated or converted inconsistently |
| Cycle cp refinement | One property reevaluation for selected stations, no iterative convergence claim justified |

Other loops construct sample arrays, characteristic nets, or meshes. They do not solve a convergence problem.

## Validation inventory

`tests/test_core.py` and `tests/test_multispool.py` cover values, trends, geometry, and some physical identities.
`tests/test_api.py` covers endpoint contracts. `tests/test_error_handling.py` covers safe error responses.
Preset and diagnostics tests cover extensions and threshold behavior. Browser tests exercise page workflows and downloads.
`tools/validate_benchmarks.py` is a separate comparison utility. Its presence does not establish current agreement or uncertainty bounds.
Independent reference datasets, validated operating domains, sensor uncertainty, and reproducible model-comparison reports remain incomplete.

## Error-flow inventory

Core ValueError/Cantera/math failures enter route-level broad exception handlers and usually become generic HTTP 500 responses.
The gateway preserves request IDs and sanitizes internal errors. The frontend API helper presents an error banner.
Sensitivity and rocket sweeps silently drop failures. Off-design replaces failures with zero thrust and TSFC.
The rocket altitude table retains error rows, but its charts filter those rows out and join the remaining points.
Successful payloads lack shared validity metadata. Null conversion alone cannot distinguish unavailable metrics from numerical failure.

## Ranked findings

S4 means potentially misleading decisions. D4 means failure can resemble a valid result.
S3 means material model integrity risk. D3 means expert inspection is usually necessary.

| ID | Priority | State and trigger | Observed / required behavior | S/D | Owner |
| --- | --- | --- | --- | --- | --- |
| F01 | P0 | Confirmed: multispool OPR=20,FPR=3,LPC=8,BPR=.3,TIT=1850 | Effective OPR=24 and convergence message / reject architecture | 4/4 | EA-01 |
| F02 | P0 | Confirmed code: exhaust iteration budget | Always converged / residual-based termination | 4/4 | EA-01 |
| F03 | P0 | Confirmed code: TIT below compressor temperature, enabled AB below inlet | Fuel clamped / reject active heat removal | 4/4 | EA-01 |
| F04 | P0 | Confirmed equation: nozzle Pt<=Pa | sqrt domain or zero expansion / typed domain outcome | 3/2 | EA-01 |
| F05 | P0 | Confirmed code: nonpositive thrust | TSFC=0 / null with infeasibility status | 4/4 | EA-01 |
| F06 | P0 | Confirmed code: failed sweep points and nonfinite values | Lost points or plausible zeros / retained explicit outcomes | 4/4 | EA-01/03 |
| F07 | P0 | Confirmed: 47 km and 100 km | Identical P=110.898214 Pa / reject out-of-domain altitude | 4/4 | EA-02 |
| F08 | P0 | Confirmed code: rocket altitude sweep | New Pe and geometry at each altitude / fixed geometry, vary Pa only | 4/4 | EA-02 |
| F09 | P0 | Confirmed code: rocket regime and exit composition | Pa fixed to sea level, exit composition taken after throat solve / use actual ambient and saved exit state | 4/4 | EA-02 |
| F10 | P0 | Confirmed code: off-design TSFC and map display | SI boundary violated, normalized flow mislabeled / explicit SI outputs and normalized axis | 4/4 | EA-03 |
| F11 | P0 | Confirmed code: UI surge calculation | Difference between operating points / documented same-speed map margin | 4/4 | EA-03 |
| F12 | P0 | Suspected model error: takeoff and Breguet callers | Dimensional/source ambiguity / traced unit and reference checks | 4/4 | EA-04 |
| F13 | P0 | Confirmed code: invalid diagnostic telemetry | Zero efficiency and fault labels / input validity checks | 4/4 | EA-04 |
| F14 | P1 | Documented approximation: gas composition, cooling, structure, MoC | Claims exceed evidence / explicit fidelity and future validation | 3/3 | EA-05/06 |
| F15 | P2 | Confirmed docs: FBD diagnostics path | Incorrect path / synchronize traceability | 2/2 | EA-01 |
| F16 | P3 | Visual polish backlog | Defer until solver correctness gates pass | 1/1 | EA-07 |

Nominal turbojet baseline at 101325 Pa, 288.15 K, Mach 0, PR 20, TIT 1500 K: specific thrust 957.913602094063 N/(kg/s).
This is a regression anchor, not an experimental benchmark.

## Sources and decisions

[NASA rocket thrust equations](https://www.grc.nasa.gov/WWW/K-12/BGP/rktthsum.html) support the pressure-thrust identity used in EA-02.
[NASA specific impulse](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/) defines thrust per propellant weight flow.
[NASA-STD-7009B](https://standards.nasa.gov/sites/default/files/standards/NASA/B/1/NASA-STD-7009B-Final-3-5-2024.pdf) provides conceptual credibility guidance.
The [NASA handbook catalog](https://standards.nasa.gov/standard/nasa/nasa-hdbk-7009) identifies the companion handbook.
No ASME or NPR compliance claim is made. Their detailed requirements are not adopted in this sprint.

EA-00 selects EA-01 tasks 1-8, EA-02 fixed-geometry pressure correction with a 47 km atmosphere limit, and EA-03 generic map integrity.
EA-04 and later work remain outside this implementation request.
