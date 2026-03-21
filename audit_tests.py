
import requests
import json
import numpy as np

BASE_URL = "http://localhost:8001"

def test_health():
    print("Testing Health Check...")
    r = requests.get(f"{BASE_URL}/health")
    assert r.status_code == 200
    print("  [OK]")

def test_mission():
    print("Testing Mission Analysis...")
    payload = {
        "aircraft_data": {"k": 0.12, "cd0": 0.02},
        "constraints": [{"type": "level", "label": "Cruise", "alt": 11000, "mach": 0.8}],
        "ws_min": 1000, "ws_max": 8000, "ws_steps": 20
    }
    r = requests.post(f"{BASE_URL}/analyze/mission", json=payload)
    if r.status_code != 200:
        raise Exception(f"Mission failed: {r.text}")
    print("  [OK]")

def test_turbojet():
    print("Testing Turbojet Cycle (Cantera)...")
    payload = {
        "alt": 10000, "mach": 0.8, "prc": 25, "tit": 1600,
        "ab_enabled": True, "ab_temp": 2000
    }
    r = requests.post(f"{BASE_URL}/analyze/cycle", json=payload)
    if r.status_code != 200:
        raise Exception(f"Turbojet failed: {r.text}")
    data = r.json()
    print(f"  [OK] Spec Thrust: {data['spec_thrust_installed']:.1f}")

def test_turbofan():
    print("Testing Turbofan Cycle (Mixed Exhaust)...")
    payload = {
        "alt": 11000, "mach": 0.8, "bpr": 6.0, "fpr": 1.6, "opr": 35, "tit": 1650,
        "mixed_exhaust": True, "ab_enabled": False
    }
    r = requests.post(f"{BASE_URL}/analyze/cycle/turbofan", json=payload)
    if r.status_code != 200:
        raise Exception(f"Turbofan failed: {r.text}")
    data = r.json()
    print(f"  [OK] Mixed Turbofan Solved (ST: {data['spec_thrust_installed']:.1f})")

def test_rocket_moc():
    print("Testing Rocket MoC & STL...")
    payload = {"gamma": 1.2, "mach_exit": 3.2, "throat_radius": 0.05}
    r = requests.post(f"{BASE_URL}/analyze/rocket/moc", json=payload)
    assert r.status_code == 200
    print("  [MOC OK]")
    
    r = requests.post(f"{BASE_URL}/analyze/rocket/export/stl", json=payload)
    assert r.status_code == 200
    assert "solid nozzle" in r.text
    print("  [STL OK]")

def test_offdesign():
    print("Testing Off-Design Map (Cantera)...")
    payload = {"alt": 0, "mach": 0.0, "prc": 15, "tit": 1500}
    r = requests.post(f"{BASE_URL}/analyze/offdesign/map", json=payload)
    if r.status_code != 200:
        raise Exception(f"Map failed: {r.text}")
    print("  [MAP OK]")

    print("Testing Throttle Sweep (Cantera)...")
    payload = {"alt": 0, "mach": 0.0, "prc": 15, "tit": 1500, "h_fuel": 42.8e6, "n_points": 10}
    r = requests.post(f"{BASE_URL}/analyze/offdesign/throttle", json=payload)
    if r.status_code != 200:
        raise Exception(f"Throttle failed: {r.text}")
    print("  [THROTTLE OK]")

if __name__ == "__main__":
    try:
        test_health()
        test_mission()
        test_turbojet()
        test_turbofan()
        test_rocket_moc()
        test_offdesign()
        print("\n" + "="*40)
        print("   ALL AUDIT TESTS PASSED SUCCESSFULLY!")
        print("="*40)
    except Exception as e:
        print("\n" + "!"*40)
        print(f"   AUDIT FAILED: {str(e)}")
        print("!"*40)
        import traceback
        traceback.print_exc()
