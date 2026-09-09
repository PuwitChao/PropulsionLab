"""Research architecture conservation and API gates."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from core.gas_turbine.turbofan import methane_turbofan


@pytest.mark.parametrize('model',['methane_turbofan_research','methane_mixed_turbofan_research','methane_multispool_research'])
def test_research_architecture_balances(model):
    r=methane_turbofan(101325,288.15,0,1800,model=model)
    for shaft in r['shafts'].values():
        assert abs(shaft['residual_j_per_kg_core_air'])<=.1+1e-6*shaft['demand_j_per_kg_core_air']
    assert sum(n['mass_per_core_air'] for n in r['nozzles'].values())==pytest.approx(3+r['f_total_per_core_air'])
    assert r['spec_thrust']==pytest.approx(r['net_thrust_per_core_air']/3)
    assert r['tsfc']==pytest.approx(r['f_total_per_core_air']/r['net_thrust_per_core_air'])
    assert len(r['shafts'])==(3 if 'multispool' in model else 2)
    if r['mixer']:
        assert abs(r['mixer']['energy_residual_w'])<.1
    assert r['eta_propulsive'] is None


def test_mixed_reheat_and_api():
    response=TestClient(app).post('/analyze/cycle/methane-turbofan',json={'model':'methane_mixed_turbofan_research','afterburner_temperature_k':1800})
    assert response.status_code==200,response.text
    r=response.json()
    assert r['f_afterburner']>0
    assert r['f_total_per_core_air']==pytest.approx(r['f_main']+r['f_afterburner'])


def test_separate_reheat_rejected():
    r=TestClient(app).post('/analyze/cycle/methane-turbofan',json={'model':'methane_turbofan_research','afterburner_temperature_k':2200})
    assert r.status_code==422
