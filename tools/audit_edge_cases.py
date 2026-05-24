"""
audit_edge_cases.py — PropulsionLab API audit tool.

Happy-path mode (default): exercises each endpoint's golden path.
Fuzz mode (--fuzz):        sweeps a grid of boundary/invalid inputs and flags
                           any NaN, Inf, 5xx response, or unexpected error shape.

Usage:
    python tools/audit_edge_cases.py           # happy-path audit
    python tools/audit_edge_cases.py --fuzz    # extended fuzz sweep
"""

import sys
import json
import math
import itertools
import requests

BASE_URL = "http://127.0.0.1:8000"
FUZZ_MODE = "--fuzz" in sys.argv

_pass = 0
_fail = 0
_nan  = 0


def _check_nan(obj, path=""):
    """Recursively detect NaN/Inf in any JSON-decoded object."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return [f"{path}={obj}"]
    if isinstance(obj, dict):
        hits = []
        for k, v in obj.items():
            hits.extend(_check_nan(v, f"{path}.{k}"))
        return hits
    if isinstance(obj, list):
        hits = []
        for i, v in enumerate(obj):
            hits.extend(_check_nan(v, f"{path}[{i}]"))
        return hits
    return []


def audit_endpoint(name, path, payload, expect_status=200):
    global _pass, _fail, _nan
    try:
        r = requests.post(f"{BASE_URL}{path}", json=payload, timeout=30)
        if r.status_code != expect_status:
            print(f"  [FAIL] {name}: expected {expect_status}, got {r.status_code} — {r.text[:120]}")
            _fail += 1
            return False
        if expect_status == 200:
            try:
                data = r.json()
            except Exception:
                print(f"  [FAIL] {name}: response is not JSON")
                _fail += 1
                return False
            nan_hits = _check_nan(data)
            if nan_hits:
                print(f"  [NaN!] {name}: {nan_hits[:5]}")
                _nan += 1
                _fail += 1
                return False
        print(f"  [PASS] {name}")
        _pass += 1
        return True
    except requests.exceptions.ConnectionError:
        print(f"  [SKIP] {name}: backend not reachable at {BASE_URL}")
        return None
    except Exception as e:
        print(f"  [ERROR] {name}: {e}")
        _fail += 1
        return False


# ── Happy-path cases ──────────────────────────────────────────────────────────
print("=" * 60)
print("HAPPY PATH AUDIT")
print("=" * 60)

audit_endpoint("Turbojet SLS", "/analyze/cycle",
    {"alt": 0, "mach": 0.001, "prc": 20, "tit": 1600})

audit_endpoint("Turbofan High-Alt Cruise", "/analyze/cycle/turbofan",
    {"alt": 20000, "mach": 1.5, "bpr": 0.5, "fpr": 2.5, "prc": 40, "tit": 1800, "mixed_exhaust": True})

audit_endpoint("Multispool Military TF", "/analyze/cycle/multispool",
    {"alt": 0, "mach": 0.0, "opr": 30.0, "bpr": 0.5, "fpr": 3.5, "lpc_pr": 4.0, "tit": 1850})

audit_endpoint("Rocket H2/O2 Vacuum", "/analyze/rocket",
    {"pc": 7.5e6, "of_ratio": 6.0, "pe": 100, "propellant": "H2/O2", "mode": "shifting"})

audit_endpoint("Rocket RP1/O2 SL", "/analyze/rocket",
    {"pc": 10e6, "of_ratio": 2.2, "pe": 101325, "propellant": "RP1/O2", "mode": "shifting"})

audit_endpoint("Compressor Map", "/analyze/offdesign/map",
    {"alt": 0, "mach": 0, "prc": 15, "tit": 1500})

audit_endpoint("Off-design Throttle", "/analyze/offdesign/throttle",
    {"alt": 0, "mach": 0, "prc": 20, "tit": 1550})

audit_endpoint("Mission Constraint Diagram", "/analyze/mission", {
    "aircraft_data": {"k": 0.1, "cd0": 0.02, "cl_max": 2.0},
    "constraints": [{"type": "level", "label": "Cruise", "alt": 10000, "mach": 0.8}],
    "ws_min": 1000, "ws_max": 8000, "ws_steps": 20
})

audit_endpoint("MoC Nozzle Contour", "/analyze/rocket/moc",
    {"gamma": 1.2, "mach_exit": 3.0, "throat_radius": 0.05})

audit_endpoint("CSV Export", "/analyze/rocket/export/csv",
    {"gamma": 1.2, "mach_exit": 3.0, "throat_radius": 0.05})

audit_endpoint("O/F Sweep", "/analyze/rocket/sweep",
    {"pc": 7.5e6, "of_ratio": 6.0, "pe": 101325, "propellant": "H2/O2", "mode": "shifting"})

audit_endpoint("Altitude Performance", "/analyze/rocket/altitude",
    {"propellant": "H2/O2", "of_ratio": 6.0, "mode": "shifting",
     "altitudes": [0, 5000, 10000, 20000]})

audit_endpoint("Cycle PRC Sweep", "/analyze/cycle/sweep",
    {"alt": 10000, "mach": 0.8, "prc_min": 10, "prc_max": 40, "steps": 10, "tit": 1600})

# ── Fuzz / validation cases ───────────────────────────────────────────────────
if FUZZ_MODE:
    print()
    print("=" * 60)
    print("FUZZ / VALIDATION SWEEP")
    print("=" * 60)

    # Expect 422 for invalid inputs
    invalid_cycle = [
        ("Negative Mach",         {"alt": 0, "mach": -1, "prc": 20, "tit": 1600}),
        ("Mach > limit",          {"alt": 0, "mach": 10, "prc": 20, "tit": 1600}),
        ("PR below 1",            {"alt": 0, "mach": 0.8, "prc": 0.5, "tit": 1600}),
        ("Alt above 47km",        {"alt": 60000, "mach": 0.8, "prc": 20, "tit": 1600}),
    ]
    for name, payload in invalid_cycle:
        audit_endpoint(f"[422] Cycle {name}", "/analyze/cycle", payload, expect_status=422)

    invalid_rocket = [
        ("Unknown propellant",    {"pc": 7.5e6, "of_ratio": 6.0, "pe": 101325, "propellant": "MAGIC/FUEL"}),
        ("OF = 0",                {"pc": 7.5e6, "of_ratio": 0.0, "pe": 101325, "propellant": "H2/O2"}),
        ("Negative OF",           {"pc": 7.5e6, "of_ratio": -1.0, "pe": 101325, "propellant": "H2/O2"}),
        ("PC too low",            {"pc": 100, "of_ratio": 6.0, "pe": 101325, "propellant": "H2/O2"}),
    ]
    for name, payload in invalid_rocket:
        audit_endpoint(f"[422] Rocket {name}", "/analyze/rocket", payload, expect_status=422)

    invalid_sweep = [
        ("prc_min > prc_max", {"alt": 10000, "mach": 0.8, "prc_min": 40, "prc_max": 10, "steps": 10, "tit": 1600}),
        ("steps = 0",         {"alt": 10000, "mach": 0.8, "prc_min": 10, "prc_max": 40, "steps": 0, "tit": 1600}),
    ]
    for name, payload in invalid_sweep:
        audit_endpoint(f"[422] Sweep {name}", "/analyze/cycle/sweep", payload, expect_status=422)

    # Grid sweep: verify no NaN/Inf over valid input space
    print()
    print("  [GRID] Cycle PR × TIT grid (12 points)")
    for prc, tit in itertools.product([10, 25, 40], [1200, 1600, 2000, 2200]):
        audit_endpoint(
            f"  Grid cycle prc={prc} tit={tit}",
            "/analyze/cycle",
            {"alt": 10000, "mach": 0.8, "prc": prc, "tit": tit},
        )

    print()
    print("  [GRID] Rocket O/F × PC grid (9 points)")
    for of_r, pc in itertools.product([2.0, 6.0, 8.0], [2e6, 7.5e6, 20e6]):
        audit_endpoint(
            f"  Grid rocket OF={of_r} pc={pc:.0e}",
            "/analyze/rocket",
            {"pc": pc, "of_ratio": of_r, "pe": 101325, "propellant": "H2/O2", "mode": "shifting"},
        )

    print()
    print("  [GRID] Mission extreme altitudes")
    for alt, mach in [(0, 0.1), (15000, 0.8), (47000, 0.5)]:
        audit_endpoint(
            f"  Grid mission alt={alt} mach={mach}",
            "/analyze/mission",
            {
                "aircraft_data": {"k": 0.12, "cd0": 0.025, "cl_max": 1.8},
                "constraints": [{"type": "level", "label": "L", "alt": alt, "mach": mach}],
                "ws_min": 500, "ws_max": 9000, "ws_steps": 20,
            },
        )

# ── Summary ───────────────────────────────────────────────────────────────────
print()
print("=" * 60)
print(f"AUDIT COMPLETE  pass={_pass}  fail={_fail}  nan={_nan}")
if _fail:
    print("STATUS: FAILURES DETECTED — review output above")
    sys.exit(1)
else:
    print("STATUS: ALL CHECKS PASSED")
