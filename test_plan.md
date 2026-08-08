# Test Plan - Modernization & Resilience Hardening (2026-08-09)

## CI Audit Remediation Tests

| ID | Component / Flow | Type | Input / Action | Expected Behavior | Pass Criteria |
|---|---|---|---|---|---|
| CI-AUD-01 | Python dependency audit | Security | Run `.venv\Scripts\python.exe -m pip_audit -r backend\requirements.txt --strict` | No vulnerable Python package resolution | No known vulnerabilities found |
| CI-AUD-02 | Dependency consistency | Regression | Run `.venv\Scripts\python.exe -m pip check` | FastAPI, Starlette, and transitive packages are compatible | No broken requirements |
| CI-AUD-03 | Backend CI test command | Regression | Run `.venv\Scripts\python.exe -m pytest tests\ -v --cov=core --cov-report=term-missing` | Existing API/core behavior remains green | 134 tests pass |
| CI-AUD-04 | Frontend CI gates | Regression | Run `npm run test`, `npm run lint`, `npm run build`, and production npm audit | Frontend remains unaffected by backend dependency fix | All commands pass |

## Acceptance Criteria

1. Unexpected backend failures return a stable safe error envelope with no raw exception text.
2. Validation failures remain HTTP 422 with actionable field details.
3. Every frontend request has a bounded cancellation path and produces a normalized user-safe error.
4. Render failures show a recoverable module fallback without exposing runtime internals.
5. Existing solver behavior remains unchanged for successful requests.

## Test Matrix

| ID | Component / Flow | Type | Input / Action | Expected Behavior | Pass Criteria |
|---|---|---|---|---|---|
| MOD-01 | API validation | Negative | Send an out-of-range cycle request | HTTP 422 with validation details | Status is 422; no 500 |
| MOD-02 | API solver failure | Negative | Force an analyzer exception | HTTP 500 safe envelope | error_code, message, request_id; no exception text |
| MOD-03 | API correlation | Positive | Make two failing requests | Each response carries a request ID | IDs are non-empty and distinct |
| MOD-04 | API malformed result | Boundary | Return non-finite solver values | JSON remains serializable | No Infinity/NaN reaches client |
| MOD-05 | Frontend non-JSON error | Negative | Mock HTML/text 502 response | Normalized status-based error | No JSON parse exception leaks |
| MOD-06 | Frontend timeout | Boundary | Mock a request exceeding timeout | Abort error is normalized | Caller can display retryable message |
| MOD-07 | Frontend success | Happy path | Mock JSON and blob responses | Payload is returned unchanged | Existing callers remain compatible |
| MOD-08 | Render boundary | Negative | Throw during module render | Generic fallback with reset action | Raw error message is not rendered |
| MOD-09 | Regression | Happy path | Run existing solver/API suite | Existing behavior remains green | 134 total tests pass

## Verification Commands

    pytest tests/test_error_handling.py tests/test_api.py -q
    pytest tests/ -q
    cd frontend && npm run lint && npm run build
    cd frontend && npm audit --omit=dev --audit-level=high

The Python audit command is attempted when pip-audit is available; otherwise the limitation is recorded rather than silently treated as a clean audit.

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
