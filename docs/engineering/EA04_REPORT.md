# EA-04 mission and diagnostics assurance

Date: 2026-09-07. Status: complete.

## Scope and acceptance

| Task | Result | Evidence |
| --- | --- | --- |
| Mission input and point validity | Explicit failures and null values replace infinity and unknown-type zeros | tests/test_mission_assurance.py |
| Takeoff dimensions | SI ground-roll lower bound replaces the unexplained empirical constant | Work-energy identity and density-scaling tests |
| Breguet units and UI | Explicit mass-flow TSFC or weight-flow SFC, corrected request and response fields | Unit equivalence, fuel-balance identity, and live browser test |
| Diagnostic telemetry | Positive finite values, state ordering, and efficiency bounds checked before classification | Core and HTTP rejection cases |
| Diagnostic interpretation | Screening thresholds replace claims of fault isolation or safe operation | API assertions and failed-result browser test |

## Equations and units

For takeoff, the implementation assumes constant thrust, constant density, zero drag, zero rolling resistance, and a level runway without wind.
Lift-off speed is 1.2 times stall speed. This ratio is a declared model assumption.
From lift balance, Vs squared = 2 (W/S) / (rho CLmax).
From work and energy, acceleration = Vlo squared / (2 s), and T/W = acceleration / g.
Thus T/W = 1.2 squared (W/S) / (rho0 sigma g CLmax s).
The denominator has pressure units, so T/W is dimensionless.

This is an ideal ground-roll lower bound. It excludes rotation, climb, obstacle clearance, thrust lapse, and runway losses.
It cannot establish required runway length or field performance.
The [Virginia Tech takeoff chapter](https://pressbooks.lib.vt.edu/aerodynamics/chapter/chapter-7-accelerated-performance-takeoff-and-landing/) describes acceleration and separate airborne segments.
The implemented equation is the stated zero-loss reduction of the force balance, not a fitted empirical correlation from that source.

For Breguet cruise, mass-flow TSFC c has units kg/(N s). Weight-flow SFC cW = g c has units 1/s.
The fuel balance is dW/dt = -g c W/(L/D). Integration gives time = (L/D) ln(Wi/Wf)/(g c).
Range = V time. Constant speed, TSFC, and lift-to-drag ratio are required assumptions.
[NASA defines TSFC as fuel mass flow divided by thrust](https://www.grc.nasa.gov/www/k-12/airplane/sfc.html).
The [Virginia Tech range chapter](https://pressbooks.lib.vt.edu/aerodynamics/chapter/chapter-6-range-and-endurance/) explicitly identifies SFC unit ambiguity.
The g conversion follows the SI mass-to-weight relation. It is not an empirical correction.

The legacy sfc_1_per_s field retains its literal inverse-second meaning.
The new tsfc_kg_per_n_s field accepts mass-flow TSFC. The API rejects both fields together and rejects unknown fields.
The default now uses mass-flow TSFC 1.6e-5 kg/(N s). Old explicit inverse-second requests retain their numerical result.
The UI example uses 15 mg/(N s), Mach 0.78, 11 km, L/D 16, and mass 75,000 to 45,000 kg.
Weights sent to the API use newtons. Range and time use the actual range_km and flight_time_hours response fields.

## Diagnostics contract

The model requires simultaneous stagnation telemetry and constant supplied specific heat ratios greater than one.
Compressor pressure and temperature must rise. Turbine pressure and temperature must fall.
The conventional combustor must heat the flow without a pressure gain.
Efficiencies outside (0, 1], with a 1e-9 numerical tolerance, reject the result before threshold classification.
Pressure-gain combustion and nonadiabatic components are outside this diagnostic model.

The response status now uses OUTSIDE_VALIDATED_DOMAIN for numerically accepted telemetry.
The diagnostic_status field is WITHIN_THRESHOLDS or THRESHOLD_EXCEEDED.
Alert identifiers describe low compressor efficiency, low turbine efficiency, or high combustor pressure loss.
The 84%, 86%, and 6% thresholds remain inherited, uncalibrated screening values.
They do not identify mechanical causes. Measurement uncertainty and operating-point reference data are unavailable.
Consumers of the old NOMINAL, FAULT_DETECTED, or mechanical-cause identifiers must update.

## Result interpretation

Every constraint point retains its status and input wing loading. Failed values remain null.
A wing loading is excluded from the sampled optimum if any required constraint fails there.
The optimum minimizes required T/W over the supplied samples. It does not minimize aircraft size or establish a global optimum.
Mission curves use local thrust requirements without an engine lapse model. The selected T/W limit of one is a display comparison.
The UI exports full results with assurance metadata. It shows errors and clears old metrics after a failed request.

## Verification

Focused backend checks: 23 passed. Frontend lint, five unit tests, and production build passed.
Full backend: 196 passed in 98.27 seconds, with the two previously recorded warnings.
Affected browser suite: nine passed in 21.6 seconds. The Breguet result screenshot was visually inspected.
The browser cases include the real Breguet request and response, failed mission chart gaps, and invalid telemetry after a previous result.
The previous tests changed where they accepted infinite constraints, zero invalid efficiencies, or unsupported safety and fault claims.
No independent flight-test or calibrated engine benchmark is available. These changes verify equations and software behavior, not operational accuracy.

## Repeated solver audit

The repeated API audit passed 50 cases, with zero failures and zero non-finite JSON values.
It covered cycle, rocket, off-design, mission, MoC, export, Breguet, and invalid diagnostics paths.
This checks API behavior and finite results. HTTP 200 alone does not establish physical validity or validated accuracy.
The RP1 case uses the existing propane surrogate, not an RP1 chemical mechanism.
The first audit run used an incorrect unsupported-species expectation for that case. The corrected full audit passed.

The audit ran through FastAPI TestClient without a network server. Reproduce it with the following Python code:

```python
import runpy
import sys
import requests
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)
def post(url, json, timeout=30):
    return client.post(url.removeprefix('http://127.0.0.1:8000'), json=json)
requests.post = post
sys.argv = ['tools/audit_edge_cases.py', '--fuzz']
runpy.run_path('tools/audit_edge_cases.py', run_name='__main__')
```

No dependency installation, commit, or push was performed for EA-04.
EA-05 is the next authorized work package. It must distinguish algebraic checks from independent model validation.
