"""Methane design-point turbofan research models. No component-map matching is implied."""
import math
from dataclasses import asdict
from .state import methane_air_state, frozen_state
from .flow import freestream_total, convergent_nozzle
from .shaft import compressor, match_turbine
from .methane import methane_burner, methane_afterburner
from .mixer import mix_streams
from ..errors import InputValidationError
from ..solver_result import assurance, require_finite

MODELS = {'methane_turbofan_research', 'methane_mixed_turbofan_research', 'methane_multispool_research'}


def methane_turbofan(pressure_pa, temperature_k, mach, burner_temperature_k, *,
    model='methane_turbofan_research', bypass_ratio=2., fan_pressure_ratio=1.5, booster_pressure_ratio=2.,
    compressor_pressure_ratio=8., compressor_isentropic_efficiency=.88, turbine_isentropic_efficiency=.9,
    shaft_mechanical_efficiency=.98, inlet_pressure_recovery=.98, burner_pressure_loss=.06,
    nozzle_pressure_loss=.02, mixer_pressure_loss=.03, fuel_temperature_k=300., heat_loss_j_per_kg_air=0.,
    afterburner_temperature_k=None, afterburner_pressure_loss=.03, afterburner_heat_loss_j_per_kg_inlet_gas=0.):
    inputs = dict(locals())
    if model not in MODELS or not math.isfinite(mach) or not 0 <= mach <= 5:
        raise InputValidationError('Select a supported research turbofan model and Mach 0 through 5.')
    for value in (bypass_ratio, fan_pressure_ratio, booster_pressure_ratio, compressor_pressure_ratio):
        if not math.isfinite(value) or value < 0:
            raise InputValidationError('Flow and pressure ratios must be finite and nonnegative.')
    if min(fan_pressure_ratio,booster_pressure_ratio,compressor_pressure_ratio)<1:
        raise InputValidationError('Each compressor pressure ratio must be at least one.')
    for loss in (burner_pressure_loss,nozzle_pressure_loss,mixer_pressure_loss,afterburner_pressure_loss):
        if not math.isfinite(loss) or not 0 <= loss < 1:
            raise InputValidationError('Pressure losses must be in [0,1).')
    mixed = model=='methane_mixed_turbofan_research'
    three = model=='methane_multispool_research'
    if not mixed and afterburner_temperature_k is not None:
        raise InputValidationError('Research turbofan reheat requires the mixed-flow model.')
    inlet=freestream_total(methane_air_state(temperature_k,pressure_pa,0),mach,inlet_pressure_recovery)
    fan=compressor(inlet.total,inlet.total.pressure_pa*fan_pressure_ratio,compressor_isentropic_efficiency)
    booster=compressor(fan.outlet,fan.outlet.pressure_pa*booster_pressure_ratio,compressor_isentropic_efficiency)
    hpc=compressor(booster.outlet,booster.outlet.pressure_pa*compressor_pressure_ratio,compressor_isentropic_efficiency)
    burner=methane_burner(hpc.outlet,burner_temperature_k,hpc.outlet.pressure_pa*(1-burner_pressure_loss),
        fuel_temperature_k=fuel_temperature_k,heat_loss_j_per_kg_air=heat_loss_j_per_kg_air)
    core_mass=1+burner.fuel_air_ratio
    recovery=(1-nozzle_pressure_loss)*(1-mixer_pressure_loss if mixed else 1)*(1-afterburner_pressure_loss if afterburner_temperature_k is not None else 1)
    floor=pressure_pa/recovery*(1+1e-8)
    def shaft(state,load):
        return match_turbine(state,load,floor,gas_mass_per_core_air=core_mass,
            isentropic_efficiency=turbine_isentropic_efficiency,mechanical_efficiency=shaft_mechanical_efficiency)
    hp=shaft(burner.products,hpc.work_j_per_kg_gas)
    ip=shaft(hp.stage.outlet,booster.work_j_per_kg_gas) if three else None
    lp_demand=fan.work_j_per_kg_gas*(1+bypass_ratio)+(0 if three else booster.work_j_per_kg_gas)
    lp=shaft(ip.stage.outlet if ip else hp.stage.outlet,lp_demand)
    streams=[]
    mixer=None
    afterburner=None
    added=0.
    if mixed:
        mixing=[(lp.stage.outlet,core_mass)]
        if bypass_ratio>0:
            mixing.append((fan.outlet,bypass_ratio))
        mixer=mix_streams(mixing,min(state.pressure_pa for state,_ in mixing)*(1-mixer_pressure_loss))
        state=mixer.outlet
        mass=mixer.mass_flow_kg_per_s
        if afterburner_temperature_k is not None:
            afterburner=methane_afterburner(state,afterburner_temperature_k,state.pressure_pa*(1-afterburner_pressure_loss),
                fuel_temperature_k=fuel_temperature_k,heat_loss_j_per_kg_inlet_gas=afterburner_heat_loss_j_per_kg_inlet_gas)
            added=mass*afterburner.added_fuel_per_inlet_gas
            mass+=added
            state=afterburner.products
        streams.append(('mixed',state,mass))
    else:
        streams.append(('core',lp.stage.outlet,core_mass))
        if bypass_ratio>0:
            streams.append(('bypass',fan.outlet,bypass_ratio))
    nozzles={}
    gross=0.
    for name,state,mass in streams:
        total=frozen_state(state,state.pressure_pa*(1-nozzle_pressure_loss),enthalpy_j_per_kg=state.enthalpy_j_per_kg)
        nozzle=convergent_nozzle(total,pressure_pa)
        area=mass/nozzle.mass_flux_kg_per_m2_s
        force=mass*nozzle.velocity_m_per_s+(nozzle.exit.pressure_pa-pressure_pa)*area
        gross+=force
        nozzles[name]={'flow':asdict(nozzle),'mass_per_core_air':mass,'area_m2_per_kg_per_s_core_air':area,'gross_thrust_n_per_kg_per_s_core_air':force}
    inlet_mass=1+bypass_ratio
    net=gross-inlet_mass*inlet.velocity_m_per_s
    fuel=burner.fuel_air_ratio+added
    status='OUTSIDE_VALIDATED_DOMAIN' if net>0 else 'INFEASIBLE'
    meta=assurance(model,inputs,status=status,physical_valid=net>0,
        warnings=['Efficiency metrics are unavailable pending pressure-energy review.'],
        assumptions=['Methane equilibrium burner; frozen stages; prescribed pressure losses; no map or geometric matching.',
                     'Work and component flows use core-air mass. Displayed specific thrust uses total inlet air.',
                     'Two shafts use fan plus booster LP load. Three shafts assign booster load to IP.'])
    result={'model':model,'fuel':'CH4','status':status,'assurance':meta,'spec_thrust':net/inlet_mass,
        'net_thrust_per_core_air':net,'inlet_mass_per_core_air':inlet_mass,'tsfc':fuel/net if net>0 else None,
        'f_total':fuel/inlet_mass,'f_total_per_core_air':fuel,'f_main':burner.fuel_air_ratio,'f_afterburner':added,
        'eta_thermal':None,'eta_propulsive':None,'eta_overall':None,'inlet':asdict(inlet),'fan':asdict(fan),
        'booster':asdict(booster),'compressor':asdict(hpc),'burner':asdict(burner),
        'shafts':{'hp':asdict(hp),'lp':asdict(lp),**({'ip':asdict(ip)} if ip else {})},
        'mixer':asdict(mixer) if mixer else None,'afterburner':asdict(afterburner) if afterburner else None,'nozzles':nozzles}
    require_finite(result)
    return result
