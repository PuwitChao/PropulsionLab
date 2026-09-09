"""Corrected units and supplied map interpolation identities."""
import pytest
from core.gas_turbine.map_contract import corrected_conditions,map_point
from core.errors import ModelDomainError,InputValidationError


def test_corrected_flow_and_speed_reference():
    r=corrected_conditions(10,12000,1200,2e5,300,1e5)
    assert r=={'corrected_flow_kg_s':10,'corrected_speed_rpm':6000}


def test_rectangular_map_interpolation_and_no_extrapolation():
    m={'component':'compressor','source_id':'synthetic-only','axis_units':{'speed':'rpm','coordinate':'kg/s'},
       'reference_temperature_k':300,'reference_pressure_pa':1e5,'corrected_speed_rpm':[5000,10000],
       'corrected_flow_kg_s':[1,2],'pressure_ratio':[[2,4],[4,6]],'isentropic_efficiency':[[.8,.8],[.9,.9]]}
    assert map_point(m,7500,1.5)==pytest.approx({'pressure_ratio':4,'isentropic_efficiency':.85})
    with pytest.raises(ModelDomainError):map_point(m,11000,1.5)
    with pytest.raises(InputValidationError):map_point({**m,'axis_units':{}},7500,1.5)
