"""Additive solver assurance metadata. Numerical outputs retain their original keys."""

import inspect
import cantera as ct
import math
from functools import wraps
from typing import Any, Literal, TypedDict

SolverStatus = Literal["VALID", "VALID_WITH_WARNING", "OUTSIDE_VALIDATED_DOMAIN",
                       "OUTSIDE_MODEL_DOMAIN", "INFEASIBLE", "NO_CONVERGENCE",
                       "UNSUPPORTED", "NUMERICAL_FAILURE", "DEPENDENCY_FAILURE"]


class SolverAssurance(TypedDict):
    schema_version: str
    status: SolverStatus
    solver: dict[str, Any]
    convergence: dict[str, Any] | None
    physical_valid: bool | None
    applicability: dict[str, Any]
    inputs_si: dict[str, Any]
    warnings: list[str]
    assumptions: list[str]
    validation: dict[str, Any]
    uncertainty: dict[str, Any] | None


class SolverResult(TypedDict):
    """Required additive fields. Numerical output keys remain solver-specific."""
    status: SolverStatus
    assurance: SolverAssurance

from .errors import InputValidationError, NumericalError, SolverError, ThermochemistryError

SCHEMA_VERSION = '1.0'
ACCEPTED_STATUSES = {'VALID', 'VALID_WITH_WARNING', 'OUTSIDE_VALIDATED_DOMAIN'}


def require_finite(value, path='value'):
    if isinstance(value, float) and not math.isfinite(value):
        raise NumericalError('The solver produced a non-finite value.', field=path)
    if isinstance(value, dict):
        for key, item in value.items():
            require_finite(item, f'{path}.{key}')
    elif isinstance(value, (list, tuple)):
        for index, item in enumerate(value):
            require_finite(item, f'{path}[{index}]')


def assurance(name, inputs=None, *, convergence=None, warnings=None, assumptions=None,
              status: SolverStatus = 'OUTSIDE_VALIDATED_DOMAIN', physical_valid=True) -> SolverAssurance:
    return {
        'schema_version': SCHEMA_VERSION,
        'status': status,
        'solver': {'name': name, 'version': 'EA-1', 'fidelity': 'approximate_physics'},
        'convergence': convergence,
        'physical_valid': physical_valid,
        'applicability': {'within_model_domain': True, 'within_validated_domain': None,
                          'violated_limits': [], 'extrapolation': None},
        'inputs_si': inputs or {},
        'warnings': warnings or [],
        'assumptions': assumptions or [],
        'validation': {'level': 'unvalidated', 'references': []},
        'uncertainty': None,
    }


def failed_point(exc, inputs, metrics=()):
    meta = assurance('failed_point', inputs, status=exc.status, physical_valid=None)
    meta['applicability']['within_model_domain'] = False if exc.status == 'OUTSIDE_MODEL_DOMAIN' else None
    meta['warnings'] = [str(exc)]
    meta['failure'] = {'code': exc.code, 'details': exc.details}
    if 'convergence' in exc.details:
        meta['convergence'] = exc.details['convergence']
    return {**inputs, **{key: None for key in metrics}, 'status': exc.status,
            'error': True, 'error_detail': str(exc), 'assurance': meta}


