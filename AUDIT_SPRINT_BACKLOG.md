# PropulsionLab — Codebase Audit: Prioritized Sprint Backlog

**Audit date:** 2026-05-07  
**Scope:** Full codebase — backend API, core physics, frontend, tests, tooling  
**Method:** Static analysis of all source files; cross-referenced against physics references (NASA SP-273, CEA, ISA ICAO Doc 7488)

---

## CRITICAL — Fix Before Any Deployment

| # | Area | File | Description |
|---|------|------|-------------|
| C1 | Security | `backend/main.py:68-74` | CORS set to `allow_origins=["*"]` with credentials — CSRF risk; restrict to known origins |
| C2 | Frontend | `frontend/src/api.js:1` | `API_BASE_URL` hardcoded to `127.0.0.1:8000` — breaks in any non-local environment; use `import.meta.env.VITE_API_URL` |
| C3 | Frontend | `frontend/src/api.js:13-15,31-33` | `fetchData`/`fetchBlob` call `.json()` on error responses without checking `Content-Type`; HTML error pages crash the app |
| C4 | Frontend | `frontend/src/App.jsx` | No React Error Boundary — any runtime render error tears down the entire app with a blank screen |
| C5 | Physics | `core/rocket/moc.py:114,123` | STL export writes `facet normal 0 0 0` for every face — zero normals are rejected by all slicer/CAD tools; compute proper cross-product normals |
| C6 | Physics | `core/gas_turbine/off_design.py:137` | Turbine pressure ratio estimated as `compressor_PR × 0.25` — off by an order of magnitude (gives PR≈6 where real value is ≈0.35–0.5); invalidates entire off-design deck |

---

## SPRINT 5 — Recommended Focus

> Sprint 5 is already targeted for multispool and pending features. Bundle these alongside.

### 5A — Security & Infrastructure

| # | Area | File | Description |
|---|------|------|-------------|
| S5-1 | Security | `backend/main.py:68-74` | Resolve C1 — restrict CORS origins |
| S5-2 | Backend | `backend/main.py:144-198` | Replace bare `except Exception as e: raise HTTPException(detail=str(e))` across all 14 endpoints — log full trace internally, return sanitized `{"error": "..."}` to client |
| S5-3 | Backend | `backend/main.py:139-141` | `ws_steps=0` causes division by zero in mission endpoint — add `ge=1` constraint on the Pydantic field |
| S5-4 | Backend | `backend/main.py:646-666` | Multispool stub — implement (Sprint 5 goal per CLAUDE.md) or return proper HTTP 501 with `{"error": "Not yet implemented"}` |

### 5B — Frontend Critical

| # | Area | File | Description |
|---|------|------|-------------|
| S5-5 | Frontend | `frontend/src/api.js` | Resolve C2 + C3 — env-var base URL, safe JSON error parsing |
| S5-6 | Frontend | `frontend/src/App.jsx` | Resolve C4 — add `<ErrorBoundary>` wrapper around page content |
| S5-7 | Frontend | `frontend/src/api.js` | Add 30-second fetch timeout via `AbortController` / `Promise.race` — currently hangs forever if backend is unresponsive |
| S5-8 | Frontend | `frontend/src/pages/PerformanceMap.jsx:71-74` | Race condition: rapid param changes queue multiple requests; add `AbortController` cancellation in `useEffect` cleanup |

### 5C — Physics: Off-Design (unblocks meaningful throttle sweeps)

| # | Area | File | Description |
|---|------|------|-------------|
| S5-9 | Physics | `core/gas_turbine/off_design.py:137` | Resolve C6 — derive turbine PR from proper thermodynamic work balance, not compressor PR scaling |
| S5-10 | Physics | `core/gas_turbine/off_design.py:131-133` | TIT schedule: `k_tit = 0.65 + 0.35 * throttle` has no physical basis; implement scheduling tied to corrected compressor outlet temperature |
| S5-11 | Physics | `core/gas_turbine/off_design.py:63` | Surge threshold at 10% of choke flow is unrealistic (real surge occurs at ~70-80% speed-line flow); correct the parametric surge line anchor |
| S5-12 | Physics | `core/gas_turbine/off_design.py` | Add turbine work balance validation in `sweep_throttle` — compressor work must equal turbine work at every throttle point |

---

