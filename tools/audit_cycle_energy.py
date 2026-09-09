"""Measure legacy cycle approximations without changing solver behavior."""
from pathlib import Path
import hashlib
import json
import math
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
import cantera as ct
from core.gas_turbine.cycle import CycleAnalyzer, get_gas_props
from core.solver_result import require_finite
from core.units import isa_atmosphere, R_AIR


def proxy_state(temperature, pressure, fuel_ratio):
    """Reconstruct the current documented property proxy for an audit."""
    gas = ct.Solution('gri30.yaml')
    gas.TP = temperature, pressure
    if fuel_ratio:
        gas.set_equivalence_ratio(fuel_ratio / .068, 'CH4', 'O2:1,N2:3.76')
    else:
        gas.X = 'N2:.79,O2:.21'
    return gas


def audit_case(altitude_m, mach, t4=2200.):
    pressure, temperature, _ = isa_atmosphere(altitude_m)
    model = CycleAnalyzer(pressure, temperature, mach)
    result = model.solve_ramjet(t4)
    fuel_ratio = result['f_total']
    ambient = proxy_state(temperature, pressure, 0.)
    r_air = ct.gas_constant / ambient.mean_molecular_weight
    gamma_air = ambient.cp_mass / ambient.cv_mass
    velocity = mach * math.sqrt(gamma_air * r_air * temperature)
    total = proxy_state(model.tt0, model.pt0, 0.)
    inlet_residual = total.enthalpy_mass - ambient.enthalpy_mass - velocity**2 / 2
    station4 = result['stations'][4]
    hot = proxy_state(t4, station4['pt'], fuel_ratio)
    y_fuel = hot['CH4'].Y[0]
    actual_ratio = float(y_fuel / (1 - y_fuel))
    inlet_gamma = get_gas_props(model.tt0, result['stations'][2]['pt'])[0]
    model_velocity = mach * math.sqrt(inlet_gamma * R_AIR * temperature)
    gamma = hot.cp_mass / hot.cv_mass
    gas_constant = ct.gas_constant / hot.mean_molecular_weight
    v9, p9, t9, _ = model._nozzle_exit(result['stations'][9]['pt'], t4, pressure, gamma, gas_constant)
    inlet_h = hot.enthalpy_mass
    hot.TP = t9, p9
    nozzle_residual = inlet_h - hot.enthalpy_mass - v9**2 / 2
    pressure_force = (p9-pressure) * gas_constant*t9/p9*(1+fuel_ratio)/v9
    jet_power = .5*(1+fuel_ratio)*v9**2 + pressure_force*v9 - .5*model_velocity**2
    useful_power = result['spec_thrust']*model_velocity
    row = {
        'inputs': {'altitude_m': altitude_m, 'mach': mach, 't4_k': t4},
        'solver_status': result['status'],
        'reported_efficiencies': {k: result[k] for k in ('eta_thermal','eta_propulsive','eta_overall')},
        'diagnostic_outputs': result['assurance'].get('diagnostic_outputs', {}),
        'requested_fuel_air_ratio': fuel_ratio,
        'property_proxy_fuel_air_ratio': actual_ratio,
        'proxy_ratio_relative_difference': actual_ratio/fuel_ratio-1,
        'freestream_energy_residual_j_per_kg_air': inlet_residual,
        'freestream_kinetic_energy_j_per_kg_air': velocity**2/2,
        'ambient_property_velocity_m_per_s': velocity,
        'legacy_thrust_velocity_m_per_s': model_velocity,
        'frozen_proxy_nozzle_energy_residual_j_per_kg_gas': nozzle_residual,
        'exit_velocity_m_per_s': v9,
        'pressure_force_n_per_kg_per_s_air': pressure_force,
        'jet_power_j_per_kg_air': jet_power,
        'useful_power_j_per_kg_air': useful_power,
        'jet_minus_useful_power_j_per_kg_air': jet_power-useful_power,
    }
    require_finite(row)
    return row


def build_report():
    paths = ['core/gas_turbine/cycle.py','core/gas_turbine/thermo.py','core/units.py',
             'core/solver_result.py','tools/audit_cycle_energy.py']
    return {
        'schema_version': '1.0', 'cantera_version': ct.__version__,
        'purpose': 'Diagnostic approximation audit, not independent engine validation.',
        'residual_convention': 'Energy entering minus energy leaving. Frozen proxy composition is held constant for each enthalpy difference.',
        'source_sha256': {p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths},
        'cases': [audit_case(altitude, mach) for altitude in (0,11000) for mach in (1.5,2,3)],
        'validated_domain': None,
    }


if __name__ == '__main__':
    report = build_report()
    require_finite(report)
    target = ROOT/'docs/engineering/EA06_CYCLE_ENERGY.json'
    target.write_text(json.dumps(report,indent=2,allow_nan=False)+'\n',encoding='utf-8')
    print(target)
    for row in report['cases']:
        print(row['inputs'], row['solver_status'],
              'inlet residual:', round(row['freestream_energy_residual_j_per_kg_air'],2),
              'nozzle residual:', round(row['frozen_proxy_nozzle_energy_residual_j_per_kg_gas'],2))
