import cantera as ct
gas = ct.Solution('nDodecane_Reitz.yaml')
for s in ['c2h5oh', 'ch3oh', 'nh3']:
    print(f"{s}: {s in [sp.name.lower() for sp in gas.species()]}")
