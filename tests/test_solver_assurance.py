"""Independent identities and failure contracts for EA-01 through EA-03."""

import json
import math
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from core.errors import (ConvergenceError, InputValidationError, ModelDomainError,
                         NumericalError, PhysicalInfeasibilityError, DependencyError)
from core.gas_turbine.cycle import CycleAnalyzer, get_gas_props
from core.gas_turbine.thermo import nozzle_exit, poly_to_isen_turb
from core.gas_turbine.off_design import OffDesignSolver
from core.rocket.analyzer import RocketAnalyzer
from core.solver_result import assurance, cycle_result, require_finite
from core.units import isa_atmosphere, G

client = TestClient(app)
MULTI = dict(opr=32, bpr=.3, fpr=3.5, lpc_pr=4, tit=1850)


def cycle():
    return CycleAnalyzer(101325, 288.15, 0)


@pytest.mark.parametrize('pressure', [90000, 101325])
def test_no_expansion_is_explicit(pressure):
    with pytest.raises(PhysicalInfeasibilityError) as caught:
        nozzle_exit(pressure, 700, 101325, 1.4, 287.05)
    assert caught.value.details['pressure_ratio'] <= 1


def test_nozzle_choke_identity():
    velocity, pressure, temperature, mach = nozzle_exit(400000, 700, 101325, 1.4, 287.05)
    assert mach == 1
    assert pressure == pytest.approx(400000 * (2 / 2.4) ** 3.5)
    assert temperature == pytest.approx(700 * 2 / 2.4)
    assert velocity == pytest.approx(math.sqrt(1.4 * 287.05 * temperature))


def test_turbine_efficiency_from_temperature_ratios():
    pressure_ratio, gamma, eta_poly = 0.25, 1.33, .91
    tau_is = pressure_ratio ** ((gamma - 1) / gamma)
    tau = tau_is ** eta_poly
    expected = (1 - tau) / (1 - tau_is)
    assert poly_to_isen_turb(tau, eta_poly, gamma) == pytest.approx(expected)
    assert 0 < expected < 1


@pytest.mark.parametrize('method,args', [
    ('solve_multispool', dict(opr=20, bpr=.3, fpr=3, lpc_pr=8, tit=1850)),
    ('solve_turbofan', dict(opr=10, bpr=2, fpr=3, lpc_pr=4, tit=1800)),
])
def test_core_rejects_architecture(method, args):
    with pytest.raises(InputValidationError):
        getattr(cycle(), method)(**args)


def test_core_allows_unity_hpc():
    result = cycle().solve_multispool(**{**MULTI, 'opr': 14})
    assert result['hpc_pr'] == 1
    assert result['assurance']['convergence']['work_demand']['hp'] == 0


@pytest.mark.parametrize('method,args', [
    ('solve_turbojet', dict(prc=30, tit=300)),
    ('solve_turbofan', dict(bpr=2, fpr=2, opr=30, tit=300)),
    ('solve_multispool', {**MULTI, 'tit': 300}),
    ('solve_turbojet', dict(prc=20, tit=1800, ab_enabled=True, ab_temp=400)),
    ('solve_turbofan', dict(bpr=.3, fpr=2, opr=20, tit=1800, mixed_exhaust=True, ab_enabled=True, ab_temp=400)),
])
def test_active_heat_addition_cannot_cool(method, args):
    with pytest.raises(PhysicalInfeasibilityError):
        getattr(cycle(), method)(**args)


def test_multispool_final_work_residuals():
    result = cycle().solve_multispool(**MULTI)
    conv = result['assurance']['convergence']
    assert conv['converged']
    stations, fuel = result['stations'], result['f_total']
    for spool, inlet, outlet, pressure in [('hp', 4, 45, 4), ('lp', 45, 5, 45)]:
        cp = get_gas_props((stations[inlet]['tt'] + stations[outlet]['tt']) / 2,
                           stations[pressure]['pt'], f=fuel)[1]
        supply = cp * (stations[inlet]['tt'] - stations[outlet]['tt']) * (1 + fuel) * .99
        error = supply - conv['work_demand'][spool]
        assert error == pytest.approx(conv['residuals'][spool], abs=1e-7)
        assert abs(error) <= conv['tolerances']['absolute'] + conv['tolerances']['relative'] * abs(conv['work_demand'][spool])


