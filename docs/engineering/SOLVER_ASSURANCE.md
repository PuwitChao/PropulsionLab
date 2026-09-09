# Solver Assurance Contract

Schema version: 1.0. Scope: EA-01 through EA-03.

`core/solver_result.py` defines `SolverResult`, `SolverAssurance`, and shared constructors.
Existing numerical keys remain at the result root. The additive `status` and `assurance` keys describe their interpretation.
Callers must inspect status before accepting metrics. A successful HTTP request does not establish a valid engineering design.

## Result fields

| Field | Meaning |
| --- | --- |
| status | Computational outcome, domain failure, or missing validation coverage |
| solver | Model name, implementation revision, and approximation label |
| convergence | Measured residuals and termination, or null for non-iterative paths |
| physical_valid | True when implemented checks pass, false when they fail, null when not established |
| applicability | Model-domain checks and separately recorded validation coverage |
| inputs_si | Requested inputs and numerical controls, with SI physical values |
| assumptions | References to the assumption registry |
| warnings | Explicit limitations or unavailable calculations |
| validation | Evidence classification and references; currently unvalidated |
| uncertainty | Null until quantified. Null does not mean zero uncertainty |
| request_id | API correlation ID, attached by the gateway |
| diagnostic_outputs | Invalid intermediate values retained for engineering review, when available |

`OUTSIDE_VALIDATED_DOMAIN` currently means no established validated coverage for the result.
`within_validated_domain=null` distinguishes unknown coverage from a demonstrated domain violation.
Do not interpret this status as an accuracy estimate.

## Outcome precedence

Input, domain, dependency, and numerical exceptions stop the affected calculation.
Multispool iteration exhaustion raises `ConvergenceError` before nozzle/performance calculations.
Nonpositive thrust produces `INFEASIBLE` and null TSFC.
An efficiency bound violation produces `NUMERICAL_FAILURE`. Efficiency and TSFC become null, with raw values in diagnostic metadata.
Remaining calculations use `OUTSIDE_VALIDATED_DOMAIN` until independent evidence defines a validated domain.
Warnings never replace an existing failure status.

## Multispool convergence

Define all work per kilogram of core inlet air.

```text
W_HP_supply = (1+f) * cp_HP(final midpoint) * (Tt4-Tt45) * eta_mech_hp
W_LP_supply = (1+f) * cp_LP(final midpoint) * (Tt45-Tt5) * eta_mech_lp
W_HP_demand = W_HPC
W_LP_demand = W_LPC + (1+BPR)*W_fan
R = W_supply - W_demand
```

Reevaluate properties at the updated state. Do not reuse the previous update denominator to manufacture a zero residual.
Require `abs(R) <= absolute_tolerance + relative_tolerance*abs(W_demand)` on both spools.
Also require relative temperature changes within `relative_tolerance`.
Defaults are 50 iterations, relative tolerance 1e-6, and absolute tolerance 0.1 J/kg core air.
The absolute term permits a zero-demand spool without division by zero.
These tolerances control the approximate numerical model. They do not specify real-engine accuracy.

Off-design convergence metadata describes only the turbine efficiency estimate.
It does not claim convergence of a fixed-geometry engine match.

## Sweeps and compatibility

Cycle, sensitivity, rocket O/F, altitude, and throttle results retain requested points.
Expected failures carry status, original point inputs, and null performance metrics.
Unexpected programming errors remain sanitized server failures rather than ordinary rejected points.
Charts use gaps for unavailable metrics. JSON exports retain all outcomes and metadata.

Deliberate changes: invalid TSFC is null; off-design TSFC is kg/(N*s); atmosphere requests above 47 km fail explicitly.
Rocket `pe` is design exit pressure. New `pa` is independent ambient pressure, with a sea-level default.
Rocket altitude requests accept `pe` and default to a maximum altitude of 47 km.
Legacy calls with matching sea-level exit/ambient pressures retain their pressure interpretation.
Non-sea-level callers must now set ambient pressure explicitly.

Mission, diagnostics, and MoC response migrations remain later work.

## EA-04 update

EA-04: mission, Breguet, and diagnostics expose assurance metadata. Diagnostics use diagnostic_status for threshold observations and status for solver assurance.
See [EA-04 evidence](EA04_REPORT.md).
