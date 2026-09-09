"""Explicit methane research burner and ramjet. Not a Jet-A replacement."""
from dataclasses import dataclass, asdict
import math
import cantera as ct
from .state import GasState, state_tp, methane_air_state, frozen_state, _solution, _snapshot
from .flow import freestream_total, convergent_nozzle
from .shaft import compressor, match_turbine
from ..errors import InputValidationError, PhysicalInfeasibilityError, ConvergenceError, ThermochemistryError
from ..solver_result import assurance, require_finite


@dataclass(frozen=True)
class BurnerResult:
    products: GasState
    fuel_air_ratio: float
    energy_residual_j_per_kg_air: float
    element_residuals_kg_per_kg_air: tuple[tuple[str, float], ...]
    iterations: int
    fuel_temperature_k: float
    heat_loss_j_per_kg_air: float


def _methane_heat(air: GasState, target_temperature_k: float, pressure_pa: float, *,
                   fuel_temperature_k: float = 300., heat_loss_j_per_kg_air: float = 0.,
                   max_iterations: int = 64) -> BurnerResult:
    """Solve the lean CH4 branch with TP equilibrium and formation-enthalpy balance."""
    values = (target_temperature_k, pressure_pa, fuel_temperature_k, heat_loss_j_per_kg_air)
    if not all(math.isfinite(v) for v in values) or min(values[:3]) <= 0 or heat_loss_j_per_kg_air < 0:
        raise InputValidationError('Burner states must be positive and finite. Heat loss must be nonnegative.')
    if target_temperature_k <= air.temperature_k or pressure_pa > air.pressure_pa:
        raise PhysicalInfeasibilityError('The burner must heat the air without pressure gain.')
    if not isinstance(max_iterations, int) or max_iterations < 1:
        raise InputValidationError('Iteration limit must be a positive integer.')
    air_y = dict(air.mass_fractions)
    fuel = state_tp(fuel_temperature_k, pressure_pa, {'CH4':1.})
    gas = _solution()
    elements = dict(air.element_mass_fractions)
    # Excess oxygen atoms after complete oxidation of existing carbon and hydrogen.
    excess = (elements['O']/gas.atomic_weight('O') - 2*elements['C']/gas.atomic_weight('C')
              - .5*elements['H']/gas.atomic_weight('H'))
    stoich = excess * gas.molecular_weights[gas.species_index('CH4')]/4
    if stoich <= 0:
        raise PhysicalInfeasibilityError('The inlet has no excess oxygen for additional methane.')
    def evaluate(ratio):
        masses = dict(air_y)
        masses['CH4'] = masses.get('CH4',0.) + ratio
        try:
            gas.TPY = target_temperature_k, pressure_pa, masses
            gas.equilibrate('TP')
        except ct.CanteraError as exc:
            raise ThermochemistryError('Methane product equilibrium failed.') from exc
        products = _snapshot(gas)
        residual = (1+ratio)*products.enthalpy_j_per_kg-air.enthalpy_j_per_kg-ratio*fuel.enthalpy_j_per_kg+heat_loss_j_per_kg_air
        return products, residual
    low, high = 0., float(stoich)
    _, r_low = evaluate(low)
    products, r_high = evaluate(high)
    if r_low <= 0 or r_high > 0:
        raise PhysicalInfeasibilityError('The target is not bracketed on the lean methane branch.',
            fuel_air_bounds=[low,high], residual_bounds_j_per_kg_air=[r_low,r_high])
    tolerance = .1 + 1e-6*max(abs(air.enthalpy_j_per_kg), air.cp_j_per_kg_k*air.temperature_k)
    for iteration in range(1,max_iterations+1):
        ratio = .5*(low+high)
        products,residual = evaluate(ratio)
        if abs(residual) <= tolerance:
            break
        if residual > 0:
            low = ratio
        else:
            high = ratio
    else:
        raise ConvergenceError('The methane fuel root did not converge.', iterations=max_iterations, residual_j_per_kg_air=residual)
    a, f = dict(air.element_mass_fractions),dict(fuel.element_mass_fractions)
    elements = tuple((e,(1+ratio)*y-a[e]-ratio*f[e]) for e,y in products.element_mass_fractions)
    return BurnerResult(products,ratio,residual,elements,iteration,fuel_temperature_k,heat_loss_j_per_kg_air)


