"""Deck interpolation and analytic mission coupling tests."""
import pytest
from core.gas_turbine.engine_deck import deck_point,cruise_with_deck
from core.units import isa_atmosphere,R_AIR
from core.errors import ModelDomainError,PhysicalInfeasibilityError
D={'source_id':'synthetic-test-only','units':{'altitude':'m','thrust':'N','tsfc':'kg/(N*s)'},'altitudes_m':[0,10000],'mach':[.5,1.],
   'installed_thrust_n':[[20000,20000],[20000,20000]],'tsfc_kg_per_n_s':[[1e-5,1e-5],[1e-5,1e-5]]}


def test_bilinear_and_no_extrapolation():
    deck={**D,'installed_thrust_n':[[10000,20000],[20000,30000]]}
    assert deck_point(deck,5000,.75)['installed_thrust_n']==20000
    with pytest.raises(ModelDomainError):deck_point(deck,11000,.75)


def test_constant_drag_exact_fuel():
    r=cruise_with_deck(D,[{'altitude_m':0,'mach':.5,'duration_s':100}],1000,10,.02,0)
    _,t,rho=isa_atmosphere(0);q=.5*rho*.5**2*1.4*R_AIR*t
    expected=q*10*.02*1e-5*100
    assert r['fuel_kg']==pytest.approx(expected)
    assert r['fuel_kg']==pytest.approx(sum(s['fuel_kg'] for s in r['segments']))


def test_thrust_deficit_fails():
    with pytest.raises(PhysicalInfeasibilityError):
        cruise_with_deck(D,[{'altitude_m':0,'mach':1,'duration_s':100}],1000,100,1,0)
