# PropulsionLab — Product/Feature Roadmap (Sprints 5–8)

> **Status:** Drafted 2026-05-23 from a Phase-1 audit of `backend/`, `core/`, `frontend/`, and `tests/`. Cite findings as `B*` (bugs), `N*` (numerical safety), `U*` (UX), `E*` (engineering health), `F*` (physics fidelity).

## Executive summary

PropulsionLab covers gas-turbine cycles, off-design maps, mission constraint diagrams, rocket equilibrium (Cantera), and MoC nozzle synthesis. Happy paths are feature-complete and the 22 tests in `tests/test_core.py` pass. The audit surfaced three classes of work worth a focused quarter:

1. **Stale/dishonest gates** — `/analyze/cycle/multispool` returns 501 even though the solver body is fully implemented; the `[STUB]` banner and `NotImplementedError` docstring are stale. Rocket STL/CSV export sends hardcoded `mach_exit=3.0, r_throat=0.1` regardless of the actual design. CLAUDE.md's "pending work" section describes already-wired features as missing.
2. **Numerical & physical fidelity gaps** — MoC is a quadratic bell with synthetic mesh, not real characteristics; off-design turbine PR is a 25 %-of-compressor placeholder; several divide-by-zero and NaN-propagation paths lack guards.
3. **Product UX & ship readiness** — no scenario save/load, no design comparison, no input validation, no tooltips, hardcoded `http://127.0.0.1:8000` base URL, `CORS allow_origins=["*"]` with credentials, unpinned deps, no Docker/CI.

Sprints 5–8 below tackle these in order: Sprint 5 stops the platform from lying about its capabilities, Sprint 6 hardens the math, Sprint 7 closes UX gaps, and Sprint 8 prepares the app for deployment with one headline physics upgrade.

---

## Audit findings

### P0 — Bugs / dishonest behavior

| # | Finding | Location |
|---|---------|----------|
| B1 | `/analyze/cycle/multispool` returns 501 even though the body (8-iter work-matching) is fully implemented. The `[STUB]` banner comment and the docstring's `NotImplementedError` claim are stale. | `backend/main.py:629-667`; `core/gas_turbine/cycle.py:502, 521-573` (stale text) vs `:574-709` (real impl) |
| B2 | STL/CSV export hardcodes `mach_exit=3.0, r_throat=0.1` instead of using the current design result | `frontend/src/pages/RocketAnalysis.jsx:193-194, 219-220` |
| B3 | `OffDesignSolver` falls back to `mdot=10 kg/s` magic constant when missing from the design point | `core/gas_turbine/off_design.py:90-97` |
| B4 | Off-design exceptions silently swallowed into `{'error': True}` with no diagnostics | `core/gas_turbine/off_design.py:155-172` |
| B5 | Light theme toggle disabled with "future sprint" copy, but the CSS already supports light mode | `frontend/src/pages/Settings.jsx:93` |
| B6 | `sessionStorage.session_start` read but never initialized → session clock shows wrong value on first load | `frontend/src/pages/Settings.jsx` |
| B7 | CLAUDE.md "pending work" section is stale (claims unwired features that are wired) | `CLAUDE.md:89` |
| B8 | `/health` and `/health/diagnostics` return static strings — don't actually probe Cantera load | `backend/main.py` |

### P1 — Numerical safety

| # | Finding | Location |
|---|---------|----------|
| N1 | Mission constraints divide by dynamic pressure `q` with no zero guard at extreme altitude | `core/gas_turbine/mission.py:24, 29, 34, 39` |
| N2 | Rocket `equilibrate('SP')` failures propagate NaN silently to Isp/Cf | `core/rocket/analyzer.py:274, 280, 294` |
| N3 | Multispool `pt5_ratio` clamped to `1e-4` floor can produce unphysical thrust | `core/gas_turbine/cycle.py:247-248` |
| N4 | STL normal vectors all `[0, 0, 0]` — most viewers tolerate but it violates the spec | `core/rocket/moc.py:114, 123` |
| N5 | No NaN/Inf guards on `RocketAnalyzer.size_engine()` with `F_target=0` or extreme O/F | `core/rocket/analyzer.py` |

