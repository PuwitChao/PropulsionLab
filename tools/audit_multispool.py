import requests
import sys

BASE_URL = "http://localhost:8000"

def audit_multispool_case(name, payload):
    print(f"Auditing Multispool Case: {name}...")
    try:
        r = requests.post(f"{BASE_URL}/analyze/cycle/multispool", json=payload)
        if r.status_code == 200:
            data = r.json()
            print(f"  [PASS] Spec Thrust: {data['spec_thrust']:.2f} Ns/kg, TSFC: {data['tsfc']*1e6:.3f} mg/Ns")
            # Verify basic thermodynamic properties
            stations = data.get("stations", {})
            for st in ['2', '21', '25', '3', '4', '45', '5']:
                if st not in stations:
                    print(f"  [FAIL] Missing station {st} in solved cycle stations: {list(stations.keys())}")
                    return False
            return True
        else:
            print(f"  [FAIL] {r.status_code} - {r.text}")
            return False
    except Exception as e:
        print(f"  [ERROR] {str(e)}")
        return False

if __name__ == "__main__":
    cases = [
        ("Sea Level Static Dry", {
            "alt": 0.0, "mach": 0.01, "opr": 32.0, "bpr": 0.5, "fpr": 2.5, "lpc_pr": 2.0, "tit": 1750.0
        }),
        ("High Alt Cruise Dry", {
            "alt": 11000.0, "mach": 0.8, "opr": 40.0, "bpr": 2.0, "fpr": 1.8, "lpc_pr": 2.5, "tit": 1600.0
        }),
        ("Military High Specific Thrust", {
            "alt": 9000.0, "mach": 1.4, "opr": 25.0, "bpr": 0.25, "fpr": 3.2, "lpc_pr": 1.8, "tit": 1900.0
        }),
        ("High Bypass Civil", {
            "alt": 10600.0, "mach": 0.78, "opr": 45.0, "bpr": 8.0, "fpr": 1.4, "lpc_pr": 3.0, "tit": 1650.0
        }),
    ]
    
    success = True
    for name, payload in cases:
        if not audit_multispool_case(name, payload):
            success = False
            
    if success:
        print("\n==========================================")
        print("  ALL MULTISPOOL AUDIT CASES CONVERGED!   ")
        print("==========================================")
        sys.exit(0)
    else:
        print("\n==========================================")
        print("    MULTISPOOL AUDIT ENCOUNTERED ERRORS!  ")
        print("==========================================")
        sys.exit(1)
