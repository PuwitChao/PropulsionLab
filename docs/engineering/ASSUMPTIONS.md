# Assumption Registry

These identifiers connect model records and result descriptions. Not every legacy response emits every identifier.
An assumption is not validation evidence. MODEL_REGISTRY.json owns model coverage and uncertainty state.

| ID | Assumption and effect | Owner and limit |
| --- | --- | --- |
| GT-01 | Sampled cp, unequilibrated methane/air proxy, fixed fuel-equivalence conversion, independently specified LHV | cycle.py. Not a consistent Jet-A combustion-product model |
| GT-02 | Fixed component losses, sampled turbine work, approximate mixed-stream cp*T and lower-pressure mixer | cycle.py. Mixer and high-Mach energy accuracy require later review |
| GT-03 | Mechanical energy flux includes exit kinetic energy and nozzle pressure work | cycle.py `_efficiencies`. Residual bounds screen inconsistencies; high-Mach ramjet limitation remains |
| RK-01 | GRI30 equilibrium with 300 K reactants and configured fuel substitutes | rocket/analyzer.py. Unsupported species fail before chemistry |
| RK-02 | Frozen sonic throat or approximate shifting throat pressure, mass-consistent c-star, and fixed geometry for ambient-pressure changes | rocket/analyzer.py. No separated-flow solution or high-altitude atmosphere extension |
| RK-03 | Fixed divergence/friction losses, Bartz wall temperature, synthetic thermal stations, fixed structural material and mass multiplier | rocket/analyzer.py. Conceptual estimates, not cooling or structural qualification |
| RK-04 | Pe/Pa below 0.35 is a separation screening rule inherited from the existing model | rocket/analyzer.py. Not a universal physical boundary or separation prediction |
| OD-01 | Generic map PR scales to the selected design PR; normalized design flow and speed equal one | off_design.py. No calibrated engine dataset |
| OD-02 | Prescribed throttle-to-speed/flow/TIT schedule and constant-property turbine work estimate | off_design.py. Not fixed-geometry engine matching |
| OD-03 | Bounded empirical compressor/turbine efficiency curves | off_design.py. Bounds define the approximation and do not conceal solver-state failures |
| AT-01 | Four-layer atmosphere, geometric altitude 0-47 km, converted to geopotential height | units.py. Reject extrapolation; detailed atmosphere fidelity remains later work |
| MC-01 | Planar characteristic net mapped to axisymmetric area | rocket/moc.py. No radial source-term integration |
| MS-01 | Parabolic drag polar and local thrust. Ideal ground roll uses lift-off at 1.2 stall speed, zero drag and rolling resistance | mission.py. No obstacle clearance, thrust lapse, or full mission trajectory |
| MS-02 | Constant speed, L/D, and TSFC in Breguet cruise. Mass-flow TSFC is multiplied by g | mission.py. Reserves, climb, descent, and wind are excluded |
| DG-01 | Fixed 84% compressor efficiency, 86% turbine efficiency, and 6% pressure-loss thresholds | diagnostics.py. Uncalibrated screening, not mechanical fault identification |
| DG-02 | Simultaneous stagnation telemetry, adiabatic components, and constant supplied gamma | diagnostics.py. No sensor covariance, heat transfer, or pressure-gain combustor |

Retained numerical controls include bisection limits, interpolation grids, and near-parallel characteristic guards.
`SOURCE_INVENTORY.md` records pre-change locations. The initial audit classifies each category.
No physical fuel, HPC pressure-ratio, turbine-pressure, or atmosphere clamp remains in the corrected paths.
Map efficiency bounds and conceptual heat/structure controls remain explicit approximations.

## EA-04 update

EA-04: takeoff assumes zero drag and rolling resistance, constant thrust, and lift-off at 1.2 stall speed. Diagnostics assume adiabatic components and simultaneous stagnation telemetry.
See [EA-04 evidence](EA04_REPORT.md).

## EA-05 evidence limits

The 0.35 separation threshold lacks a reviewed source in this workspace. Its conservatism is not established.
EA-05 recorded geometric-altitude discrepancies at 10 km and 30 km.
EA-06 corrects the conversion. Both frozen cases now pass. See EA06_COMPARISONS.json.
GRI30 is an ideal-gas thermochemical mechanism. Temperature-dependent properties do not make it a real-gas equation of state.
EA-06 now constructs reactants directly by mass. O/F includes impurity mass in the fuel stream.
Equivalence ratio is a mechanism-derived output. Matched phase, enthalpy, and product species remain prerequisites for CEA comparison.

## EA-06 additions

Methane research models use exact stream masses, formation enthalpies, equilibrium combustion, and frozen component transport.
Map contracts reject extrapolation. They do not replace the legacy prescribed throttle schedule with an engine match.
Deck cruise assumes supplied installed thrust and constant segment TSFC. Measurement covariance propagation excludes model-form uncertainty.