### P1 — Product / UX

| # | Finding | Impact |
|---|---------|--------|
| U1 | No scenario save/load — every reload resets cycle/rocket inputs | High — can't compare yesterday's run |
| U2 | No design comparison mode (overlay two cycles or two nozzles) | High — core analyst workflow missing |
| U3 | No input validation — Mach > 2.5, PC = 0 silently sent to backend | High — produces confusing errors |
| U4 | No tooltips/help text on technical terms (surge margin, induced-drag k, ε) | Medium — onboarding cliff |
| U5 | API base URL hardcoded `http://127.0.0.1:8000` | Medium — blocks deploy |
| U6 | Backend endpoints with no UI: `/analyze/cycle/sweep`, `/analyze/rocket/sweep`, `/analyze/rocket/altitude`, `/analyze/rocket/sizing` | Medium — features paid for but unreachable |
| U7 | Charts don't use `utils/chartUtils.getLayout()` — visual inconsistency between pages | Low |
| U8 | Export files lack metadata header (timestamp, design params, solver version) | Medium |

### P2 — Engineering health

| # | Finding | Location |
|---|---------|----------|
| E1 | No tests for multispool, hypergolic propellants, Bartz heat-flux, off-design map | `tests/test_core.py` (single file vs ~10 core modules) |
| E2 | `to-be-deleted/` and `FromStitich/` still in tree | repo root |
| E3 | No Dockerfile, no CI workflow, no `.env.example` | repo root |
| E4 | `tools/audit_edge_cases.py` only exercises happy paths | `tools/` |
| E5 | **CORS `allow_origins=["*"]` with `allow_credentials=True`** — incompatible per spec, security smell for any non-localhost deploy | `backend/main.py:68-74` |
| E6 | All `requirements.txt` entries use `>=` / unbounded versions — vulnerable to breaking upgrades | `backend/requirements.txt` |
| E7 | `vite ^8.0.0` in `package.json` — current stable is 5.x/6.x; version pin is implausible | `frontend/package.json:31` |
| E8 | No structured logging (basic `StreamHandler` only), no API versioning (`/v1/`), no rate limiting | `backend/main.py` |
| E9 | `MissionConstraintRequest.aircraft_data` typed as bare `Dict` — missing fields silently default | `backend/main.py:123-129` |
| E10 | `CycleSweepRequest` doesn't validate `prc_min < prc_max` or `steps > 0` | `backend/main.py:242-249` |
| E11 | `solve_turbojet` (~137 lines) and `solve_turbofan` (~199 lines) mix station setup, component math, and output marshalling — refactor candidates | `core/gas_turbine/cycle.py:164-500` |

### P3 — Physics fidelity (longer-term)

| # | Finding | Location |
|---|---------|----------|
| F1 | `MoCNozzle` is a quadratic bell with synthetic Mach field, not real characteristics integration | `core/rocket/moc.py` |
| F2 | Off-design turbine PR = 25 % of compressor PR is a placeholder | `core/gas_turbine/off_design.py:137` |
| F3 | Bartz heat-flux uses fixed 600 K wall — no regen-cooling solution | `core/rocket/analyzer.py:157` |
| F4 | Compressor map heuristics (PR ~ N², throttle^0.7 flow scaling) have no physical justification | `core/gas_turbine/off_design.py:42-60, 126` |
| F5 | Atmosphere clamped at 47 km — no upper-atmosphere or rocket-trajectory support | `core/units.py:80` |

---

## Sprint 5 — Honest gates & stabilization

**Theme:** Stop lying. Fix bugs. Make the platform's current capabilities accurately reachable.

**Goals**
- Every backend endpoint either works correctly or has a clear "not implemented" UI affordance
- Frontend reflects backend state — no hardcoded payloads, no disabled-but-implemented controls
- CLAUDE.md matches reality

