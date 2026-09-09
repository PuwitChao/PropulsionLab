# EA-06 cycle composition and energy proposal

Date: 2026-09-08. Status: diagnostic and proposal slice complete. Production solver replacement remains open.

## Findings

`tools/audit_cycle_energy.py` records six ramjet cases at Mach 1.5, 2, and 3, at geometric altitudes 0 and 11000 m.
The fixed burner temperature is 2200 K. The report includes source hashes and the Cantera version.
These are diagnostic cases, not independent engine benchmarks.

At sea-level Mach 3, the inlet enthalpy increase exceeds ambient kinetic energy by about 21.6 kJ/kg of air.
The frozen-proxy nozzle enthalpy drop differs from exit kinetic energy by about -2.80 kJ/kg of gas.
The current propulsive efficiency is about 1.256. The result correctly retains NUMERICAL_FAILURE and suppresses the public efficiency value.
At 11 km and Mach 3, the corresponding efficiency is about 1.067.

The helper sets an unburned methane/air mixture using f/0.068. It does not calculate combustion products.
The actual property-mixture fuel ratio differs from the requested mass ratio.
The freestream total temperature and pressure use different sampled gamma values.
The thrust velocity uses inlet-total gamma and a separate air gas constant, rather than ambient composition properties.
The nozzle uses a constant-gamma temperature relation despite temperature-dependent cp.

Pressure thrust also affects the efficiency discrepancy. The current jet-power expression adds pressure force times exit velocity.
When exit velocity is below flight velocity, useful pressure-thrust power can exceed that term.
Do not attribute the complete discrepancy to composition or clamp the efficiency to one.
Review the nozzle control volume and residual pressure energy before defining the replacement efficiency metric.

## Proposed model contract

Use a single named fuel model and one reference enthalpy convention per calculation.
Start with a methane research model using exact fuel/air stream masses and GRI30 thermochemical data.
Do not present this mode as Jet-A. The existing user-specified LHV does not automatically equal methane chemical energy.
Keep the legacy LHV mode explicit until a compatible sensible-enthalpy fuel model is defined.

Use Cantera formation enthalpies for the methane model. Do not add LHV again to the same chemical energy balance.
Specify fuel inlet temperature, air composition, combustion heat loss, and frozen or equilibrium product transport.
Solve fuel ratio for the requested burner temperature with a bounded root and a measured energy residual.
Reject an unbracketed temperature target. Record iteration count, residual, fuel ratio, and product composition.

Use h0 + V0^2/2 for inlet total enthalpy. Derive V0 from ambient gamma and gas constant.
Use an isentropic state relation for ideal total pressure, then apply declared inlet pressure losses.
Use enthalpy differences for compressor, turbine, mixer, and nozzle energy balances.
Preserve product composition through frozen components. Perform equilibrium only where the model explicitly requires it.
Report every shaft work residual in J/kg of core air, with the corresponding mass-flow basis.

The nozzle must select a declared convergent or convergent-divergent geometry model.
For a convergent nozzle, solve the sonic condition from local sound speed and the energy equation.
For an expanded nozzle, retain geometry and ambient pressure independently.
Define thermal and propulsive efficiencies using a documented control volume and residual pressure-energy treatment.
Retain typed failures until those definitions close consistently.

Cantera provides mass-based enthalpy, HP/SP state setters, and explicit composition controls.
See the [Cantera 3.2 phase API](https://www.cantera.org/3.2/python/importing.html).
These capabilities support implementation. They do not validate an engine model.

## Ordered implementation gates

| Gate | Owned scope | Acceptance evidence |
| --- | --- | --- |
| GT-A complete | Isolated thermodynamic state helpers; see EA06_GT_A.md | Exact stream masses, constant composition, element conservation, no shared mutable solution |
| GT-B complete | Freestream and frozen nozzle energy; see EA06_GT_B.md | Constant-cp analytic checks, energy residuals, choking continuity, pressure limits |
| GT-C complete | Methane burner and ramjet path; see EA06_GT_C.md | Bounded fuel root, energy closure, frozen-product transport, explicit fuel identity |
| GT-D complete | Compressor and turbine paths; see EA06_GT_D.md | Isentropic limit and measured HP/LP shaft residuals |
| GT-E complete | Mixers and afterburners; see EA06_GT_E.md | Mass, element, and enthalpy closure across each stream |
| GT-F complete | All selected methane research architectures have API/UI support. See EA06_CLOSEOUT.md | Explicit model choice, compatible saved inputs, exports, and regression checks |

GT-A through GT-F are complete as of 2026-09-09. See EA06_CLOSEOUT.md for current evidence and retained model limits.
For numerical identities, start with absolute 0.1 J/kg plus relative 1e-6 of the energy scale.
This tolerance is a numerical acceptance criterion, not a physical accuracy claim.
Independent station, fuel, and thrust data with declared uncertainty remain required before model validation.

## Historical proposal verification

The four diagnostic tests pass. The six-case audit completes with finite JSON and preserved failure diagnostics.
Production physics and frontend code did not change. The full backend and frontend suites were not repeated.
The previous production baseline remains 226 backend tests passed, with two known warnings.
