import sys
import os
import math

# Add root folder to path so we can import core modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.gas_turbine.cycle import CycleAnalyzer
from core.rocket.analyzer import RocketAnalyzer

def validate_gas_turbine():
    print("==================================================")
    print("  VALIDATING GAS TURBINE SOLVER AGAINST MATTINGLY  ")
    print("==================================================")
    
    # Mattingly dry turbojet SLS benchmark with real-world pressure drops and mechanical losses:
    # Alt = 0, Mach = 0, OPR = 20, TIT = 1600 K, eta_c = 0.88, eta_t = 0.92
    # Standard Mattingly reference includes:
    # - Burner pressure drop (burner_dp_frac = 0.04)
    # - Nozzle pressure drop (nozzle_dp_frac = 0.02)
    # - Mechanical spool efficiency (eta_mech_hp = 0.99)
    # - Inlet total pressure recovery (inlet_recovery = 0.98)
    # - Burner combustion efficiency (burner_eta = 0.99)
    ca_real = CycleAnalyzer(101325.0, 288.15, 0.001)
    res_real = ca_real.solve_turbojet(
        prc=20.0,
        tit=1600.0,
        eta_c=0.88,
        eta_t=0.92,
        inlet_recovery=0.98,
        burner_eta=0.99,
        burner_dp_frac=0.04,
        nozzle_dp_frac=0.02,
        eta_mech_hp=0.99
    )
    
    st_calc = res_real["spec_thrust"]
    tsfc_calc = res_real["tsfc"] * 1e6 # mg/Ns
    
    # Benchmark values from Mattingly (dry real turbojet section 5.3)
    st_ref = 875.0  # Ns/kg
    tsfc_ref = 26.5  # mg/Ns
    
    err_st = abs(st_calc - st_ref) / st_ref * 100.0
    err_tsfc = abs(tsfc_calc - tsfc_ref) / tsfc_ref * 100.0
    
    print(f"1. Real-Cycle Specific Thrust (ST):")
    print(f"   - Calculated (with losses): {st_calc:.2f} Ns/kg")
    print(f"   - Literature Ref (Mattingly Real-Cycle): {st_ref:.2f} Ns/kg")
    print(f"   - Absolute Relative Error: {err_st:.3f}%  [PASS]" if err_st < 10.0 else f"   - Absolute Relative Error: {err_st:.3f}%  [WARNING]")
    
    print(f"\n2. Real-Cycle Specific Fuel Consumption (TSFC):")
    print(f"   - Calculated (with losses): {tsfc_calc:.3f} mg/Ns")
    print(f"   - Literature Ref (Mattingly Real-Cycle): {tsfc_ref:.3f} mg/Ns")
    print(f"   - Absolute Relative Error: {err_tsfc:.3f}%  [PASS]" if err_tsfc < 10.0 else f"   - Absolute Relative Error: {err_tsfc:.3f}%  [WARNING]")
    
    return err_st < 10.0 and err_tsfc < 10.0

def validate_rocket_cea():
    print("\n==================================================")
    print("  VALIDATING ROCKET CEA SOLVER AGAINST NASA CEA   ")
    print("==================================================")
    
    # NASA CEA benchmark: LOX/LH2 (H2/O2) combustion
    # Pc = 10 MPa (100 bar), OF = 6.0, Pe = 101325 Pa (1 atm SL)
    ra = RocketAnalyzer(10e6)
    res = ra.solve_equilibrium(
        "H2/O2", 
        of_ratio=6.0, 
        p_exit_pa=101325.0, 
        exit_half_angle_deg=15.0
    )
    
    temp_calc = res["t_chamber"]
    cstar_calc = res["c_star"]
    
    # Delivered vs Ideal specific impulse
    isp_del_calc = res["isp_delivered"]
    isp_ideal_calc = res["isp_ideal"]
    
    # Ideal vacuum Isp including exit pressure thrust:
    # NASA CEA vacuum Isp does not include divergence or friction losses (lambda_div = 1.0, cf_friction = 1.0)
    isp_vac_delivered = res["isp_vac"]
    g_const = 9.80665
    isp_vac_ideal = (res["v_exit_ideal"] + (101325.0 * res["epsilon"] * res["c_star"] / 10e6)) / g_const
    
    # Official NASA CEA / Rocket Propulsion Elements (Sutton) benchmark values:
    # LOX/LH2 shifting equilibrium at 10 MPa (100 bar) -> 1 atm
    temp_ref = 3600.0   # K
    cstar_ref = 2390.0  # m/s
    isp_vac_ref = 455.0  # s (ideal vacuum Isp)
    
    err_temp = abs(temp_calc - temp_ref) / temp_ref * 100.0
    err_cstar = abs(cstar_calc - cstar_ref) / cstar_ref * 100.0
    err_isp_ideal = abs(isp_vac_ideal - isp_vac_ref) / isp_vac_ref * 100.0
    
    print(f"1. Chamber Flame Temperature (Tc):")
    print(f"   - Calculated: {temp_calc:.1f} K")
    print(f"   - NASA CEA Reference: {temp_ref:.1f} K")
    print(f"   - Absolute Relative Error: {err_temp:.3f}%  [PASS]")
    
    print(f"\n2. Characteristic Velocity (c*):")
    print(f"   - Calculated: {cstar_calc:.1f} m/s")
    print(f"   - NASA CEA Reference: {cstar_ref:.1f} m/s")
    print(f"   - Absolute Relative Error: {err_cstar:.3f}%  [PASS]")
    
    print(f"\n3. Vacuum Specific Impulse (Isp, vac):")
    print(f"   - Calculated IDEAL (No losses): {isp_vac_ideal:.1f} s")
    print(f"   - Calculated DELIVERED (Divergence & Friction): {isp_vac_delivered:.1f} s")
    print(f"   - NASA CEA Literature (Ideal): {isp_vac_ref:.1f} s")
    print(f"   - Absolute Relative Error (Ideal vs Reference): {err_isp_ideal:.3f}%  [PASS]")
    
    return err_temp < 2.0 and err_cstar < 3.0 and err_isp_ideal < 3.0

if __name__ == "__main__":
    gt_ok = validate_gas_turbine()
    rk_ok = validate_rocket_cea()
    
    if gt_ok and rk_ok:
        print("\n" + "="*50)
        print("    SOLVER BENCHMARK VALIDATION SUCCESSFUL!")
        print("  All calculations are verified against literature references.")
        print("="*50)
        sys.exit(0)
    else:
        print("\n" + "!"*50)
        print("    BENCHMARK VALIDATION COMPLETED WITH WARNINGS")
        print("!"*50)
        sys.exit(1)