## SPRINT 6 — Physics Correctness: Gas Turbine Cycle

| # | Severity | File | Description |
|---|----------|------|-------------|
| S6-1 | High | `core/gas_turbine/cycle.py:232-234` | Combustor fuel-to-air ratio: enthalpy balance inconsistent — denominator should be `(η_b · h_fuel − h4)`, not mixed cp·T terms; verify against NASA SP-273 |
| S6-2 | High | `core/gas_turbine/cycle.py:264-277` | Afterburner energy balance uses `cp4` (HPC-exit property) on turbine-exit gas — replace with gas props sampled at turbine exit; fix denominator to `η_ab · h_fuel` without subtracting `cp7 · T_ab` |
| S6-3 | High | `core/gas_turbine/cycle.py:244,252` | Turbine temperature calculation uses `cp4 · (1+f)` on one line but `cp_t_avg` with different fuel fraction on the next — make fuel-fraction accounting consistent throughout the turbine work loop |
| S6-4 | Medium | `core/gas_turbine/cycle.py:262` | Afterburner path hardcodes `pt9_in = pt5 × 0.95` and bypasses the `nozzle_dp_frac` parameter used in the non-afterburner path — apply `nozzle_dp_frac` uniformly |
| S6-5 | Medium | `core/gas_turbine/cycle.py:440-443` | Mixed-exhaust turbofan: fuel fraction computed as `f / m_total` where `m_total` includes fuel mass — use `f_mix = f / (1 + bpr)` |
| S6-6 | Medium | `core/gas_turbine/cycle.py:248` | Turbine pressure-ratio lower bound clamped to `1e-4` (allows near-zero pressures); tighten to physically sensible minimum (e.g., 0.05 × P_ambient) |
| S6-7 | Medium | `core/gas_turbine/cycle.py:632` | Multispool: `pt45 = pt4 × 0.5` initial guess diverges for extreme PR; initialize with isentropic estimate |
| S6-8 | Medium | `core/gas_turbine/cycle.py` | No guards against negative absolute temperatures during iteration — add assertion after each major station calculation |
| S6-9 | High | `core/gas_turbine/mission.py:47-57` | Takeoff constraint: empirical constant `k_to = 1.2` is undocumented and inconsistent with standard values (1.5–3.0 depending on surface/engine type) — document source or make configurable |
| S6-10 | Medium | `core/gas_turbine/mission.py:92-97` | Optimum T/W: code computes `max` per W/S then takes `min` across W/S — verify sign convention is correct for constrained minimum-weight sizing |
| S6-11 | Medium | `core/gas_turbine/mission.py:41-45` | Climb angle constraint uses fixed angle without altitude-dependent power — replace with specific excess power (`Ps`) formulation |
| S6-12 | Medium | `core/gas_turbine/off_design.py` | No compressor choke check: if corrected flow exceeds `w_choke`, the map still returns a result — add guard to skip or error that point |

---

## SPRINT 7 — Physics Correctness: Rocket + Aero + Frontend Quality

### 7A — Rocket Analyzer

| # | Severity | File | Description |
|---|----------|------|-------------|
| S7-1 | High | `core/rocket/analyzer.py:258-260` | c* formula unvalidated — cross-check against NASA CEA output for H2/O2 and RP-1/O2 reference cases; correct if deviation > 1% |
| S7-2 | High | `core/rocket/analyzer.py:293` | Vacuum thrust coefficient formula is incorrect — use standard `Cf_vac = Cf_delivered + (p_exit / p_c) × ε` |
| S7-3 | High | `core/rocket/analyzer.py:236-238` | Frozen composition mode re-equilibrates at exit — add post-solve assertion that species mole fractions did not change from chamber values |
| S7-4 | Medium | `core/rocket/analyzer.py` | No validation on `chamber_p_pa` (must be > 0), `of_ratio` (suggest 0.1–50), or exit pressure vs ambient — add guards at class init |
| S7-5 | Medium | `core/rocket/analyzer.py:202` | Invalid propellant name silently falls back to H2/O2 — raise `KeyError` with list of available propellant keys |
| S7-6 | Medium | `core/rocket/analyzer.py:332-345` | Bare `except Exception` in heat transfer calculation swallows all errors silently — log and set a `heat_transfer_error` key in result |
| S7-7 | Medium | `core/rocket/analyzer.py:157` | Wall temperature hardcoded to 600 K for all propellants — add per-propellant defaults or accept as optional parameter |
| S7-8 | Low | `core/rocket/analyzer.py:48` | RP-1 modeled as C3H8 (propane) — document this limitation; consider C10H20 as a better surrogate (~2–5% Isp error) |

