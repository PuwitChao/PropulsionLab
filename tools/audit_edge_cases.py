
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def audit_endpoint(name, path, payload):
    print(f"Auditing {name}...")
    try:
        r = requests.post(f"{BASE_URL}{path}", json=payload)
        if r.status_code == 200:
            print(f"  [PASS] {name}")
            return True
        else:
            print(f"  [FAIL] {name}: {r.status_code} - {r.text}")
            return False
    except Exception as e:
        print(f"  [ERROR] {name}: {str(e)}")
        return False

# 1. Cycle Edge Cases
audit_endpoint("Turbojet Sea Level Static", "/analyze/cycle", {
    "alt": 0, "mach": 0.001, "prc": 20, "tit": 1600
})
audit_endpoint("Turbofan High Alt Cruise", "/analyze/cycle/turbofan", {
    "alt": 20000, "mach": 1.5, "bpr": 0.5, "fpr": 2.5, "prc": 40, "tit": 1800,
    "mixed_exhaust": True
})

# 2. Rocket Edge Cases
audit_endpoint("Rocket RP1/O2 Extreme OF", "/analyze/rocket", {
    "pc": 10e6, "of_ratio": 2.2, "pe": 101325, "propellant": "RP1/O2", "mode": "shifting"
})
audit_endpoint("Rocket High Expansion Nozzle", "/analyze/rocket", {
    "pc": 15e6, "of_ratio": 6.0, "pe": 100, "propellant": "H2/O2", "mode": "frozen"
})

# 3. Off-Design Map
audit_endpoint("Compressor Map Generation", "/analyze/offdesign/map", {
    "alt": 0, "mach": 0, "prc": 15, "tit": 1500
})

# 4. Mission Constraint
audit_endpoint("Mission Synth Low Wing Loading", "/analyze/mission", {
    "aircraft_data": {"k": 0.1, "cd0": 0.02},
    "constraints": [{"type": "level", "label": "L1", "alt": 0, "mach": 0.2}],
    "ws_min": 10, "ws_max": 100, "ws_steps": 5
})

print("\n--- AUDIT COMPLETE ---")
