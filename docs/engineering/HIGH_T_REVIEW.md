# Rocket high-temperature thermochemistry

Date: 2026-09-14. Status: implemented and verified locally. Physical qualification remains open.

## Finding and correction

The previous H2/O2 default chamber reached 3641 K with gri30.yaml, beyond the 3500 K limits of its hydrogen/oxygen species.
Methane and propane cases also exceeded species limits. The previous common mechanism upper limit was 3000 K, set by CH3O.
RocketAnalyzer now uses the bundled gri30_highT.yaml dataset. Its common species temperature interval is 300-5000 K.
The dataset header identifies high-temperature polynomials based on NASA TM-4513.
HIGH_T_DATASET.json records the Cantera version and exact dataset hash.
Cantera documents the [species thermodynamic models](https://cantera.org/3.2/reference/thermo/species-thermo.html) and their temperature intervals.

GasState now carries a mechanism identifier. Frozen-state reconstruction uses that identifier instead of an unconditional gri30.yaml load.
Rocket chamber, exit, and throat calculations therefore use consistent thermodynamic data.
Gas-turbine state defaults remain gri30.yaml. No global mutable Cantera solution is introduced.
Reactant metadata and assurance exports identify the actual rocket dataset.

The shared temperature check rejects states below or above the common interval with ModelDomainError.
Rocket checks include reactants, chamber, exit, and throat states. High-temperature frozen-state snapshots also enforce the interval.
Existing API error handling preserves failed sweep points with null performance values.
The checks cover exposed states and explicit frozen trials. They do not constrain Cantera's internal equilibrium iterations.
Conservative rejection of an intermediate state can exclude a case whose final equilibrium might lie within the interval.

## Verification

- Original focused rocket and gas-state tests: 26 passed with warnings treated as errors.
- New boundary/provenance tests plus reference tests: 26 passed with warnings treated as errors.
- Independent reference report: 12 PASS and 1 INCOMPATIBLE cryogenic negative control.
- Targeted rocket browser and export test: 1 passed.
- Full backend regression: 326 passed in 359.22 seconds with warnings treated as errors.

The new tests cover both exact endpoints, both outside limits, the frozen sonic residual, and direct property reconstruction.
They verify that the gas-turbine default remains unchanged and rocket exports name the actual mechanism.
The existing mass and throat tests still pass. Frozen CEA values and comparison tolerances remain unchanged.
HIGH_T_COMPARISONS.json retains all comparison metrics and source hashes.

## Remaining limits

A species data interval is not a physically validated operating envelope.
The broader thermodynamic dataset does not validate transport properties, reaction rates, Bartz heat transfer, or structural estimates.
The shifting throat still uses an approximate critical pressure. It is not a solved equilibrium sonic state.
Gas-turbine temperature-domain policy remains separate from this rocket change.
Cryogenic reactants, independent experimental uncertainty, and operational qualification remain open.

## Reproduce

```powershell
.venv\Scripts\python.exe -m pytest tests/ -q -W error
.venv\Scripts\python.exe tools/validate_references.py --output docs/engineering/HIGH_T_COMPARISONS.json
```

Next: review the shifting-throat sonic formulation before extending independent CEA nozzle comparisons.
The user authorized commit and push on 2026-09-14. Remote CI must verify the resulting revision.