### 7B — MoC Nozzle

| # | Severity | File | Description |
|---|----------|------|-------------|
| S7-9 | High | `core/rocket/moc.py:13` | Bell nozzle turndown angle uses `ν_max = PM(Me) / 2` — the factor of ½ is wrong; standard bell nozzle design uses 60–80% of theoretical PM angle |
| S7-10 | High | `core/rocket/moc.py:62,75` | Characteristic lines use linear Mach interpolation, not actual MoC compatibility equations — either implement proper C+/C- kernel-plane solution or label output as "representative visualization only" |
| S7-11 | Medium | `core/rocket/moc.py:9` | No bounds check on `mach_exit` (must be > 1) or `gamma` (valid range 1.05–1.67) — add validation at construction |
| S7-12 | Medium | `core/rocket/moc.py:27-28` | Initial/final divergent angles (24°, 8°) hardcoded with no documentation or parameterization |
| S7-13 | Medium | `core/rocket/moc.py:42` | Nozzle wall contour monotonicity not validated — add post-generation check that radius is non-decreasing |

### 7C — Aerodynamics Module

| # | Severity | File | Description |
|---|----------|------|-------------|
| S7-14 | High | `core/gas_turbine/aero.py` | `degree_of_reaction` parameter accepted but completely unused — implement or remove; it fundamentally affects blade work split |
| S7-15 | High | `core/gas_turbine/aero.py` | No loss model — profile drag, shock, endwall, and secondary losses (5–15% of ideal work) are not estimated; isentropic efficiency cannot be computed |
| S7-16 | High | `core/gas_turbine/aero.py` | No Mach number calculations at each station — critical for transonic rotors (M > 1.2) where shock losses dominate |
| S7-17 | High | `core/gas_turbine/aero.py` | No incidence or deviation angle calculation — required for blade design and off-design loss estimation |
| S7-18 | Medium | `core/gas_turbine/aero.py` | Angle sign convention not documented — same module used for compressor and turbine stages but tangential sign may be wrong for one |

### 7D — Frontend Quality

| # | Severity | File | Description |
|---|----------|------|-------------|
| S7-19 | High | `frontend/src/pages/ParametricCycle.jsx:73-86` | Sensitivity sweep errors caught but `setSensError` never called — user sees a frozen spinner with no feedback; add error state |
| S7-20 | High | `frontend/src/pages/ParametricCycle.jsx:155-166` | `result.stations[s.k]` accessed without existence check — returns `null` properties displayed as "null" in station table |
| S7-21 | High | `frontend/src/pages/RocketAnalysis.jsx:196-228` | `URL.createObjectURL` for CSV/STL exports never revoked — memory leak on repeated exports; use `useEffect` cleanup or revoke immediately after click |
| S7-22 | Medium | `frontend/src/pages/PerformanceMap.jsx:27-32` | Surge margin divides by `dp.pr` without zero-check — `NaN` renders if all PR values are zero |
| S7-23 | Medium | `frontend/src/pages/MissionAnalysis.jsx:62` | `Math.max(...feasibleTW)` on empty array returns `-Infinity` — add `feasibleTW.length > 0` guard |
| S7-24 | Medium | `frontend/src/context/SettingsContext.jsx:17,24` | `localStorage` errors silently ignored — log a warning so users know settings are not persisting (e.g., private browsing mode) |
| S7-25 | Medium | `frontend/src/utils/chartUtils.js:66-71` | `ax()` helper defined but never called anywhere — remove dead code |

### 7E — Test Coverage

| # | Severity | File | Description |
|---|----------|------|-------------|
| S7-26 | High | `tests/test_core.py` | Zero tests for invalid inputs — add `pytest.raises` fixtures for: negative chamber pressure, `of_ratio < 0`, unknown propellant name, `mach_exit < 1` in MoC |
| S7-27 | Medium | `tests/test_core.py:162` | H2/O2 Isp assertion `> 300` is far too loose (expected ~420–450 s at 10 MPa) — tighten to realistic bounds |
| S7-28 | Medium | `tests/test_core.py:287` | Mass flow balance uses absolute tolerance `1e-9` — use relative tolerance `< 1e-9 × mdot_total` |
| S7-29 | Medium | `tests/test_core.py` | MoC contour test validates X-monotonicity but not Y (radius) — add wall slope check |

