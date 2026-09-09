# Equation Traceability

This registry extends the baseline equation inventory. Values use SI unless a field names another unit.

| ID | Equation and definitions | Code | Verification |
| --- | --- | --- | --- |
| EQ-03 | R_HP/LP = supplied shaft work minus compressor/fan demand, J/kg core air | cycle.py multispool loop | `test_multispool_final_work_residuals`, exhaustion test |
| EQ-04 | Pt/Pa at choking = ((gamma+1)/2)^(gamma/(gamma-1)) for a convergent nozzle | thermo.py nozzle_exit | `test_nozzle_choke_identity`, no-expansion cases |
| EQ-05 | TSFC = fuel mass flow / net thrust, kg/(N*s); undefined when thrust <=0 | cycle.py, solver_result.py | `test_negative_thrust_has_no_tsfc`, SI deck identity |
| EQ-07 | F = mdot*Ve + (Pe-Pa)*Ae; Isp = F/(mdot*g) | rocket/analyzer.py | `test_rocket_ambient_changes_only_pressure_thrust` |
| EQ-08 | At = mdot*cstar/Pc; Ae = epsilon*At | rocket/analyzer.py | Fixed-geometry identity and existing mass-flow tests |
| EQ-11 | PR_scaled = 1+(PR_raw-1)*(PR_design-1)/(PR_raw_design-1) | off_design.py map_point | `test_map_anchor_and_surge_boundary` |
| EQ-12 | H=r*z/(r+z), r=6356766 m; lapse/isothermal atmosphere and rho=P/(R*T) within 0-47 km | units.py | Frozen geometric/geopotential tables, layer continuity, and extrapolation rejection |
| EQ-16 | eta_t,is = (1-tau)/(1-tau^(1/eta_t,poly)), tau=T_out/T_in | thermo.py poly_to_isen_turb | `test_turbine_efficiency_from_temperature_ratios` |
| EQ-17 | P_jet = sum(0.5*m*VÂ² + F_pressure*V) - 0.5*m_in*V0Â²; eta_th=P_jet/Q; eta_p=F_net*V0/P_jet | cycle.py `_efficiencies` | Turbofan bounds, ramjet inconsistency test, pressure-work identity |
| EQ-18 | SM=100*((PR_surge/PR_op)*(W_op/W_surge)-1), same corrected speed | off_design.py surge_margin | Zero margin at surge boundary, positive margin above boundary |
| EQ-19 | W_comp=cp*Tt2*(PR^((gamma-1)/gamma)-1)/eta_c,is | off_design.py work helper | Independent turbine work closure test |

EQ-16 follows directly from `tau_is=PR^((gamma-1)/gamma)` and `tau=tau_is^eta_poly`.
The previous implementation returned the reciprocal. The new test evaluates both temperature relations independently.

EQ-17 uses actual nozzle velocity and its pressure-work term. It is an approximate mechanical-energy diagnostic, not a full thermochemical balance.
At the recorded Mach-3 ramjet condition, its propulsive efficiency exceeds one. That result is explicitly unavailable pending model review.

Normalized corrected speed is `N/sqrt(Tt/Tref)` divided by its design value.
Normalized corrected flow is `mdot*sqrt(Tt/Tref)/(Pt/Pref)` divided by its design value.
EA-03 prescribes these normalized quantities directly. It does not recover dimensional flow from an engine map dataset.
The generic map's internal flow reference is 0.576, the peak-efficiency point at normalized speed one.
Its surge and choke coordinates are `0.096*N/0.576` and `0.96*N/0.576`.

## References

[NASA rocket thrust equations](https://www.grc.nasa.gov/WWW/K-12/BGP/rktthsum.html) support EQ-07 and the nozzle pressure/area interpretation.
[NASA specific impulse](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/) supports the Isp definition.
The generic map shape and surge screen are declared model definitions, not calibrated reference data.
The initial audit is historical. The entries below complete the current equation registry.

## EA-04 update

EQ-14 now uses an SI work-energy ground-roll lower bound and explicit Breguet mass-to-weight SFC conversion. EQ-15 now checks telemetry validity before efficiency screening.
See [EA-04 evidence](EA04_REPORT.md).

## Completed equation records for EA-05

| ID | Current equation or algorithm | Units and owner | Evidence and limit |
| --- | --- | --- | --- |
| EQ-01 | eta_c,is = (PR^a - 1)/(PR^(a/eta_c,poly) - 1), a=(gamma-1)/gamma | Dimensionless; thermo.py, cycle.py | Perfect-gas isentropic relation, REF-NACA1135. Sampled gamma does not integrate variable properties. |
| EQ-02 | f = (cp4*T4 - cp3*T3)/(eta_b*LHV - cp4*T4) | f: kg fuel/kg air; cycle.py | Approximate cp*T fuel balance. Composition and reference enthalpy consistency remain unresolved. |
| EQ-06 | Reactant masses: fuel stream=1, oxidizer=O/F; chamber HP equilibrium, nozzle SP equilibrium or frozen composition, Ve=sqrt(2*(hc-he)) | K, Pa, J/kg, m/s; rocket/analyzer.py | Cantera solution consistency. REF-CEA8 is incompatible with current reactant enthalpy. |
| EQ-09 | h = 0.026/Dt^0.2 * (mu^0.2*cp/Pr^0.6) * (Pc/cstar)^0.8 * (Dt/Rc)^0.1, with local corrections; q=h*(Taw-Twall) | W/(m2 K), W/m2; rocket/analyzer.py | Bartz-style implementation. Coefficient pedigree and unit convention require independent review. |
| EQ-09 | t=Pc*r/(yield/SF); chamber_mass=2*pi*r*L*t*rho; engine_mass=3*chamber_mass | m and kg; rocket/analyzer.py | SF=2, fixed density/yield, L*=1 m. No thermal-stress or material qualification. |
| EQ-10 | nu(M)=sqrt((gamma+1)/(gamma-1))*atan(sqrt((gamma-1)/(gamma+1)*(M^2-1)))-atan(sqrt(M^2-1)); planar theta +/- nu invariants | Radians; rocket/moc.py | REF-NACA1135 table comparisons at gamma=1.4, M=1.5 and 2. Contour-area agreement does not validate radial flow. |
| EQ-13 | q=rho*V^2/2; T/W=q*CD0/(W/S)+k*n^2*(W/S)/q+Ps/V, with constraint-specific terms | Pa and dimensionless; mission.py | REF-CONSTRAINTS and tests/test_mission_assurance.py. No installed-engine lapse model. |
| EQ-14 | Ground-roll T/W=1.2^2*(W/S)/(rho0*sigma*g*CLmax*s) | Dimensionless; mission.py | REF-TAKEOFF force balance reduced to declared zero-loss assumptions. Not a field-length model. |
| EQ-14 | R=V*(L/D)*ln(Wi/Wf)/(g*c), with c in kg/(N s); cW=g*c in 1/s | m; mission.py | REF-TSFC, REF-RANGE and independent fuel-balance identity. Cruise segment only. |
| EQ-15 | eta_c=(T2*((P3/P2)^a-1))/(T3-T2); eta_t=(T4-T5)/(T4*(1-(P5/P4)^b)); dp=100*(P3-P4)/P3 | Dimensionless efficiencies and percent loss; diagnostics.py | Perfect-gas definitions and inverse-state test. Threshold classification has no independent fault dataset. |

Reference identifiers resolve in MODEL_REGISTRY.json. All equation IDs EQ-01 through EQ-19 now have current records.
Equation agreement is software verification. It does not create a validated operating domain.