def test_iteration_exhaustion_is_not_success():
    with pytest.raises(ConvergenceError) as caught:
        cycle().solve_multispool(**MULTI, max_iterations=1)
    assert caught.value.details['convergence']['converged'] is False
    response = client.post('/analyze/cycle/multispool', json={**MULTI, 'max_iterations': 1})
    assert response.status_code == 409
    assert response.json()['status'] == 'NO_CONVERGENCE'
    assert response.json()['detail']['convergence']['termination_reason'] == 'iteration_limit'


def test_unknown_validation_is_not_true():
    meta = assurance('analytical')
    assert meta['applicability']['within_validated_domain'] is None
    assert meta['convergence'] is None
    json.dumps(meta, allow_nan=False)


def test_negative_thrust_has_no_tsfc():
    class Fixture:
        p0, t0, m0 = 101325, 288.15, 2

        @cycle_result
        def solve(self):
            return {'spec_thrust': -10, 'tsfc': 0.0}

    result = Fixture().solve()
    assert result['status'] == 'INFEASIBLE'
    assert result['tsfc'] is None
    assert result['assurance']['physical_valid'] is False


def test_nonfinite_output_is_not_silent():
    with pytest.raises(NumericalError):
        require_finite({'stations': [float('nan')]})


def test_api_domain_error_and_correlation():
    response = client.post('/analyze/cycle', json=dict(alt=0, mach=0, prc=30, tit=300), headers={'X-Request-ID': 'ea-test'})
    assert response.status_code == 422
    assert response.json()['status'] == 'INFEASIBLE'
    assert response.json()['request_id'] == 'ea-test'
    result = client.post('/analyze/cycle', json=dict(alt=0, mach=0, prc=20, tit=1500), headers={'X-Request-ID': 'ea-ok'})
    assert result.json()['assurance']['request_id'] == 'ea-ok'


def test_sweep_retains_every_requested_point():
    response = client.post('/analyze/cycle/sensitivity', json=dict(sweep_type='t4', alt=0, mach=0, prc=30, sweep_min=300, sweep_max=1700, steps=5))
    assert response.status_code == 200
    rows = response.json()['data']
    assert len(rows) == 6
    assert rows[0]['status'] == 'INFEASIBLE'
    assert rows[0]['tsfc'] is None
    assert rows[-1]['tsfc'] is not None


@pytest.mark.parametrize('failure,code,status', [(NumericalError('Numerical failure'),409,'NUMERICAL_FAILURE'), (DependencyError('Dependency unavailable'),503,'DEPENDENCY_FAILURE')])
def test_typed_failures_reach_gateway(monkeypatch, failure, code, status):
    def fail(*args, **kwargs):
        raise failure
    monkeypatch.setattr(CycleAnalyzer, 'solve_turbojet', fail)
    response = client.post('/analyze/cycle', json=dict(alt=0, mach=0, prc=20, tit=1500))
    assert response.status_code == code
    assert response.json()['status'] == status


@pytest.mark.parametrize('altitude', [-1, 47000.1, 100000, float('nan')])
def test_atmosphere_rejects_extrapolation(altitude):
    with pytest.raises(ModelDomainError):
        isa_atmosphere(altitude)


def test_rocket_ambient_changes_only_pressure_thrust():
    rocket = RocketAnalyzer(7.5e6)
    vacuum = rocket.solve_equilibrium('H2/O2', 6, p_exit_pa=101325, p_ambient_pa=0, compute_heat_transfer=False)
    sea = rocket.solve_equilibrium('H2/O2', 6, p_exit_pa=101325, p_ambient_pa=101325, compute_heat_transfer=False)
    for key in ('A_throat', 'A_exit', 'epsilon', 'mdot_total', 'v_exit_ideal', 't_exit'):
        assert sea[key] == pytest.approx(vacuum[key], rel=1e-10)
    assert vacuum['thrust_ambient'] - sea['thrust_ambient'] == pytest.approx(101325 * sea['A_exit'])
    assert vacuum['isp_delivered'] - sea['isp_delivered'] == pytest.approx(101325 * sea['A_exit'] / (sea['mdot_total'] * G))
    assert sea['composition_exit'] == pytest.approx(vacuum['composition_exit'])


def test_fixed_geometry_altitude_and_invalid_point():
    rows = RocketAnalyzer(7.5e6).altitude_performance('H2/O2', 6, [0, 11000, 47000, 100000])
    for key in ('A_throat', 'A_exit', 'epsilon', 'mdot_total', 'pe', 'isp_vac'):
        assert all(row[key] == rows[0][key] for row in rows[:3])
    assert rows[0]['isp_s'] < rows[1]['isp_s'] < rows[2]['isp_s']
    assert rows[3]['status'] == 'OUTSIDE_MODEL_DOMAIN'
    assert rows[3]['isp_s'] is None