def methane_burner(air: GasState, target_temperature_k: float, pressure_pa: float, *,
                   fuel_temperature_k: float = 300., heat_loss_j_per_kg_air: float = 0.,
                   max_iterations: int = 64) -> BurnerResult:
    """Solve methane combustion in an O2/N2 air stream. Residuals use inlet-air mass."""
    air_y = dict(air.mass_fractions)
    if set(air_y)-{'O2','N2'} or air_y.get('O2',0) <= 0:
        raise InputValidationError('The methane burner requires an O2/N2 air stream.')
    return _methane_heat(air,target_temperature_k,pressure_pa,fuel_temperature_k=fuel_temperature_k,
                         heat_loss_j_per_kg_air=heat_loss_j_per_kg_air,max_iterations=max_iterations)


@dataclass(frozen=True)
class AfterburnerResult:
    products: GasState
    added_fuel_per_inlet_gas: float
    outlet_mass_per_inlet_gas: float
    energy_residual_j_per_kg_inlet_gas: float
    element_residuals_kg_per_kg_inlet_gas: tuple[tuple[str, float], ...]
    iterations: int
    fuel_temperature_k: float
    heat_loss_j_per_kg_inlet_gas: float


def methane_afterburner(inlet: GasState, target_temperature_k: float, pressure_pa: float, *,
                        fuel_temperature_k: float = 300., heat_loss_j_per_kg_inlet_gas: float = 0.,
                        max_iterations: int = 64) -> AfterburnerResult:
    """Re-equilibrate an oxygen-rich stream with added methane. Basis: kg of inlet gas."""
    result = _methane_heat(inlet,target_temperature_k,pressure_pa,fuel_temperature_k=fuel_temperature_k,
                          heat_loss_j_per_kg_air=heat_loss_j_per_kg_inlet_gas,max_iterations=max_iterations)
    return AfterburnerResult(result.products,result.fuel_air_ratio,1+result.fuel_air_ratio,
        result.energy_residual_j_per_kg_air,result.element_residuals_kg_per_kg_air,result.iterations,
        fuel_temperature_k,heat_loss_j_per_kg_inlet_gas)


def methane_ramjet(pressure_pa: float, temperature_k: float, mach: float, burner_temperature_k: float, *,
                   inlet_pressure_recovery: float = 1., burner_pressure_loss: float = .06,
                   nozzle_pressure_loss: float = .02, fuel_temperature_k: float = 300.,
                   heat_loss_j_per_kg_air: float = 0.) -> dict:
    """Run a declared methane model with equilibrium burner and frozen convergent nozzle."""
    if not math.isfinite(mach) or not 1 <= mach <= 5:
        raise InputValidationError('The research ramjet supports Mach 1 through 5.')
    for loss in (burner_pressure_loss,nozzle_pressure_loss):
        if not math.isfinite(loss) or not 0 <= loss < 1:
            raise InputValidationError('Pressure loss fractions must be in [0,1).')
    ambient = methane_air_state(temperature_k,pressure_pa,0.)
    inlet = freestream_total(ambient,mach,inlet_pressure_recovery)
    burner = methane_burner(inlet.total,burner_temperature_k,inlet.total.pressure_pa*(1-burner_pressure_loss),
                            fuel_temperature_k=fuel_temperature_k,heat_loss_j_per_kg_air=heat_loss_j_per_kg_air)
    nozzle_total = frozen_state(burner.products,burner.products.pressure_pa*(1-nozzle_pressure_loss),
                                enthalpy_j_per_kg=burner.products.enthalpy_j_per_kg)
    nozzle = convergent_nozzle(nozzle_total,pressure_pa)
    mass = 1+burner.fuel_air_ratio
    area = mass/nozzle.mass_flux_kg_per_m2_s
    pressure_thrust = (nozzle.exit.pressure_pa-pressure_pa)*area
    thrust = mass*nozzle.velocity_m_per_s-inlet.velocity_m_per_s+pressure_thrust
    status = 'OUTSIDE_VALIDATED_DOMAIN' if thrust > 0 else 'INFEASIBLE'
    meta = assurance('methane_ramjet_research', {'pressure_pa':pressure_pa,'temperature_k':temperature_k,'mach':mach,
        'burner_temperature_k':burner_temperature_k,'inlet_pressure_recovery':inlet_pressure_recovery,
        'burner_pressure_loss':burner_pressure_loss,'nozzle_pressure_loss':nozzle_pressure_loss,
        'fuel_temperature_k':fuel_temperature_k,'heat_loss_j_per_kg_air':heat_loss_j_per_kg_air},
        status=status, physical_valid=thrust>0,
        warnings=['Efficiency metrics are unavailable pending a reviewed pressure-energy control volume.'],
        assumptions=['Pure methane fuel; GRI30 formation enthalpies; no independent LHV.',
                     'Lean equilibrium burner; frozen convergent nozzle; prescribed pressure losses.',
                     'Fuel injection has no axial momentum contribution.'])
    result = {'model':'methane_ramjet_research','fuel':'CH4','status':status,'assurance':meta,
        'spec_thrust':thrust,'tsfc':burner.fuel_air_ratio/thrust if thrust>0 else None,
        'f_total':burner.fuel_air_ratio,'eta_thermal':None,'eta_propulsive':None,'eta_overall':None,
        'pressure_thrust_n_per_kg_per_s_air':pressure_thrust,'exit_area_m2_per_kg_per_s_air':area,
        'inlet':asdict(inlet),'burner':asdict(burner),'nozzle':asdict(nozzle)}
    require_finite(result)
    return result


