"""Atmosphere convention and layer transition regressions."""
import pytest
from core.units import isa_atmosphere
from core.errors import InputValidationError, ModelDomainError


@pytest.mark.parametrize("height", [11000., 20000., 32000.])
def test_geometric_layer_transition_is_continuous(height):
    radius = 6356766.
    altitude = radius * height / (radius - height)
    expected = isa_atmosphere(height, altitude_kind="geopotential")
    assert isa_atmosphere(altitude) == pytest.approx(expected, rel=1e-12)
    for offset in [-.001, .001]:
        assert isa_atmosphere(altitude + offset) == pytest.approx(expected, rel=1e-6)


def test_default_geometric_differs_from_geopotential():
    geometric = isa_atmosphere(30000.)
    potential = isa_atmosphere(30000., altitude_kind="geopotential")
    assert geometric[0] > potential[0]
    assert geometric[1] < potential[1]


@pytest.mark.parametrize("kind", ["geometric", "geopotential"])
def test_convention_keeps_explicit_upper_limit(kind):
    assert all(value > 0 for value in isa_atmosphere(47000., altitude_kind=kind))
    with pytest.raises(ModelDomainError):
        isa_atmosphere(47000.1, altitude_kind=kind)


def test_unknown_convention_is_rejected():
    with pytest.raises(InputValidationError):
        isa_atmosphere(10000., altitude_kind="pressure")
