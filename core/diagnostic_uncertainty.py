"""First-order covariance propagation for telemetry-derived metrics (NIST TN 1297)."""
import numpy as np
from .errors import InputValidationError
from .solver_result import require_finite

INPUT_ORDER=('pt2','tt2','pt3','tt3','pt4','tt4','pt5','tt5','gamma_c','gamma_t')
OUTPUT_ORDER=('eta_c','eta_t','dp_b')


def propagate_telemetry_covariance(inputs, covariance):
    """Propagate a caller-supplied covariance. This does not estimate sensor uncertainty."""
    try:
        c=np.asarray(covariance,dtype=float)
    except (ValueError,TypeError) as exc:
        raise InputValidationError('Covariance must be a numeric 10 by 10 matrix.') from exc
    if c.shape!=(10,10) or not np.isfinite(c).all() or not np.allclose(c,c.T,rtol=1e-10,atol=0):
        raise InputValidationError('Covariance must be finite, symmetric, and 10 by 10.')
    if np.any(np.diag(c)<0):
        raise InputValidationError('Covariance variances must be nonnegative.')
    scales=np.sqrt(np.diag(c))
    for i in range(10):
        if scales[i]==0 and np.any(c[i]!=0):
            raise InputValidationError('Zero-variance sensors must have zero covariance rows.')
    nonzero=scales>0
    if nonzero.any():
        normalized=c[np.ix_(nonzero,nonzero)]/np.outer(scales[nonzero],scales[nonzero])
        if np.linalg.eigvalsh(normalized).min() < -1e-10:
            raise InputValidationError('Covariance must be positive semidefinite.')
    x=np.array([inputs[k] for k in INPUT_ORDER],dtype=float)
    def metrics(v):
        p2,t2,p3,t3,p4,t4,p5,t5,gc,gt=v
        return np.array([t2*((p3/p2)**((gc-1)/gc)-1)/(t3-t2),
            (t4-t5)/(t4*(1-(p5/p4)**((gt-1)/gt))),100*(1-p4/p3)])
    jac=np.empty((3,10))
    for i in range(10):
        perturbed=x.astype(complex);perturbed[i]+=1e-20j
        jac[:,i]=metrics(perturbed).imag/1e-20
    output=jac@c@jac.T
    standard=np.sqrt(np.maximum(np.diag(output),0))
    result = {'method':'first_order_J_C_JT','input_order':list(INPUT_ORDER),'output_order':list(OUTPUT_ORDER),
            'input_covariance':c.tolist(),'output_covariance':output.tolist(),'sensitivity_matrix':jac.tolist(),
            'standard_uncertainty':dict(zip(OUTPUT_ORDER,standard.tolist())),
            'scope':'Supplied measurement covariance only. Model-form uncertainty and fault calibration are not included.',
            'coverage_factor':None,'validated_fault_classifier':False}

    require_finite(result)
    return result
