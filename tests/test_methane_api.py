"""Explicit research selection and legacy compatibility."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
client=TestClient(app)


def test_methane_model_result_and_evidence():
    response=client.post('/analyze/cycle/methane-ramjet',json={'model':'methane_ramjet_research'})
    assert response.status_code==200,response.text
    result=response.json()
    assert result['model']=='methane_ramjet_research'
    assert result['fuel']=='CH4'
    assert result['eta_propulsive'] is None
    assert result['assurance']['inputs_si']['altitude_m']==0
    assert result['burner']['iterations']>0


@pytest.mark.parametrize('body',[{}, {'model':'legacy'}, {'model':'methane_ramjet_research','eta_b':.98},
                                {'model':'methane_ramjet_research','h_fuel':42.8e6}])
def test_model_selection_and_legacy_fields_rejected(body):
    assert client.post('/analyze/cycle/methane-ramjet',json=body).status_code==422


def test_legacy_ramjet_route_still_uses_legacy_solver():
    response=client.post('/analyze/cycle/ramjet',json={'alt':0,'mach':3,'t4':2200})
    assert response.status_code==200
    assert response.json()['engine_type']=='ramjet'
    assert response.json()['status']=='NUMERICAL_FAILURE'
