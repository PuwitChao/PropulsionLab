# EA-06 rocket reactant contract

Date: 2026-09-08. Scope: exact mixture mass ratios and reference conditions.

## Corrected behavior

O/F is oxidizer-stream mass divided by total fuel-stream mass.
The fuel stream includes its impurity mass. Engine sizing uses the same definition.
For a unit fuel-stream mass, the pure fuel mass is 1-f and the impurity mass is f.
The oxidizer mass is O/F. Species masses are added when the impurity overlaps a fuel or oxidizer species.
Cantera TPY normalizes these masses. Equivalence ratio is calculated from the resulting state with explicit mass-based stream compositions.
Rounded stoichiometric constants no longer determine the requested mixture.
A nonzero impurity fraction without a species now returns a typed input error.

The previous code also passed impurity mass fractions to an interface whose default basis is mole fractions.
See the [Cantera 3.2 thermochemistry API](https://www.cantera.org/3.2/python/importing.html).

The additive `reactants` result records temperature, pressure, phase, mechanism, stream definition, mass fractions, and specific enthalpy.
These fields describe the initial unburned mixture. They are not equilibrium product fractions.

## Matched reference conditions

Use these conditions before a chemistry discrepancy can represent model accuracy:

| Condition | Current solver | Required comparison agreement |
| --- | --- | --- |
| Reactant temperature and phase | 300 K ideal-gas reactants | Same inlet enthalpy and phase, or an explicit enthalpy conversion |
| Pressure | Requested chamber stagnation pressure in Pa | Same pressure and chamber model |
| Mixture | Exact total-stream mass ratio, with declared impurities | Same species masses and surrogate definition |
| Fuel surrogate | RP1 uses propane | Same surrogate, without claims about actual kerosene |
| Product set | GRI30 species | Same allowed species, phases, and thermochemical data, or documented differences |
| Chamber closure | Adiabatic HP equilibrium | Same energy balance and equilibrium constraints |
| Nozzle | SP expansion with shifting or frozen composition | Same composition mode and pressure or area constraint |
| Performance losses | Existing divergence and friction factors | Compare ideal quantities first, then identical loss assumptions |

NASA CEA Example 8 uses cryogenic liquid reactants. It remains incompatible with this 300 K gas model.
The existing frozen reference case remains unchanged. No liquid-reactant capability or validated rocket domain is claimed.

## Acceptance and next step

Tests check requested O/F against initial species mass fractions and output mass flows.
Tests also check chamber enthalpy conservation, impurity mass basis, overlapping species, and missing impurity species.
Next: propose the gas-turbine composition correction and test station energy conservation, including the ramjet discrepancy.
Broader rocket throat, thermal, structural, and nozzle upgrades remain separate EA-06 slices.

## Verification evidence

All 226 backend tests passed in 95.54 seconds. The eight focused reactant tests also passed separately.
Two warnings remain: Starlette/httpx deprecation and Cantera temperature below the mechanism range during a sweep.
The independent runner records nine passes and one incompatible case in EA06_ROCKET_COMPARISONS.json.
No frontend code changed. Frontend checks were not repeated.

Cantera 3.2 reproduces the previous H2/O2 mass ratio as 5.996986326 for a request of 6.0.
The previous CH4/O2 mass ratio is 3.490400798 for a request of 3.5.
The corrected initial mass fractions match both requested ratios to a relative test tolerance of 1e-12.
