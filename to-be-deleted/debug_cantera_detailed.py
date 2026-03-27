
import cantera as ct
try:
    gas = ct.Solution('gri30.yaml', transport_model='mixture-averaged')
    gas.TP = 300, 101325
    print(f"Cantera Version: {ct.__version__}")
    try: print(f"CP: {gas.cp}")
    except: print("CP NOT FOUND")
    try: print(f"CP_MASS: {gas.cp_mass}")
    except: print("CP_MASS NOT FOUND")
    try: print(f"MEAN_MW: {gas.mean_molecular_weight}")
    except: print("MEAN_MW NOT FOUND")
except Exception as e:
    print(f"ERROR: {str(e)}")
