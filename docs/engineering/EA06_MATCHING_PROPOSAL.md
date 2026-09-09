# EA-06 off-design matching proposal and dimensional map contract

Date: 2026-09-09. Status: contract and numerical benchmark complete. Calibrated engine matching remains later scope.

## Current capability

The existing throttle solver prescribes speed, flow, and temperature. It is not a fixed-geometry engine match.
`core/gas_turbine/map_contract.py` adds explicit dimensional map contracts for future matching.
It requires a source identifier, reference pressure/temperature, declared corrected units, increasing axes, and valid efficiency grids.
Compressor maps use corrected speed and corrected mass flow as axes, with pressure ratio and isentropic efficiency as outputs.
Turbine maps use corrected speed and expansion pressure ratio as axes, with corrected flow and isentropic efficiency as outputs.
Rectangular interpolation rejects extrapolation. Real surge/choke boundaries require a supplied stable-domain mask before engine use.
These helpers do not claim that a rectangle represents a real stable compressor domain.

Define theta=Tt/Tref and delta=Pt/Pref. Corrected flow is mdot*sqrt(theta)/delta, and corrected speed is N/sqrt(theta).
Each component uses its own inlet state and the map's reference state. Do not substitute normalized design fractions for dimensional corrected values.
[NASA/TM-2007-214690](https://ntrs.nasa.gov/api/citations/20070018165/downloads/20070018165.pdf) describes map relationships and scaling, including the limits of transferring a component map to an engine.
The current contract does not calibrate a map or justify scaling.

## Proposed fixed-geometry match

For a single shaft, solve actual shaft speed N, inlet mass flow mdot, and turbine expansion ratio PRt.
At each trial, obtain compressor PR and efficiency from the supplied compressor map.
Use the GT state, burner, and turbine helpers to compute station states and component work.
Use the turbine map at its corrected speed and PRt to obtain flow capacity and efficiency.
Use the specified nozzle throat area, not an area derived from the trial mass flow.

The three residuals are:

1. Turbine delivered shaft power minus compressor demand and accessory power, in W.
2. Actual turbine corrected flow minus mapped corrected flow, in kg/s.
3. Actual nozzle mass flow minus throat area times computed mass flux, in kg/s.

Use separately scaled residuals. Require all residuals to meet declared tolerances at the final state.
Reject extrapolation, unstable map regions, nonpositive temperatures, and insufficient nozzle expansion.
A converged numerical root does not establish a stable engine operating point.
Multi-shaft matching requires one speed and shaft residual per independent shaft, plus compatible flow and geometry equations.

## Evidence and selection decision

Tests verify an analytic corrected-unit case and a bilinear map point. They reject extrapolation and missing unit declarations.
The reference tests are synthetic interface benchmarks. They are not a calibrated map dataset.
No matched compressor/turbine map pair, engine throat area, accessory load, or measured operating line is supplied in this workspace.
Therefore, a production fixed-geometry matching upgrade is not selected in EA-06.
This follows the master plan's explicit later scope for calibrated maps.
Do not relabel the existing prescribed throttle schedule as matched performance.

## Required next evidence

Acquire a consistent engine dataset with component station definitions, map units, geometry, stable boundaries, and measured uncertainty.
Freeze one measured design point and at least two independent off-design points before implementation selection.
Use one point for calibration and reserve the other points for validation. Report both residuals and output discrepancies.
