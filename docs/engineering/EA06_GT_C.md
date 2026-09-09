# EA-06 GT-C: methane burner and ramjet research path

Date: 2026-09-08. Status: complete.

## Model contract

`core/gas_turbine/methane.py` provides an explicit pure-methane research model.
The legacy API solver does not call this module. API model selection remains GT-F work.

`methane_burner` accepts an O2/N2 air state, burner pressure, target temperature, fuel temperature, and heat loss.
Heat loss is measured in J/kg of inlet air. Fuel defaults to 300 K.
The solver uses GRI30 formation enthalpies. It does not add a separate LHV.
The energy equation is (1+f)*h_products - h_air - f*h_fuel + heat_loss = 0.
At each fuel ratio, TP equilibrium determines products at the requested temperature and pressure.
The fuel root is bounded between zero and the mechanism-derived stoichiometric mass ratio.
Only a bracketed lean solution is accepted. Rich solutions are outside this model contract.
No pressure gain or temperature decrease is accepted in the active burner.
The root reports energy and element residuals, iteration count, and product composition.
Its tolerance is 0.1 J/kg plus 1e-6 times the larger inlet enthalpy magnitude or cp*T scale.

`methane_ramjet` connects the GT-B inlet, this burner, and the GT-B frozen convergent nozzle.
Inlet pressure recovery is an explicit input. Its default is ideal recovery, not an empirical inlet prediction.
Burner and nozzle pressure losses default to 6% and 2%.
The calculation basis is 1 kg/s of inlet air. Exit mass flow is 1+f kg/s.
Pressure thrust uses the exit area calculated from this mass flow and nozzle mass flux.
Fuel injection has no axial momentum contribution. Products remain frozen through nozzle expansion.

Results identify CH4 and the research model. They include all component states and residuals.
Positive-thrust results remain OUTSIDE_VALIDATED_DOMAIN. Nonpositive thrust returns INFEASIBLE and no TSFC.
Thermal, propulsive, and overall efficiencies remain null with an explicit warning.
The pressure-energy control volume still requires review. Energy closure alone does not establish a bounded propulsive efficiency definition.
No Jet-A capability or independently validated operating domain is claimed.

## Acceptance evidence

Seven focused tests pass. They cover burner energy and elements, reacted products, added heat loss, invalid targets, root exhaustion, and ramjet mass/momentum.
The integrated test also checks frozen product transport and inlet energy closure.
`EA06_GT_C_EVIDENCE.json` records the sea-level Mach 3 case at 2200 K with 0.8 inlet pressure recovery and source hashes.

## Next gate

GT-D adds compressor and turbine paths with isentropic limits and measured shaft work residuals.
GT-E mixers and afterburners, GT-F interface adoption, and the pressure-energy efficiency definition remain open.
EA-06 remains in progress.

A separate HP equilibrium inversion recovers 1800.000444 K for the 1800 K burner target at 0.9 MPa.
This cross-check uses the same GRI30 data. It is numerical consistency evidence, not independent physical validation.

Full regression: 262 backend tests pass in 104.32 seconds.
Two existing warnings remain: Starlette/httpx deprecation and a rocket sweep temperature below the mechanism range.
Frontend code did not change. Frontend checks were not repeated.
