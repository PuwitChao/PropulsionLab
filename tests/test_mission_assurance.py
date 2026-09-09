"""EA-04 dimensional identities and invalid-input regression cases."""
import math
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from core.gas_turbine.mission import MissionAnalyzer
from core.diagnostics import DiagnosticsAnalyzer
from core.errors import InputValidationError, PhysicalInfeasibilityError
from core.units import G, isa_atmosphere

client = TestClient(app)


def test_takeoff_work_energy_identity():
    model = MissionAnalyzer({})
    ws, distance, cl, sigma = 3500, 1200, 2, 0.8
    rho = isa_atmosphere(0)[2] * sigma
    speed = 1.2 * math.sqrt(2 * ws / (rho * cl))
    acceleration = G * model.tw_takeoff(ws, distance, cl, sigma)
    assert speed**2 / (2 * acceleration) == pytest.approx(distance, rel=1e-12)
    assert model.tw_takeoff(ws, distance, cl, sigma / 2) == pytest.approx(2 * acceleration / G)


def test_breguet_mass_and_weight_sfc_agree():
    model = MissionAnalyzer({})
    kwargs = dict(mach=0.78, altitude_m=11000, l_over_d=16, w_initial=75000*G, w_final=45000*G)
    mass = model.calculate_breguet_range(**kwargs, tsfc_kg_per_n_s=15e-6)
    weight = model.calculate_breguet_range(**kwargs, sfc_1_per_s=15e-6*G)
    assert mass['range_km'] == pytest.approx(weight['range_km'], rel=1e-12)
    expected_time = 16 * math.log(75/45) / (15e-6 * G)
    assert mass['flight_time_hours'] * 3600 == pytest.approx(expected_time)
    # Independent integration of dW/dt = -g TSFC W/(L/D).
    final = kwargs['w_initial'] * math.exp(-G * 15e-6 * expected_time / 16)
    assert final == pytest.approx(kwargs['w_final'])


@pytest.mark.parametrize('inputs', [{'w_final':80000}, {'tsfc_kg_per_n_s':0}, {'l_over_d':-1}, {'mach':float('nan')}])
def test_breguet_invalid_core_input(inputs):
    kwargs = dict(mach=.8, altitude_m=10000, tsfc_kg_per_n_s=15e-6, l_over_d=16, w_initial=75000, w_final=45000)
    kwargs.update(inputs)
    with pytest.raises(InputValidationError):
        MissionAnalyzer({}).calculate_breguet_range(**kwargs)


def test_breguet_rejects_ambiguous_and_unknown_api_fields():
    for payload in [{'sfc':15e-6}, {'sfc_1_per_s':.00015, 'tsfc_kg_per_n_s':15e-6}]:
        assert client.post('/analyze/mission/breguet',json=payload).status_code == 422


def test_failed_constraint_never_becomes_optimum():
    result = MissionAnalyzer({}).generate_constraint_data([1000,2000], [
        {'type':'level','label':'Cruise','alt':0,'mach':.4},
        {'type':'level','label':'Invalid','alt':0,'mach':0}])
    assert result['optimum'] is None
    assert result['feasible_boundary'] == [None,None]
    assert result['series'][1]['values'] == [None,None]
    assert all(p['status'] == 'INFEASIBLE' for p in result['series'][1]['points'])


def test_unknown_constraint_is_explicit_failure():
    result = MissionAnalyzer({}).generate_constraint_data([2000],[{'type':'unknown'}])
    assert result['optimum'] is None
    assert result['series'][0]['points'][0]['error']


def test_takeoff_density_and_ceiling_rate_reach_core():
    model = MissionAnalyzer({})
    a = model.generate_constraint_data([2000],[{'type':'takeoff','sto':1000,'cl_max':2,'sigma':.5}])
    assert a['series'][0]['values'][0] == pytest.approx(model.tw_takeoff(2000,1000,2,.5))
    b = model.generate_constraint_data([2000],[{'type':'ceiling','alt':10000,'mach':.8,'vy':2}])
    assert b['series'][0]['values'][0] == pytest.approx(model.tw_service_ceiling(2000,10000,.8,2))


def telemetry(eta_c=.9, eta_t=.9):
    pt2, tt2, pt3, pt4, tt4, pt5 = 100000, 300, 1000000, 960000, 1500, 200000
    tt3 = tt2 + tt2*((pt3/pt2)**(0.4/1.4)-1)/eta_c
    tt5 = tt4 - eta_t * tt4*(1-(pt5/pt4)**(.33/1.33))
    return dict(pt2=pt2,tt2=tt2,pt3=pt3,tt3=tt3,pt4=pt4,tt4=tt4,pt5=pt5,tt5=tt5)


def test_diagnostic_efficiency_inverse_identity():
    result = DiagnosticsAnalyzer().analyze(**telemetry(.87,.91))
    assert result['eta_c'] == pytest.approx(.87)
    assert result['eta_t'] == pytest.approx(.91)
    assert result['status'] == 'OUTSIDE_VALIDATED_DOMAIN'
    assert result['diagnostic_status'] == 'WITHIN_THRESHOLDS'


@pytest.mark.parametrize('changes',[{'pt2':0},{'gamma_t':1},{'tt4':float('inf')}])
def test_diagnostic_nonfinite_or_invalid_scalars(changes):
    values = telemetry(); values.update(changes)
    with pytest.raises(InputValidationError):
        DiagnosticsAnalyzer().analyze(**values)


@pytest.mark.parametrize('changes',[{'pt3':90000},{'pt4':1100000},{'tt5':1600},{'tt3':301}])
def test_contradictory_telemetry_has_no_fault_verdict(changes):
    values = telemetry(); values.update(changes)
    with pytest.raises(PhysicalInfeasibilityError):
        DiagnosticsAnalyzer().analyze(**values)
    response = client.post('/analyze/diagnostics',json=values)
    assert response.status_code == 422
    assert 'alerts' not in response.json()