def cycle_result(function):
    """Check cycle input scalars and expose result validity without concealing errors."""
    signature = inspect.signature(function)

    @wraps(function)
    def wrapped(self, *args, **kwargs):
        bound = signature.bind(self, *args, **kwargs)
        bound.apply_defaults()
        inputs = {key: value for key, value in bound.arguments.items() if key != 'self'}
        for key, value in inputs.items():
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                if not math.isfinite(value):
                    raise InputValidationError('Inputs must be finite.', field=key)
                if key.startswith('eta_') or key in {'burner_eta', 'inlet_recovery'}:
                    if not 0 < value <= 1:
                        raise InputValidationError('Efficiency must be in (0, 1].', field=key)
                elif key in {'prc', 'opr', 'fpr', 'lpc_pr'} and value < 1:
                    raise InputValidationError('Pressure ratio must be at least one.', field=key)
                elif key in {'tit', 't4', 'h_fuel', 'ab_temp'} and value <= 0:
                    raise InputValidationError('Temperature and fuel energy must be positive.', field=key)
                elif key in {'bpr', 'phi_inlet'} and value < 0:
                    raise InputValidationError('The input must be nonnegative.', field=key)
                elif key.endswith('dp_frac') and not 0 <= value < 1:
                    raise InputValidationError('Pressure loss must be in [0, 1).', field=key)
        inputs.update(p0_pa=self.p0, t0_k=self.t0, mach=self.m0)
        try:
            result = function(self, *args, **kwargs)
        except SolverError:
            raise
        except ct.CanteraError as exc:
            raise ThermochemistryError('The gas property calculation failed.') from exc
        except (ArithmeticError, OverflowError) as exc:
            raise NumericalError('Cycle arithmetic failed.') from exc
        require_finite(result)
        meta = assurance(function.__name__, inputs, convergence=result.pop('_convergence', None),
                         assumptions=['GT-01: sampled cp and methane/air proxy with specified LHV',
                                      'GT-02: prescribed component losses and approximate mixer'])
        meta['solver'].update(module=function.__module__, method=function.__name__, mechanism='gri30.yaml', cantera_version=ct.__version__)
        if result.get('spec_thrust', 1) <= 0:
            result['tsfc'] = None
            meta.update(status='INFEASIBLE', physical_valid=False)
            meta['warnings'].append('Net thrust is nonpositive. TSFC is unavailable.')
        invalid_efficiencies = {key: result[key] for key in ('eta_thermal', 'eta_propulsive', 'eta_overall')
                                if key in result and not -1e-8 <= result[key] <= 1 + 1e-8}
        if invalid_efficiencies and meta['status'] != 'INFEASIBLE':
            meta.update(status='NUMERICAL_FAILURE', physical_valid=False)
            meta['warnings'].append('Efficiency exceeds physical bounds. Review the approximate energy model.')
            meta['diagnostic_outputs'] = {key: result.get(key) for key in ('spec_thrust', 'tsfc', 'eta_thermal', 'eta_propulsive', 'eta_overall')}
            for key in ('tsfc', 'eta_thermal', 'eta_propulsive', 'eta_overall'):
                result[key] = None
        result.update(status=meta['status'], assurance=meta)
        return result
    return wrapped


def rocket_result(function):
    signature = inspect.signature(function)

    @wraps(function)
    def wrapped(self, *args, **kwargs):
        bound = signature.bind(self, *args, **kwargs)
        bound.apply_defaults()
        inputs = {key: value for key, value in bound.arguments.items() if key != 'self'}
        inputs['pc'] = self.pc
        try:
            result = function(self, *args, **kwargs)
        except ct.CanteraError as exc:
            raise ThermochemistryError('The thermochemistry calculation failed.') from exc
        except ArithmeticError as exc:
            raise NumericalError('Rocket arithmetic failed.') from exc
        require_finite(result)
        meta = assurance('rocket_equilibrium', inputs,
                         warnings=result.pop('_warnings', []),
                         assumptions=['RK-01: Cantera GRI30 reactants at 300 K; surrogate fuel definitions',
                                      'RK-02: frozen sonic root or approximate shifting throat pressure; mass-consistent c-star; fixed nozzle geometry',
                                      'RK-03: prescribed divergence/friction and conceptual thermal/structural estimates'])
        meta['solver'].update(module=function.__module__, method='HP chamber / SP exit', mechanism='gri30.yaml', cantera_version=ct.__version__)
        if result['regime'] == 'Separation Warning':
            meta['status'] = 'OUTSIDE_MODEL_DOMAIN'
            meta['applicability']['within_model_domain'] = False
            meta['applicability']['violated_limits'] = ['Attached-flow assumption: Pe/Pa < 0.35']
            meta['warnings'].append('Separation screening limit exceeded. Attached-flow performance is unavailable.')
            for key in ('isp_delivered', 'cf_delivered', 'thrust_ambient'):
                result[key] = None
        result.update(status=meta['status'], assurance=meta)
        return result
    return wrapped