**Tasks**
1. **B1 — Activate multispool endpoint.** Replace the 501 stub in `backend/main.py:629-667` with a real call to `CycleAnalyzer.solve_multispool()`. Add a `MultiSpoolRequest` Pydantic model. Remove the stale `[STUB]` banner at `cycle.py:502` and rewrite the docstring at `cycle.py:521-573` to describe the implemented algorithm instead of claiming `NotImplementedError`.
2. **B2 — Derive export payloads from actual result.** In `RocketAnalysis.jsx`, source `mach_exit` and `r_throat` from the current `result` state, not literals.
3. **B3 / B4 — Off-design diagnostics.** Replace `mdot=10` magic fallback with a clear error, and surface exception detail in the `{'error': True}` entries.
4. **B5 — Re-enable light theme** in `Settings.jsx` (CSS already supports it; verify both themes).
5. **B6 — Initialize `session_start`** on first SettingsContext load.
6. **B7 — Refresh CLAUDE.md** "Pending work" section: multispool is done; export/sensitivity are wired.
7. **B8 — Real health probe.** Make `/health/diagnostics` actually load `gri30.yaml` and report Cantera status + version; report import status of each `core/` module.
8. **E1 (partial)** — Add `tests/test_multispool.py` with at least two cases (work-balance convergence, separate-nozzle thrust).

**Critical files**
- `backend/main.py` (multispool endpoint, health probe)
- `core/gas_turbine/cycle.py:502, 521-573` (stale comments/docstring)
- `frontend/src/pages/RocketAnalysis.jsx` (export wiring)
- `frontend/src/pages/Settings.jsx` (theme + session)
- `frontend/src/context/SettingsContext.jsx`
- `core/gas_turbine/off_design.py` (diagnostics)
- `tests/test_multispool.py` (new)
- `CLAUDE.md` (docs sync)

**Acceptance**
- `curl -X POST localhost:8000/analyze/cycle/multispool -d <sample>` returns a result, not 501
- Rocket STL export of a chamber with `mach_exit=2.4` produces a 2.4-design geometry, not 3.0
- Light/dark theme toggle works
- All 22 existing tests plus new multispool tests pass

**Verification**
- `pytest tests/ -v`
- Manual: open frontend, run rocket sizing, export STL, confirm file size/geometry differs vs. baseline
- Extend `python tools/audit_edge_cases.py` to include multispool

---

## Sprint 6 — Numerical safety & coverage

**Theme:** Make the solvers honest under stress. Catch NaN before users see it.

**Goals**
- No silent NaN/Inf propagation in any solver path
- Pydantic models reject obviously-bad inputs (Mach < 0, PC ≤ 0, OF ratio out of band)
- Test coverage extended to edge cases and previously-untested branches

**Tasks**
1. **N1** — Add `q > q_min` guards in `mission.py` constraints; return `inf` T/W if dynamic pressure too low.
2. **N2** — Wrap `equilibrate('SP')` calls in `analyzer.py` with try/except + clear error; validate Isp/Cf are finite before return.
3. **N3** — Investigate `pt5_ratio` floor; if reachable in valid input space, fail explicitly instead of clamping.
4. **N5** — Guard `RocketAnalyzer.size_engine()` against `F_target ≤ 0` and OF out of range; return 422 from API.
5. **Input validation** — Tighten Pydantic models in `backend/main.py`: Mach `0 ≤ M ≤ 6`, altitude `0 ≤ h ≤ 47000`, PR `1 ≤ PR ≤ 60`, PC `1e4 ≤ PC ≤ 5e7`, OF `0.1 ≤ OF ≤ 20`. Convert `MissionConstraintRequest.aircraft_data` from bare `Dict` to a typed model (E9). Add cross-field validators (E10) for `prc_min < prc_max`, `steps > 0`.
6. **Propellant enum** — Validate rocket propellant strings against the `RocketAnalyzer.propellants` dict; reject typos with 422 instead of letting Cantera fail.
7. **Frontend validation** — Mirror Pydantic constraints in slider/input bounds; show inline error on out-of-range.
8. **E1 (continued)** — Add tests for: hypergolic propellants (MMH/N2O4), Bartz heat-flux known case, off-design choked-flow boundary, mission at 60 km (should clamp), API 422/500 paths.
9. **N4** — Compute STL face normals from cross-product (low-cost win; viewers like proper normals).

