"""EA-06 added API capability smoke tests."""
from fastapi.testclient import TestClient
from backend.main import app


def test_covariance_api_returns_measurement_scope():
    body=dict(pt2=1e5,tt2=300,pt3=2e6,tt3=750,pt4=1.9e6,tt4=1600,pt5=3e5,tt5=1100)
    body['input_covariance']=[[(1. if i<8 else 1e-6) if i==j else 0. for j in range(10)] for i in range(10)]
    r=TestClient(app).post('/analyze/diagnostics',json=body)
    assert r.status_code==200,r.text
    assert r.json()['measurement_uncertainty']['standard_uncertainty']['dp_b']>0
    assert not r.json()['measurement_uncertainty']['validated_fault_classifier']


def test_deck_cruise_api_and_domain():
    deck={'source_id':'synthetic-test-only','units':{'altitude':'m','thrust':'N','tsfc':'kg/(N*s)'},
      'altitudes_m':[0,10000],'mach':[.5,1.],'installed_thrust_n':[[20000,20000],[20000,20000]],'tsfc_kg_per_n_s':[[1e-5,1e-5],[1e-5,1e-5]]}
    body={'deck':deck,'segments':[{'altitude_m':0,'mach':.5,'duration_s':100}], 'initial_mass_kg':1000,'wing_area_m2':10,'cd0':.02,'induced_drag_factor':0}
    client=TestClient(app);r=client.post('/analyze/mission/cruise-deck',json=body)
    assert r.status_code==200,r.text
    assert r.json()['fuel_kg']>0
    body['segments'][0]['altitude_m']=11000
    assert client.post('/analyze/mission/cruise-deck',json=body).status_code==422
