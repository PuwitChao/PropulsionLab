# EA-06 rocket model selections and evidence

Date: 2026-09-09. Status: selected consistency corrections and bounded model proposals complete.

## Selected corrections

The earlier reactant correction enforces exact stream mass ratios and records inlet composition and enthalpy.
The current throat correction uses c_star=Pc/(rho_star*V_star).
Area ratio uses the same throat mass flux divided by exit mass flux.
Consequently, throat area, exit area, mass flow, and c-star share one continuity equation.
The old constant-gamma c-star remains a labeled comparison output, not the sizing value.

Frozen mode now uses the GT-B frozen sonic root. The divergent-nozzle pressure check uses that root's critical pressure.
Shifting mode retains chamber-gamma throat pressure followed by equilibrium at that pressure.
Its mass flux is consistent, but its throat is not a solved equilibrium sonic state.
Results expose the throat method and frozen sonic residual. No shifting sonic accuracy claim is made.
[NASA's thrust equations](https://www.grc.nasa.gov/WWW/K-12/BGP/rktthsum.html) support the pressure/momentum interpretation.
Tests verify continuity independently through both areas for frozen and shifting modes.

## Chemistry benchmark decision

CEA Example 8 remains incompatible because it starts with cryogenic liquid reactants.
The current model uses 300 K gas reactants and GRI30 products. No phase or enthalpy agreement is assumed.
A future matched benchmark must control reactant enthalpy, species set, mass ratio, pressure, and frozen/shifting conventions.
The RP1 option remains a propane surrogate. It is not a validated kerosene model.

## Thermal proposal

The existing Bartz-style model retains synthetic thermal stations and prescribed wall conditions.
Do not adjust its coefficient to fit unrelated results.
The proposed validation uses measured local heat-transfer data at matched chamber pressure, throat curvature, wall temperature, transport properties, and axial location.
First reproduce the original correlation's unit convention. Then compare local coefficients and heat flux without parameter fitting.
[NASA's experimental Bartz comparison](https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/19690030691.pdf) identifies an appropriate primary-source benchmark family.
The workspace does not contain a transcribed, matched geometry/wall-state dataset from that report.
Cooling-channel extensions and calibrated heat-flux predictions remain later scope, as the master plan requires.

## Structural proposal

The current thin-wall estimate and engine-mass multiplier remain conceptual outputs.
A pressure-only benchmark can verify hoop stress sigma=Pr/t for an explicitly thin cylindrical wall.
It cannot qualify an engine mass estimate or a hot wall.
Before selecting a structural upgrade, supply geometry, temperature-dependent material allowables, joints, boundary conditions, and load combinations.
Then verify pressure stress and thermal stress separately before any coupled qualification claim.
No material allowable or safety factor is changed without those inputs.

## Nozzle contour proposal

The current planar characteristic net maps to axisymmetric area. It does not include the radial source terms of an axisymmetric flow solution.
Existing 12/24/48/96-resolution evidence measures discretization trends only.
The next contour benchmark must provide wall coordinates, gamma, exit Mach, throat convention, and characteristic resolution from an independent solution.
Full axisymmetric MoC remains explicit later scope in the master plan.
The present correction does not alter the contour or claim a new accuracy bound.

## Disposition

Mass-ratio and throat-continuity corrections are selected and implemented.
Matched cryogenic chemistry, thermal calibration, structural qualification, and full axisymmetric contours are not selected without the required data.
These remain named later work, not hidden completion claims or validated operating domains.
