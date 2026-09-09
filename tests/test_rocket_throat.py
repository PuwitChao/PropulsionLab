"""Rocket throat mass closure and frozen sonic-state checks."""
import pytest
from core.rocket.analyzer import RocketAnalyzer


@pytest.mark.parametrize('mode',['frozen','shifting'])
def test_throat_mass_and_exit_area_close(mode):
    r=RocketAnalyzer(1e7).solve_equilibrium('H2/O2',6.,mode=mode,compute_heat_transfer=False)
    t=r['throat']
    assert r['c_star']==pytest.approx(1e7/(t['density_kg_m3']*t['velocity_m_per_s']))
    assert r['mdot_total']==pytest.approx(t['density_kg_m3']*t['velocity_m_per_s']*r['A_throat'])
    assert r['mdot_total']==pytest.approx(r['rho_exit']*r['v_exit_ideal']*r['A_exit'])
    if mode=='frozen':
        assert abs(t['sonic_residual_j_per_kg'])<1