@pytest.mark.parametrize('pe,pa,regime', [(100000,0,'Underexpanded'), (100000,100000,'Ideally Expanded'), (80000,100000,'Overexpanded'), (30000,100000,'Separation Warning')])
def test_expansion_regime(pe, pa, regime):
    assert RocketAnalyzer.flow_regime(pe, pa) == regime


@pytest.mark.parametrize('pe,pa', [(0,0), (7.5e6,0), (-1,0), (101325,-1)])
def test_rocket_pressure_contract(pe, pa):
    with pytest.raises(InputValidationError):
        RocketAnalyzer(7.5e6).solve_equilibrium('H2/O2', 6, pe, p_ambient_pa=pa)


@pytest.fixture(scope='module')
def offdesign():
    return OffDesignSolver(cycle().solve_turbojet(20, 1700))


def test_map_anchor_and_surge_boundary(offdesign):
    assert offdesign.map_point(1, 1)[0] == pytest.approx(20)
    for speed in [.55, .8, 1, 1.1]:
        surge_flow = .096 * speed / .576
        assert offdesign.surge_margin(speed, surge_flow) == pytest.approx(0, abs=1e-10)
        assert offdesign.surge_margin(speed, surge_flow * 1.2) > 0
    result = offdesign.generate_compressor_map()
    assert result['flow_unit'] == 'normalized_corrected_flow'


def test_offdesign_si_and_failure_rows(offdesign, monkeypatch):
    rows = offdesign.sweep_throttle(101325, 288.15, 0, n_points=3)
    good = [row for row in rows if not row['error']]
    assert good
    for row in good:
        assert row['tsfc'] == pytest.approx(row['f'] / row['spec_thrust'])
        assert row['tsfc_unit'] == 'kg/(N*s)'
    def fail(*args, **kwargs):
        raise PhysicalInfeasibilityError('Forced infeasible point')
    monkeypatch.setattr(CycleAnalyzer, 'solve_turbojet', fail)
    rows = offdesign.sweep_throttle(101325, 288.15, 0, n_points=3)
    assert len(rows) == 3
    assert all(row['status'] == 'INFEASIBLE' and row['tsfc'] is None and row['spec_thrust'] is None for row in rows)


def test_map_never_clips_outside_speed(offdesign):
    with pytest.raises(ModelDomainError):
        offdesign.map_point(2, 1)


def test_pressure_work_is_included_in_energy_flux():
    thermal, propulsive = CycleAnalyzer._efficiencies([(1, 500, 100)], 200, 1, .02, 40e6, 400)
    expected_jet_power = .5 * 500**2 + 100 * 500 - .5 * 200**2
    assert thermal == pytest.approx(expected_jet_power / (.02 * 40e6))
    assert propulsive == pytest.approx(400 * 200 / expected_jet_power)


def test_api_rejects_nonfinite_inputs_with_json_envelope():
    response = client.post('/analyze/cycle', content='{"alt":0,"mach":0,"prc":20,"tit":1500,"h_fuel":NaN}',
                           headers={'Content-Type': 'application/json'})
    assert response.status_code == 422
    assert response.json()['error_code'] == 'validation_error'


def test_api_rejects_altitude_beyond_supported_model():
    response = client.post('/analyze/rocket/altitude', json={'pc': 7.5e6, 'of_ratio': 6, 'alt_max_km': 100})
    assert response.status_code == 422


def test_ambient_pressure_cannot_exceed_chamber():
    with pytest.raises(PhysicalInfeasibilityError):
        RocketAnalyzer(1e6).solve_equilibrium('H2/O2', 6, 100000, p_ambient_pa=1e6)


def test_expected_sweep_failures_do_not_hide_programming_errors(monkeypatch):
    def fail(*args, **kwargs):
        raise RuntimeError('private implementation detail')
    monkeypatch.setattr(CycleAnalyzer, 'solve_turbojet', fail)
    response = client.post('/analyze/cycle/sensitivity', json={'steps': 5})
    assert response.status_code == 500
    assert 'private implementation detail' not in response.text


def test_mechanism_load_failure_is_a_dependency_failure(monkeypatch):
    import core.gas_turbine.cycle as module
    def fail(*args, **kwargs):
        raise module.ct.CanteraError('mechanism unavailable')
    monkeypatch.setattr(module.ct, 'Solution', fail)
    with pytest.raises(DependencyError):
        module._new_gas()
