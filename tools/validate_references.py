"""Run frozen independent comparisons without changing solver parameters or reference values."""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import platform
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from core.units import isa_atmosphere
from core.rocket.moc import MoCNozzle
from core.gas_turbine.mission import MissionAnalyzer
from core.solver_result import require_finite

RECORDS = ROOT / 'docs' / 'engineering'


def evaluate(case):
    inputs = case['inputs']
    if case['adapter'] == 'atmosphere':
        p, t, rho = isa_atmosphere(inputs['altitude_m'], altitude_kind=case['reference_convention'])
        return dict(pressure_pa=p, temperature_k=t, density_kg_m3=rho)
    if case['adapter'] == 'prandtl_meyer':
        solver = MoCNozzle(gamma=inputs['gamma'], mach_exit=inputs['mach'])
        return {'angle_deg': math.degrees(solver.prandtl_meyer(inputs['mach']))}
    if case['adapter'] == 'moc_area':
        params = {k: v for k, v in inputs.items() if k != 'subdivisions'}
        solver = MoCNozzle(**params)
        _, radii = solver.solve_contour(inputs['subdivisions'])
        return {'area_ratio': (radii[-1] / inputs['throat_radius'])**2}
    raise ValueError(f"Unknown reference adapter: {case['adapter']}")


def compare(case):
    result = {'id': case['id'], 'model': case['model'], 'reference': case['reference'],
              'kind': case['kind'], 'locator': case['locator'], 'inputs': case['inputs'],
              'tolerance_basis': case['tolerance_basis'], 'purpose': case['purpose']}
    if case['kind'] == 'incompatible_reference':
        return {**result, 'status': 'INCOMPATIBLE', 'reason': case['reason'],
                'reference_values': case['reference_values'], 'metrics': {}}
    try:
        if not case['expected']:
            raise ValueError('A comparable case requires at least one reference metric.')
        for field, expected in case['expected'].items():
            tolerance = case['tolerances'][field]
            if not math.isfinite(expected) or any(not math.isfinite(tolerance[k]) or tolerance[k] < 0 for k in ('absolute','relative')):
                raise ValueError('Reference values and nonnegative tolerances must be finite.')
        actual = evaluate(case)
        require_finite(actual)
        metrics = {}
        for field, expected in case['expected'].items():
            tolerance = case['tolerances'][field]
            limit = tolerance['absolute'] + abs(expected) * tolerance['relative']
            delta = actual[field] - expected
            metrics[field] = {'expected': expected, 'actual': actual[field], 'difference': delta,
                              'relative_difference': delta / expected if expected else None,
                              'absolute_limit': limit, 'within_tolerance': abs(delta) <= limit}
        status = 'PASS' if all(m['within_tolerance'] for m in metrics.values()) else 'DIFFERENCE'
        return {**result, 'status': status, 'metrics': metrics}
    except Exception as exc:
        # A comparison report must retain unexpected errors. It must never convert them into passes.
        return {**result, 'status': 'ERROR', 'error_type': type(exc).__name__, 'reason': str(exc), 'metrics': {}}


def numerical_studies():
    contours = []
    for subdivisions in (12, 24, 48, 96):
        solver = MoCNozzle(gamma=1.4, mach_exit=2, throat_radius=.1)
        _, radius = solver.solve_contour(subdivisions)
        contours.append({'subdivisions': subdivisions, 'length_m': solver.length,
                         'exit_area_ratio': (radius[-1] / .1)**2})
    for previous, current in zip(contours, contours[1:]):
        current['length_change_fraction'] = current['length_m'] / previous['length_m'] - 1
        current['area_change_fraction'] = current['exit_area_ratio'] / previous['exit_area_ratio'] - 1
    model = MissionAnalyzer({})
    ranges = []
    for factor in (.99, 1, 1.01):
        result = model.calculate_breguet_range(.78, 11000, l_over_d=16,
                    w_initial=75000, w_final=45000, tsfc_kg_per_n_s=15e-6*factor)
        ranges.append({'tsfc_factor': factor, 'range_km': result['range_km']})
    return {'moc_resolution': {'inputs': {'gamma':1.4,'mach_exit':2,'throat_radius_m':.1},
                'rows': contours, 'interpretation':'Successive resolution differences only. No validated discretization or physical error bound.'},
            'breguet_sensitivity': {'rows': ranges, 'interpretation':'The 1% input perturbation is illustrative, not measured input uncertainty.'}}


def build_report():
    registry = json.loads((RECORDS / 'MODEL_REGISTRY.json').read_text(encoding='utf-8'))
    cases = json.loads((RECORDS / 'REFERENCE_CASES.json').read_text(encoding='utf-8'))['cases']
    results = [compare(case) for case in cases]
    hashes = {}
    paths = {model['owner'] for model in registry['models']}
    paths.update({'core/gas_turbine/thermo.py', 'core/solver_result.py',
                  'tools/validate_references.py', 'docs/engineering/REFERENCE_CASES.json',
                  'docs/engineering/MODEL_REGISTRY.json'})
    for relative in sorted(paths):
        hashes[relative] = hashlib.sha256((ROOT / relative).read_bytes()).hexdigest()
    import cantera
    report = {'schema_version':'1.0', 'generated_utc':datetime.now(timezone.utc).isoformat(),
              'runtime':{'python':platform.python_version(),'cantera':cantera.__version__},
              'source_sha256':hashes, 'summary':dict(Counter(r['status'] for r in results)),
              'results':results, 'studies':numerical_studies(),
              'validated_domains':{model['id']:model['validated_domains'] for model in registry['models']},
              'release_validation_ready':False,
              'release_reason':'Independent operational validation and justified output uncertainty are absent. See MODEL_REGISTRY.json.'}
    require_finite(report)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=RECORDS/'CURRENT_COMPARISONS.json')
    args = parser.parse_args()
    output = args.output.resolve()
    if not output.is_relative_to(ROOT):
        parser.error('The output must remain inside the workspace.')
    report = build_report()
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(json.dumps(report['summary'],sort_keys=True))
    print(f'Report: {output}')
    print('Independent operational validation: NOT ESTABLISHED')
    return 1 if any(row['status'] in {'DIFFERENCE','ERROR'} for row in report['results']) else 0


if __name__ == '__main__':
    raise SystemExit(main())
