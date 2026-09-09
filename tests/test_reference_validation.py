"""Independent reference checks and preservation of comparison failures."""
import json
from pathlib import Path
import re
import pytest
from tools import validate_references as validation

ROOT = Path(__file__).resolve().parents[1]
RECORDS = ROOT / 'docs' / 'engineering'
CASES = json.loads((RECORDS / 'REFERENCE_CASES.json').read_text(encoding='utf-8'))['cases']
MATCHED = [c for c in CASES if c['kind'] == 'published_table']


@pytest.mark.parametrize('case', MATCHED, ids=lambda c: c['id'])
def test_independent_matched_reference(case):
    result = validation.compare(case)
    assert result['status'] == 'PASS', result


def test_comparison_preserves_difference(monkeypatch):
    case = next(c for c in CASES if c['adapter'] == 'prandtl_meyer')
    monkeypatch.setattr(validation, 'evaluate', lambda _: {'angle_deg': 90})
    result = validation.compare(case)
    assert result['status'] == 'DIFFERENCE'
    assert result['metrics']['angle_deg']['actual'] == 90
    assert result['metrics']['angle_deg']['expected'] == case['expected']['angle_deg']


def test_comparison_preserves_nonfinite_failure(monkeypatch):
    case = next(c for c in CASES if c['adapter'] == 'prandtl_meyer')
    monkeypatch.setattr(validation, 'evaluate', lambda _: {'angle_deg': float('nan')})
    assert validation.compare(case)['status'] == 'ERROR'


def test_incompatible_reference_never_runs_solver(monkeypatch):
    def unexpected(_):
        raise AssertionError('An incompatible case must not run')
    monkeypatch.setattr(validation, 'evaluate', unexpected)
    result = validation.compare(next(c for c in CASES if c['kind'] == 'incompatible_reference'))
    assert result['status'] == 'INCOMPATIBLE'
    assert result['metrics'] == {}


def test_registries_resolve_all_models_equations_and_sources():
    registry = json.loads((RECORDS/'MODEL_REGISTRY.json').read_text(encoding='utf-8'))
    source_ids = {s['id'] for s in registry['sources']}
    models = {m['id']:m for m in registry['models']}
    assert len(models) == len(registry['models'])
    equations = set(re.findall(r'EQ-\d{2}',(RECORDS/'EQUATION_TRACEABILITY.md').read_text(encoding='utf-8')))
    assert {f'EQ-{n:02}' for n in range(1,20)} <= equations
    assumptions = set(re.findall(r'(?:GT|RK|OD|AT|MC|MS|DG)-\d{2}',(RECORDS/'ASSUMPTIONS.md').read_text(encoding='utf-8')))
    for model in models.values():
        assert (ROOT/model['owner']).is_file()
        assert set(model['equations']) <= equations
        assert set(model['assumptions']) <= assumptions
        assert set(model['references']) <= source_ids
        for test in model['verification_tests']:
            assert (ROOT/test).is_file()
        assert model['uncertainty']['reason']
        assert model['required_evidence']
    for case in CASES:
        assert case['model'] in models
        assert case['reference'] in source_ids
        assert case['tolerance_basis']
        if case['kind'] != 'incompatible_reference':
            assert set(case['expected']) == set(case['tolerances'])


def test_reference_success_does_not_promote_validation():
    report = validation.build_report()
    assert not report['release_validation_ready']
    assert all(not domains for domains in report['validated_domains'].values())
    assert report['summary'].get('PASS',0) > 0
    assert len(report['results']) == len(CASES)
    assert report['source_sha256']['docs/engineering/REFERENCE_CASES.json']


def test_empty_reference_cannot_pass():
    case = dict(next(c for c in CASES if c['adapter'] == 'prandtl_meyer'))
    case['expected'] = {}
    assert validation.compare(case)['status'] == 'ERROR'
