# EA-06 mission coupling and diagnostic uncertainty

Date: 2026-09-09. Status: supplied-data contracts and selected numerical implementations complete.

## Installed-engine deck cruise

POST `/analyze/mission/cruise-deck` accepts a named source, explicit SI units, increasing altitude/Mach axes, thrust and TSFC grids, and cruise segments.
The grid order is altitude rows then Mach columns. Interpolation is bilinear and extrapolation is rejected.
Thrust is total installed available thrust in N. TSFC is kg/(N*s), assumed applicable at the demanded segment thrust.
No design-point solver is silently treated as a fixed-geometry off-design engine deck.

Each segment holds altitude and Mach constant. The supplied polar is CD=CD0+k*CL^2.
For level flight, drag D=A+B*m^2, where A=q*S*CD0 and B=k*g^2/(q*S).
The integrator solves dm/dt=-TSFC*(A+B*m^2) analytically for each segment.
It uses a linear solution when B=0, a reciprocal solution when A=0, and a tangent solution otherwise.
Initial segment drag is the maximum over that segment because mass decreases. It must not exceed the deck's available thrust.
Mass, distance, fuel, point values, and source identity remain in the result.

Tests compare constant-drag fuel with its analytic value, verify interpolation, and reject thrust deficits and extrapolation.
These synthetic cases verify the interface and equation. They do not validate an aircraft or engine.
No climb, descent, wind, reserves, dry-mass constraint, or mission optimization is included.
A future flight-data comparison needs a matched polar, installed engine deck, segment conditions, and measurement uncertainty.

## Telemetry covariance

POST `/analyze/diagnostics` optionally accepts `input_covariance`.
The fixed input order is pt2, tt2, pt3, tt3, pt4, tt4, pt5, tt5, gamma_c, gamma_t.
Entries use the products of corresponding SI units. A pressure-temperature covariance therefore has units Pa*K.
The output order is eta_c, eta_t, and dp_b. The pressure-loss metric uses percent, so its standard uncertainty uses percentage points.

The implementation evaluates sensitivity coefficients with complex-step derivatives and propagates C_out=J*C_in*J^T.
It follows the first-order propagation model described in [NIST TN 1297 Appendix A](https://www.nist.gov/pml/nist-technical-note-1297/nist-tn-1297-appendix-law-propagation-uncertainty).
The matrix must be finite, symmetric, and positive semidefinite. Zero-variance entries require zero covariance rows.
No sensor variance is invented when covariance is absent. Unknown uncertainty remains unknown.

Tests compare an analytic pressure-loss variance and cancellation under a perfectly correlated scale error.
The result identifies measurement-only standard uncertainty, input/output ordering, sensitivity matrix, and covariance.
No coverage factor or confidence probability is inferred. Large uncertainties or nonlinear boundary effects require a separate assessment.
Operating-point baselines, model-form uncertainty, and fault labels remain absent.
The existing threshold screen therefore remains uncalibrated and is not a safety or mechanical-fault verdict.

## Deferred validation

Production aircraft predictions require an actual installed deck and flight evidence.
Fault identification requires simultaneous calibrated telemetry, covariance, a healthy operating-point baseline, and labeled faults.
Those datasets are not replaced with synthetic tests. Their acquisition remains explicit follow-up work.
