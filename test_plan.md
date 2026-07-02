# Test Plan - Platform Railguarding & Boundary Validation

This test plan defines the boundary verification, input constraint validation, and exception-handling checks required to ensure the Propulsion Lab suite handles edge cases robustly without crashing.

## Acceptance Criteria
1. All out-of-bounds parameters supplied to backend endpoints must be rejected at the API gateway layer with standard validation errors (HTTP 422) instead of raising unhandled server exceptions (HTTP 500).
2. The frontend sliders and input fields must restrict user parameters to safe operational ranges, preventing out-of-bound requests under normal operation.
3. API failures (e.g., solver timeouts, non-convergence in chemical equilibrium, or network failures) must be intercepted gracefully by the UI, displaying helpful inline error banners rather than collapsing the page.
4. Any runtime rendering failures in frontend submodules must be isolated by the `ErrorBoundary` container, presenting a module reset option instead of a blank white screen.

## Test Matrix

| ID | Component / Flow | Type | Test Steps & Inputs | Expected Behavior / Output | Pass Criteria |
|---|---|---|---|---|---|
| **TS-01** | Gas Turbine PRC | Boundary (Min) | POST `/analyze/cycle` with `prc = 1.0` (limit is `ge=1.1`). | Returns HTTP 422 validation error showing PRC out of range. | Error code is 422 |
| **TS-02** | Gas Turbine PRC | Boundary (Max) | POST `/analyze/cycle` with `prc = 85.0` (limit is `le=80.0`). | Returns HTTP 422 validation error showing PRC out of range. | Error code is 422 |
| **TS-03** | Gas Turbine TIT | Boundary (Max) | POST `/analyze/cycle` with `tit = 2800.0` (limit is `le=2500`). | Returns HTTP 422 validation error showing TIT out of range. | Error code is 422 |
| **TS-04** | Rocket Propellant | Negative | POST `/analyze/rocket` with `propellant = 'WATER'`. | Returns HTTP 422 validation error showing unsupported propellant. | Error code is 422 |
| **TS-05** | Rocket Altitude | Boundary (Min) | POST `/analyze/rocket/altitude` with `alt_max = -100` | Rejected with HTTP 422. | Error code is 422 |
| **TS-06** | Diagnostics TT2 | Boundary (Max) | POST `/analyze/diagnostics` with `tt2 = 600.0` | Rejected with HTTP 422. | Error code is 422 |
| **TS-07** | Frontend Error Boundary | Crash Resilience | Force a mock javascript crash inside a page component. | Error is isolated by `ErrorBoundary` with a Reset option. | Screen doesn't go blank |

## Verification Plan

### Automated Execution
- Run `pytest tests/ -v` to check boundary test cases already integrated in `test_api.py`.
- Run a boundary test script `python tools/audit_edge_cases.py --fuzz` to search for unhandled NaN/Inf responses.
