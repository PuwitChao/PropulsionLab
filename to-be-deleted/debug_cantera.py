
import cantera as ct
try:
    gas = ct.Solution('gri30.yaml', transport_model='mixture-averaged')
    gas.TP = 300, 101325
    print(f"Cantera Version: {ct.__version__}")
    print(f"Density: {gas.density}")
    print(f"Viscosity: {gas.viscosity}")
    print(f"Thermal Cond: {gas.thermal_conductivity}")
except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