---

## SPRINT 8 — Polish, Robustness & Tech Debt

| # | Severity | Area | Description |
|---|----------|------|-------------|
| S8-1 | Medium | `core/units.py:56-83` | ISA atmosphere silently clamps altitudes > 47 km — add `ValueError` or warning; relevant to rocket altitude-table endpoint |
| S8-2 | Medium | `core/units.py` | Negative altitude not validated — add guard `altitude_m >= 0` |
| S8-3 | Medium | `backend/main.py:411-412` | Rocket O/F sweep silently skips failed equilibrium points — include `skipped_of_ratios` list in response |
| S8-4 | Medium | `backend/requirements.txt` | No version pinning — create `requirements.lock` via pip-tools or pin minimum versions to prevent silent breaking upgrades |
| S8-5 | Medium | Frontend | Add `AbortController` cancellation pattern to all page-level `useEffect` fetches (ParametricCycle, RocketAnalysis, MissionAnalysis) |
| S8-6 | Low | Frontend | Extract magic numbers to named constants: `DEBOUNCE_MS = 300`, `TOAST_DURATION_MS = 4000`, `ANALYSIS_DEBOUNCE_MS = 700` |
| S8-7 | Low | Frontend | Standardize error message format across all pages — currently 5 different wording styles |
| S8-8 | Low | Frontend | Add `aria-label` and `aria-current="page"` to sidebar nav buttons (`App.jsx:93-105`) |
| S8-9 | Low | Frontend | Light theme option in `Settings.jsx` renders but does nothing — implement or hide behind a "coming soon" note |
| S8-10 | Low | Frontend | Add `PropTypes` declarations to all shared components (`EngineSchematic`, `SliderControl`, `StatPanel`) |
| S8-11 | Low | Backend | `requirements-dev.txt` missing — add `pytest`, `black`, `flake8`, `mypy`, `httpx` for CI |
| S8-12 | Low | `core/rocket/analyzer.py:48` | Document RP-1 surrogate limitation (C3H8 vs actual C~11 blend) in a code comment |
| S8-13 | Low | `core/gas_turbine/aero.py` | Document angle sign convention explicitly before velocity triangle calculations |
| S8-14 | Low | `tools/audit_edge_cases.py` | Add `timeout=10` to all `requests.post` calls; load `BASE_URL` from `os.getenv('API_URL', ...)` |
| S8-15 | Low | `tools/audit_tests.py:59` | STL check `"solid nozzle" in r.text` insufficient — assert `r.text.startswith("solid nozzle")` |

---

## Summary by Sprint

| Sprint | Theme | Issues | Estimated Impact |
|--------|-------|--------|-----------------|
| **Sprint 5** | Security, infrastructure, off-design physics, multispool | 16 | Unblocks safe deployment and accurate throttle sweeps |
| **Sprint 6** | Gas turbine cycle physics correctness | 12 | Fixes TSFC, afterburner, and turbofan accuracy |
| **Sprint 7** | Rocket + aero physics, frontend quality, test coverage | 29 | Corrects MoC, c*, Cf_vac; fixes silent UI failures |
| **Sprint 8** | Polish, tech debt, accessibility, tooling | 15 | Reduces maintenance burden; improves long-term reliability |
| **Total** | | **72 issues** | |

---

## Quick-Win Checklist (< 1 day each, can fill sprint capacity gaps)

- [ ] `api.js` — env-var base URL (`VITE_API_URL`) — 5 min
- [ ] `api.js` — safe JSON error parsing with `Content-Type` check — 15 min
- [ ] `main.py` — restrict CORS origins list — 5 min
- [ ] `main.py` — add `ge=1` to `ws_steps` Pydantic field — 2 min
- [ ] `analyzer.py` — raise on invalid propellant name instead of silent fallback — 5 min
- [ ] `units.py` — validate `altitude_m >= 0` — 5 min
- [ ] `chartUtils.js` — remove unused `ax()` function — 2 min
- [ ] `requirements.txt` — pin minimum versions — 30 min