def methane_turbojet(pressure_pa: float, temperature_k: float, mach: float, burner_temperature_k: float, *,
                   compressor_pressure_ratio: float = 10., compressor_isentropic_efficiency: float = .88,
                   turbine_isentropic_efficiency: float = .9, shaft_mechanical_efficiency: float = .98,
                   inlet_pressure_recovery: float = 1., burner_pressure_loss: float = .06,
                   nozzle_pressure_loss: float = .02, fuel_temperature_k: float = 300.,
                   heat_loss_j_per_kg_air: float = 0., afterburner_temperature_k: float | None = None,
                   afterburner_pressure_loss: float = .03, afterburner_heat_loss_j_per_kg_inlet_gas: float = 0.) -> dict:
    """Run a single-shaft methane turbojet with a matched frozen turbine."""
    if not math.isfinite(mach) or not 0 <= mach <= 5:
        raise InputValidationError('The research turbojet supports Mach 0 through 5.')
    for loss in (burner_pressure_loss,nozzle_pressure_loss,afterburner_pressure_loss):
        if not math.isfinite(loss) or not 0 <= loss < 1:
            raise InputValidationError('Pressure loss fractions must be in [0,1).')
    if not math.isfinite(compressor_pressure_ratio) or compressor_pressure_ratio < 1:
        raise InputValidationError('Compressor pressure ratio must be finite and at least one.')
    if not math.isfinite(afterburner_heat_loss_j_per_kg_inlet_gas) or afterburner_heat_loss_j_per_kg_inlet_gas < 0:
        raise InputValidationError('Afterburner heat loss must be finite and nonnegative.')
    if afterburner_temperature_k is not None and (not math.isfinite(afterburner_temperature_k) or afterburner_temperature_k <= 0):
        raise InputValidationError('Afterburner temperature must be finite and positive.')
    ambient = methane_air_state(temperature_k,pressure_pa,0.)
    inlet = freestream_total(ambient,mach,inlet_pressure_recovery)
    comp = compressor(inlet.total,inlet.total.pressure_pa*compressor_pressure_ratio,compressor_isentropic_efficiency)
    burner = methane_burner(comp.outlet,burner_temperature_k,comp.outlet.pressure_pa*(1-burner_pressure_loss),
                            fuel_temperature_k=fuel_temperature_k,heat_loss_j_per_kg_air=heat_loss_j_per_kg_air)
    # Reserve positive pressure for the convergent nozzle after its prescribed loss.
    afterburner_recovery = 1-afterburner_pressure_loss if afterburner_temperature_k is not None else 1.
    minimum_turbine_pressure = pressure_pa/((1-nozzle_pressure_loss)*afterburner_recovery)*(1+1e-8)
    shaft = match_turbine(burner.products,comp.work_j_per_kg_gas,minimum_turbine_pressure,
        gas_mass_per_core_air=1+burner.fuel_air_ratio,isentropic_efficiency=turbine_isentropic_efficiency,
        mechanical_efficiency=shaft_mechanical_efficiency)
    afterburner = None
    nozzle_inlet = shaft.stage.outlet
    added_fuel_per_core_air = 0.
    if afterburner_temperature_k is not None:
        afterburner = methane_afterburner(nozzle_inlet,afterburner_temperature_k,
            nozzle_inlet.pressure_pa*afterburner_recovery,fuel_temperature_k=fuel_temperature_k,
            heat_loss_j_per_kg_inlet_gas=afterburner_heat_loss_j_per_kg_inlet_gas)
        added_fuel_per_core_air = (1+burner.fuel_air_ratio)*afterburner.added_fuel_per_inlet_gas
        nozzle_inlet = afterburner.products
    total_fuel = burner.fuel_air_ratio+added_fuel_per_core_air
    nozzle_total = frozen_state(nozzle_inlet,nozzle_inlet.pressure_pa*(1-nozzle_pressure_loss),
                                enthalpy_j_per_kg=nozzle_inlet.enthalpy_j_per_kg)
    nozzle = convergent_nozzle(nozzle_total,pressure_pa)
    mass = 1+total_fuel
    area = mass/nozzle.mass_flux_kg_per_m2_s
    pressure_thrust = (nozzle.exit.pressure_pa-pressure_pa)*area
    thrust = mass*nozzle.velocity_m_per_s-inlet.velocity_m_per_s+pressure_thrust
    status = 'OUTSIDE_VALIDATED_DOMAIN' if thrust > 0 else 'INFEASIBLE'
    meta = assurance('methane_turbojet_research', {'pressure_pa':pressure_pa,'temperature_k':temperature_k,'mach':mach,
        'compressor_pressure_ratio':compressor_pressure_ratio,'compressor_isentropic_efficiency':compressor_isentropic_efficiency,
        'turbine_isentropic_efficiency':turbine_isentropic_efficiency,'shaft_mechanical_efficiency':shaft_mechanical_efficiency,
        'burner_temperature_k':burner_temperature_k,'inlet_pressure_recovery':inlet_pressure_recovery,
        'burner_pressure_loss':burner_pressure_loss,'nozzle_pressure_loss':nozzle_pressure_loss,
        'fuel_temperature_k':fuel_temperature_k,'heat_loss_j_per_kg_air':heat_loss_j_per_kg_air,
        'afterburner_temperature_k':afterburner_temperature_k,'afterburner_pressure_loss':afterburner_pressure_loss,
        'afterburner_heat_loss_j_per_kg_inlet_gas':afterburner_heat_loss_j_per_kg_inlet_gas},
        status=status, physical_valid=thrust>0,
        warnings=['Efficiency metrics are unavailable pending a reviewed pressure-energy control volume.'],
        assumptions=['Pure methane fuel; GRI30 formation enthalpies; no independent LHV.',
                     'Lean equilibrium burner; frozen convergent nozzle; prescribed pressure losses.',
                     'Fuel injection has no axial momentum contribution.'])
    result = {'model':'methane_turbojet_research','fuel':'CH4','status':status,'assurance':meta,
        'spec_thrust':thrust,'tsfc':total_fuel/thrust if thrust>0 else None,
        'f_total':total_fuel,'f_main':burner.fuel_air_ratio,'f_afterburner':added_fuel_per_core_air,
        'afterburner':asdict(afterburner) if afterburner else None,'eta_thermal':None,'eta_propulsive':None,'eta_overall':None,
        'pressure_thrust_n_per_kg_per_s_air':pressure_thrust,'exit_area_m2_per_kg_per_s_air':area,
        'compressor':asdict(comp),'shaft':asdict(shaft),'inlet':asdict(inlet),'burner':asdict(burner),'nozzle':asdict(nozzle)}
    require_finite(result)
    return result