**Critical files**
- `core/gas_turbine/mission.py`
- `core/rocket/analyzer.py`
- `core/gas_turbine/cycle.py`
- `core/rocket/moc.py:114, 123` (STL normals)
- `backend/main.py` (Pydantic `Field` constraints, typed `aircraft_data`)
- `frontend/src/pages/*.jsx` (mirror bounds, add error display)
- `tests/test_core.py` plus new test files

**Acceptance**
- Sending `{"mach": -1}` returns 422 with a field-level error
- No endpoint returns NaN or Inf in any field across `tools/audit_edge_cases.py`
- Test count grows from 22 → ≥ 35

**Verification**
- `pytest tests/ -v --cov=core --cov-report=term` (add coverage if not present)
- Extend `python tools/audit_edge_cases.py` to fuzz invalid inputs
- Manual: try invalid inputs in UI, confirm friendly error

---

## Sprint 7 — Product UX (save/load, compare, help)

**Theme:** Make the platform usable for real analyst workflows.

**Goals**
- Scenarios survive reloads and can be exchanged between sessions
- Two designs can be compared on one chart
- New users can discover what each control does

**Tasks**
1. **U1 — Scenario save/load.** Extend `hooks/usePersistentState.js` use to all pages (currently only `MissionAnalysis`). Add "Save scenario" / "Load scenario" / "Export JSON" / "Import JSON" buttons that round-trip the full input state.
2. **U2 — Comparison mode.** On `ParametricCycle` and `RocketAnalysis`, allow loading a second saved scenario as an overlay trace on the existing chart. Reuse `getLayout()` so styling is consistent.
3. **U4 — Tooltips & help.** Add a `<HelpTooltip term="...">` component sourcing definitions from a single `frontend/src/data/glossary.js`. Cover: surge margin, BPR, FPR, OPR, T4, induced-drag factor k, CL_max, ε (area ratio), shifting vs frozen, L*.
4. **U6 — Surface hidden endpoints.** Add UI for:
   - `/analyze/cycle/sweep` — "Parameter sweep" tab on `ParametricCycle` (PR or BPR axis)
   - `/analyze/rocket/sweep` — "O/F optimum" chart on `RocketAnalysis`
   - `/analyze/rocket/altitude` — "Altitude performance" table on `RocketAnalysis`
   - `/analyze/rocket/sizing` — already partially used; expose target-thrust input
5. **U7 — Chart consistency.** Import `getLayout()` from `utils/chartUtils.js` everywhere; remove inline layout duplication.
6. **U8 — Rich export headers.** Prepend CSV/STL exports with a metadata header (`# PropulsionLab v0.x | <ISO timestamp> | <params JSON>`).

**Critical files**
- `frontend/src/hooks/usePersistentState.js` (extend; consumers change)
- `frontend/src/pages/ParametricCycle.jsx`, `RocketAnalysis.jsx`, `PerformanceMap.jsx`, `MissionAnalysis.jsx`
- `frontend/src/components/HelpTooltip.jsx` (new)
- `frontend/src/data/glossary.js` (new)
- `frontend/src/utils/chartUtils.js` (verify `getLayout()` is the single source of truth)
- `backend/main.py` (CSV/STL export — accept optional `metadata` field)

**Acceptance**
- Open app, configure turbojet, save scenario "A", reload page → "A" reloads
- Load "A" + "B" → see both on the same T/P chart with distinct colors and a legend
- Hover "surge margin" stat → tooltip with definition + units
- All four previously-hidden endpoints are reachable via UI controls

**Verification**
- Manual smoke: save 2 scenarios, export JSON, clear localStorage, re-import, confirm round-trip
- Visual: switch theme; verify charts re-render with `getLayout()` colors
- `npm run lint` clean

---

## Sprint 8 — Ship readiness & physics upgrade

**Theme:** Deploy somewhere other than localhost. Replace one heuristic with real physics.

