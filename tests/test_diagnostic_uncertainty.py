"""Covariance identities and rejection checks for EA-06."""
import numpy as np
import pytest
from core.diagnostic_uncertainty import propagate_telemetry_covariance
from core.errors import InputValidationError
X=dict(pt2=1e5,tt2=300,pt3=2e6,tt3=700,pt4=1.9e6,tt4=1600,pt5=3e5,tt5=1100,gamma_c=1.4,gamma_t=1.33)


def test_pressure_loss_analytic_uncertainty():
    c=np.zeros((10,10));c[2,2]=1000**2;c[4,4]=2000**2
    r=propagate_telemetry_covariance(X,c)
    variance=(100*X['pt4']/X['pt3']**2*1000)**2+(100/X['pt3']*2000)**2
    assert r['standard_uncertainty']['dp_b']==pytest.approx(variance**.5)


def test_correlated_scale_error_cancels_pressure_ratio():
    error=np.zeros(10);error[2]=X['pt3']*.01;error[4]=X['pt4']*.01
    r=propagate_telemetry_covariance(X,np.outer(error,error))
    assert r['standard_uncertainty']['dp_b']<1e-7


@pytest.mark.parametrize('bad',[np.eye(2),-np.eye(10),np.full((10,10),float('nan'))])
def test_invalid_covariance_rejected(bad):
    with pytest.raises(InputValidationError):propagate_telemetry_covariance(X,bad)


def test_non_psd_correlations_rejected():
    c=np.eye(10);c[0,1]=c[1,0]=2
    with pytest.raises(InputValidationError):propagate_telemetry_covariance(X,c)
