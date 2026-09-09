# Solver Error Taxonomy

Core exceptions derive from `SolverError`, which remains compatible with ValueError callers.
The FastAPI gateway preserves the public message, structured details, solver status, and request ID.

| Exception | Status | HTTP | Use |
| --- | --- | --- | --- |
| InputValidationError | INFEASIBLE | 422 | Invalid scalar or coupled configuration |
| PhysicalInfeasibilityError | INFEASIBLE | 422 | No positive heat addition, expansion, or available work |
| ModelDomainError | OUTSIDE_MODEL_DOMAIN | 422 | Unsupported atmosphere or map condition |
| UnsupportedModelError | UNSUPPORTED | 422 | Required chemical species absent from mechanism |
| ConvergenceError | NO_CONVERGENCE | 409 | Iteration limit reached |
| NumericalError | NUMERICAL_FAILURE | 409 | Arithmetic failure or non-finite result |
| ThermochemistryError | NUMERICAL_FAILURE | 409 | Cantera state/equilibrium failure |
| DependencyError | DEPENDENCY_FAILURE | 503 | Required mechanism cannot load |
| Unexpected exception | Internal error envelope | 500 | Programming/internal failure, sanitized response |

Pydantic validation retains the existing `validation_error` envelope with actionable field details.
HTTP status is separate from a solver status. Partial sweeps use HTTP 200 with per-point failures.
Known finite post-solve physical inconsistencies also use result metadata, so consumers must inspect it.
Successful results carry the request ID inside assurance metadata. Failure envelopes retain it at the root and in the response header.

Do not include dependency tracebacks or internal paths in public errors.
Do not catch all exceptions inside a sweep and label them physical infeasibility.

## EA-04 update

EA-04: invalid diagnostic states return INFEASIBLE without fault labels. Invalid mission points retain null metrics. Breguet rejects ambiguous SFC fields.
See [EA-04 evidence](EA04_REPORT.md).