**Goals**
- App runs in a container with configurable API URL
- One headline physics upgrade lands (F1 or F2 — caller's choice; F1 recommended)
- CI guards regressions

**Tasks**
1. **U5 — Configurable API URL.** Replace hardcoded `http://127.0.0.1:8000` in `frontend/src/api.js` with `import.meta.env.VITE_API_URL`. Add `frontend/.env.example`.
2. **E5 — CORS tightening.** Replace `allow_origins=["*"]` + `allow_credentials=True` with a configurable origin list from env var `CORS_ORIGINS` (comma-separated). Document allowed values.
3. **E3 — Deployment.** Add `Dockerfile` (multi-stage: Python backend + nginx-served frontend bundle), `docker-compose.yml` for local dev, `.github/workflows/ci.yml` that runs `pytest` + `npm run lint` + `npm run build` on PR. Add `.env.example` at repo root.
4. **E6 / E7 — Dependency hygiene.** Pin `backend/requirements.txt` versions (`==` or `~=`). Resolve the Vite version anomaly (downgrade to current stable or verify the `^8.0.0` claim).
5. **E8 — Observability.** Wire `structlog` (or `logging.dictConfig`) for JSON-formatted logs; add an `/api/v1/...` prefix layer (keep legacy routes as redirects for one sprint).
6. **E2 — Repo hygiene.** Move `to-be-deleted/` and `FromStitich/` to a git-ignored archive or remove (confirm with user before deleting).
7. **F1 (recommended) — Real MoC nozzle.** Replace `core/rocket/moc.py` quadratic bell with axisymmetric Method of Characteristics: initial-value line at throat, downstream C+ / C- intersections, wall reflection until exit Mach. Reference: Anderson, *Modern Compressible Flow*, Ch. 11. Add `tests/test_moc.py` with known Rao-bell comparison.
   - **Alternative F2** — Replace the 25 %-of-compressor-PR turbine heuristic in `off_design.py:137` with a proper turbine map (corrected mass flow vs pressure ratio at constant corrected speed).
8. **E4 — Robust audit.** Extend `tools/audit_edge_cases.py` to a property-based test sweep (Hypothesis or simple grid) covering each endpoint's full input space; flag any NaN/Inf/5xx.
9. **Docs — Examples.** Add `examples/` with sample request JSONs (turbojet SLS, MMH/N2O4 rocket, mission constraint) and one Jupyter notebook walkthrough.

**Critical files**
- `frontend/src/api.js`, `frontend/.env.example` (new)
- `Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml` (all new)
- `core/rocket/moc.py` OR `core/gas_turbine/off_design.py` (F1 or F2)
- `tools/audit_edge_cases.py`

**Acceptance**
- `docker-compose up` brings up the full stack on a fresh machine
- `VITE_API_URL=https://staging.example.com npm run build` produces a bundle that points at staging
- `CORS_ORIGINS=https://app.example.com python -m uvicorn backend.main:app` only permits that origin (test with `curl -H "Origin: https://evil.example.com"`)
- CI runs on every PR and blocks on test failure
- All backend deps are pinned; `pip install -r requirements.txt` is reproducible
- If F1: MoC exit-plane Mach matches Prandtl-Meyer prediction within 1 % for a 15° turning angle
- If F2: throttle deck produces a physical turbine PR sweep, not a flat 25 %

**Verification**
- Stand up the container, drive the app from a phone on the same LAN to confirm `VITE_API_URL` works
- `python tools/audit_edge_cases.py --fuzz` (extended) — zero NaN/Inf/5xx

---

## Stretch / non-goals

Deferred to Sprint 9+ or won't-do:

- Auth / multi-user accounts (single-user tool today; revisit if SaaS)
- Database persistence (localStorage is sufficient for scenario size)
- Rate limiting / quota enforcement (no public exposure planned this quarter)
- Regenerative-cooling solver (F3) — large scope, low immediate user value
- Trajectory simulation past 47 km (F5) — separate domain
- `solve_turbojet` / `solve_turbofan` refactor (E11) — code works and is tested; defer until a feature requires touching it
- Imperial-units mode — backend stays SI; one display-only toggle in Settings is the eventual answer but punted
