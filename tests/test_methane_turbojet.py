"""Single-shaft methane turbojet integration and API contracts."""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from core.gas_turbine.methane import methane_turbojet
from core.errors import PhysicalInfeasibilityError


@pytest.mark.parametrize('mach',[0.,.8])
def test_turbojet_shaft_and_mass_close(mach):
    r=methane_turbojet(101325,288.15,mach,1800)
    assert r['model']=='methane_turbojet_research'
    shaft=r['shaft'];comp=r['compressor']
    assert abs(shaft['residual_j_per_kg_core_air']) <= .1+1e-6*comp['work_j_per_kg_gas']
    assert shaft['demand_j_per_kg_core_air']==pytest.approx(comp['work_j_per_kg_gas'])
    assert shaft['gas_mass_per_core_air']==pytest.approx(1+r['f_total'])
    assert r['spec_thrust']>0 and r['tsfc']>0
    assert r['eta_propulsive'] is None
    assert dict(r['nozzle']['exit']['mass_fractions'])==pytest.approx(dict(r['burner']['products']['mass_fractions']))


def test_infeasible_work_fails():
    with pytest.raises(PhysicalInfeasibilityError):
        methane_turbojet(101325,288.15,0,1800,shaft_mechanical_efficiency=.01)


def test_turbojet_api_and_wrong_architecture():
    client=TestClient(app)
    response=client.post('/analyze/cycle/methane-turbojet',json={'model':'methane_turbojet_research'})
    assert response.status_code==200,response.text
    assert response.json()['shaft']['iterations']>0
    for extra in ({'model':'methane_ramjet_research'},{'model':'methane_turbojet_research','eta_c':.88}):
        assert client.post('/analyze/cycle/methane-turbojet',json=extra).status_code==422


def test_afterburner_mass_fuel_and_energy_basis():
    r=methane_turbojet(101325,288.15,0,1800,afterburner_temperature_k=2200)
    ab=r['afterburner']
    assert r['f_afterburner']==pytest.approx((1+r['f_main'])*ab['added_fuel_per_inlet_gas'])
    assert r['f_total']==pytest.approx(r['f_main']+r['f_afterburner'])
    assert r['exit_area_m2_per_kg_per_s_air']*r['nozzle']['mass_flux_kg_per_m2_s']==pytest.approx(1+r['f_total'])
    assert r['tsfc']==pytest.approx(r['f_total']/r['spec_thrust'])
    assert r['shaft']['gas_mass_per_core_air']==pytest.approx(1+r['f_main'])
    assert abs(ab['energy_residual_j_per_kg_inlet_gas'])<2
    assert max(abs(v) for _,v in ab['element_residuals_kg_per_kg_inlet_gas'])<1e-8
    assert dict(r['nozzle']['exit']['mass_fractions'])==pytest.approx(dict(ab['products']['mass_fractions']))


def test_disabled_afterburner_does_not_apply_pressure_loss():
    a=methane_turbojet(101325,288.15,0,1800)
    b=methane_turbojet(101325,288.15,0,1800,afterburner_pressure_loss=.5)
    assert a['spec_thrust']==pytest.approx(b['spec_thrust'])
    assert a['afterburner'] is None and a['f_afterburner']==0


def test_afterburner_invalid_target_and_api():
    with pytest.raises(PhysicalInfeasibilityError):
        methane_turbojet(101325,288.15,0,1800,afterburner_temperature_k=500)
    response=TestClient(app).post('/analyze/cycle/methane-turbojet',json={'model':'methane_turbojet_research','afterburner_temperature_k':2200})
    assert response.status_code==200,response.text
    assert response.json()['f_afterburner']>0
