
import sys
import os
import math

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.rocket.analyzer import RocketAnalyzer
from core.gas_turbine.cycle import CycleAnalyzer

def validate_rocket():
    print("--- ROCKET VALIDATION: H2/O2 Case ---")
    print("Conditions: Pc = 100 bar, O/F = 6.0, Pe = 1.01325 bar, Mode = shifting")
    
    analyzer = RocketAnalyzer(100e5)
    res = analyzer.solve_equilibrium(
        propellant_name='H2/O2',
        of_ratio=6.0,
        p_exit_pa=101325.0,
        mode='shifting',
        compute_heat_transfer=False
    )
    
    # Expected (NASA CEA Approximate)
    # T_chamber: ~3600-3700 K
    # Isp_vac: ~450-460 s
    # c_star: ~2300-2400 m/s
    
    print(f"Results:")
    print(f"  Chamber Temp: {res['t_chamber']:.1f} K (Expected ~3650 K)")
    print(f"  Isp Vacuum:   {res['isp_vac']:.1f} s (Expected ~455 s)")
    print(f"  Isp SLS:      {res['isp_sl']:.1f} s (Expected ~380-390 s)")
    print(f"  c*:           {res['c_star']:.1f} m/s (Expected ~2350 m/s)")
    print(f"  Gamma (avg):  {res['gamma']:.4f}")
    
    # Simple check
    error_t = abs(res['t_chamber'] - 3650) / 3650
    error_isp = abs(res['isp_vac'] - 455) / 455
    
    if error_t < 0.05 and error_isp < 0.05:
        print(">> ROCKET VALIDATION PASSED (within 5% of CEA baseline)")
    else:
        print(">> ROCKET VALIDATION WARNING: Significant deviation detected")

def validate_turbojet():
    print("\n--- TURBOJET VALIDATION: Ideal Case ---")
    print("Conditions: SLS (M=0, Alt=0), TIT=1500K, PRC=20, All Eta=1.0 (Ideal)")
    
    # Ideal sea level properties
    p0, t0 = 101325.0, 288.15
    analyzer = CycleAnalyzer(p0, t0, 0.0)
    
    # Set efficiencies to 1.0 for ideal Brayton check
    res = analyzer.solve_turbojet(
        prc=20.0,
        tit=1500.0,
        eta_c=1.0,
        eta_t=1.0,
        inlet_recovery=1.0,
        burner_eta=1.0,
        burner_dp_frac=0.0,
        nozzle_dp_frac=0.0
    )
    
    print(f"Results:")
    print(f"  V9:              {res['v9']:.1f} m/s")
    print(f"  Fuel-Air Ratio:  {res['f']:.5f}")
    print(f"  Specific Thrust: {res['spec_thrust']:.1f} Ns/kg")
    print(f"  TSFC:            {res['tsfc']*1e6:.4f} mg/Ns")
    print(f"  Thermal Eff:     {res['eta_thermal']*100:.2f}%")
    
    # For OPR=20, Gamma=1.4, Ideal Thermal Eff = 1 - 1/OPR^((g-1)/g)
    eta_ideal_brayton = 1 - 1/(20**(0.4/1.4))
    print(f"  Analytical Ideal Thermal Eff: {eta_ideal_brayton*100:.2f}%")
    
    error_eff = abs(res['eta_thermal'] - eta_ideal_brayton)
    if error_eff < 0.01:
        print(">> TURBOJET THERMO VALIDATION PASSED")
    else:
        print(">> TURBOJET THERMO VALIDATION FAILED")

if __name__ == "__main__":
    validate_rocket()
    validate_turbojet()
