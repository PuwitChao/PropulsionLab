"""Dimensional corrected-unit and rectangular component-map contracts. No engine matching is implied."""
import math
import numpy as np
from ..errors import InputValidationError,ModelDomainError


def corrected_conditions(mass_flow_kg_s,speed_rpm,temperature_k,pressure_pa,reference_temperature_k,reference_pressure_pa):
    values=(mass_flow_kg_s,speed_rpm,temperature_k,pressure_pa,reference_temperature_k,reference_pressure_pa)
    if not all(math.isfinite(v) and v>0 for v in values):
        raise InputValidationError('Corrected-condition inputs must be finite and positive.')
    theta=temperature_k/reference_temperature_k;delta=pressure_pa/reference_pressure_pa
    return {'corrected_flow_kg_s':mass_flow_kg_s*math.sqrt(theta)/delta,'corrected_speed_rpm':speed_rpm/math.sqrt(theta)}


def map_point(table,speed_corr_rpm,coordinate):
    """Interpolate a dimensional map. The second axis is declared by the component type."""
    required={'compressor':('corrected_flow_kg_s','pressure_ratio'),'turbine':('pressure_ratio','corrected_flow_kg_s')}
    kind=table.get('component')
    if kind not in required or not table.get('source_id'):
        raise InputValidationError('Map component and source_id are required.')
    axis,output=required[kind]
    if table.get('axis_units')!={'speed':'rpm','coordinate':('kg/s' if kind=='compressor' else '1')}:
        raise InputValidationError('Map axes require explicit corrected dimensional units.')
    for key in ('reference_temperature_k','reference_pressure_pa'):
        if not math.isfinite(table.get(key,0)) or table.get(key,0)<=0:
            raise InputValidationError('Map reference pressure and temperature must be positive.')
    try:
        speed=np.asarray(table['corrected_speed_rpm'],dtype=float);x=np.asarray(table[axis],dtype=float)
    except (ValueError,TypeError,KeyError) as exc:
        raise InputValidationError('Map axes must be numeric arrays.') from exc
    if speed.ndim!=1 or x.ndim!=1 or min(len(speed),len(x))<2 or not np.isfinite(speed).all() or not np.isfinite(x).all() or np.any(np.diff(speed)<=0) or np.any(np.diff(x)<=0) or min(speed[0],x[0])<=0:
        raise InputValidationError('Map axes must be finite, positive and strictly increasing.')
    if not math.isfinite(speed_corr_rpm) or not math.isfinite(coordinate) or not speed[0]<=speed_corr_rpm<=speed[-1] or not x[0]<=coordinate<=x[-1]:
        raise ModelDomainError('Map extrapolation is disabled.')
    result={}
    for key in (output,'isentropic_efficiency'):
        try: grid=np.asarray(table[key],dtype=float)
        except (ValueError,TypeError,KeyError) as exc: raise InputValidationError('Map grids must be numeric.') from exc
        if grid.shape!=(len(speed),len(x)) or not np.isfinite(grid).all() or np.any(grid<=0) or (key=='isentropic_efficiency' and np.any(grid>1)) or (key=='pressure_ratio' and np.any(grid<1)):
            raise InputValidationError('Map grid values or dimensions are invalid.')
        result[key]=float(np.interp(speed_corr_rpm,speed,[np.interp(coordinate,x,row) for row in grid]))
    return result
