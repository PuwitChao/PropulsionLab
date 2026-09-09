"""Typed solver failures with safe public details."""


class SolverError(ValueError):
    status = 'INFEASIBLE'
    http_status = 422
    code = 'physical_infeasibility'

    def __init__(self, message, **details):
        super().__init__(message)
        self.details = details


class InputValidationError(SolverError):
    code = 'invalid_configuration'


class PhysicalInfeasibilityError(SolverError):
    pass


class ModelDomainError(SolverError):
    status = 'OUTSIDE_MODEL_DOMAIN'
    code = 'model_domain'


class UnsupportedModelError(SolverError):
    status = 'UNSUPPORTED'
    code = 'unsupported_model'


class ConvergenceError(SolverError):
    status = 'NO_CONVERGENCE'
    http_status = 409
    code = 'no_convergence'


class NumericalError(SolverError):
    status = 'NUMERICAL_FAILURE'
    http_status = 409
    code = 'numerical_failure'


class ThermochemistryError(NumericalError):
    code = 'thermochemistry_failure'


class DependencyError(SolverError):
    status = 'DEPENDENCY_FAILURE'
    http_status = 503
    code = 'dependency_failure'
