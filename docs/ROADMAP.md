# Engineering assurance handoff

Updated: 2026-09-09. Branch: main. Upstream: origin/main.

EA-00 through EA-07 selected gates are complete. EA-08 review and EA08-R01 remediation are complete locally.
The chart runtime uses the official GL3D 3.7.0 npm alias. The full npm audit reports zero vulnerabilities.
Independent investigation and candidate review found no concrete surviving bypass or compatibility regression.

Verification:

- 52 Chromium tests pass, including geographic-trace exclusion and retained scatter/mesh3d behavior.
- 13 frontend unit tests, lint, and production build pass.
- EA-08 backend evidence: 312 tests pass with 92% core statement coverage and 2 known warnings.
- Reference evidence: 9 PASS and 1 INCOMPATIBLE cryogenic CEA case.
- No backend/core calculation source changed during dependency remediation.

Closeout: the user approved the exact sprint commit and push.
Commit becce7feb82014f8b7390b7987f31d5a1fed8c95 was pushed successfully to origin/main.
Message: Complete engineering assurance sprints and remove vulnerable map runtime.
CI was in progress at the last check: https://github.com/PuwitChao/PropulsionLab/actions/runs/34364615305.
The user explicitly approved this documentation follow-up for commit and push.
No remote CI pass is claimed.
Remote CI must pass for the immutable revision before the software release gate can pass.
GitHub CLI lacks authentication. Git push and read-only public CI API access both succeeded.

Resume:

1. Inspect the commit's remote CI result and address any actual failures.
2. Retain exploratory-use limits. No complete model has an independently validated operating domain.
3. Treat calibrated maps, advanced cooling, structural qualification, and full axisymmetric MoC as later model work.

Evidence: `docs/engineering/EA08_REMEDIATION.md`, `EA08_FIX_EVIDENCE.json`, and `EA08_RELEASE_REVIEW.md`.
The initial release review and audit JSON remain historical evidence of the resolved dependency finding.
No deployment, tag, or operational qualification is included in this closeout.

---

# PropulsionLab Roadmap

> Status: refreshed 2026-08-09 after CI dependency audit remediation.
> Verification baseline: `.venv\Scripts\python.exe -m pytest tests\ -v --cov=core --cov-report=term-missing` passed 134 tests with 95% core coverage and two known warnings; Python `pip-audit --strict`, frontend tests, lint, build, and production npm audit passed.

## Current Product State

PropulsionLab is a working React + FastAPI engineering application for gas-turbine cycle analysis, rocket equilibrium/nozzle design, off-design compressor maps, mission constraint synthesis, and thermodynamic diagnostics.

The previous Sprint 5-8 roadmap is now mostly complete or superseded. This document separates completed capability from the next useful backlog so future work starts from repo truth.

## Completed Since The Original Audit

| Area | Status | Evidence |
| --- | --- | --- |
| Multispool cycle endpoint | Done | `/analyze/cycle/multispool`, `CycleAnalyzer.solve_multispool()`, `tests/test_multispool.py` |
| Backend validation | Done | Pydantic models in `backend/models.py`; API 422 tests in `tests/test_api.py` |
| Numerical guards | Done for known paths | Mission dynamic-pressure guards, rocket non-finite guards, impurity validation, STL normals |
| Real health diagnostics | Done | `/health/diagnostics` probes Cantera and core imports |
| Scenario portability | Done | `usePersistentState` plus JSON import/export hooks on analysis pages |
| Comparison overlays | Done | Cycle station overlays and rocket contour/O-F/altitude reference overlays |
| Rich exports | Done | CSV metadata headers and parameterized STL solid names |
| MoC upgrade | Done for planar net | `core/rocket/moc.py` uses a planar characteristic net and axisymmetric area mapping |
| Deployment scaffolding | Done | `Dockerfile`, `docker-compose.yml`, `.env.example`, `frontend/.env.example`, `.github/workflows/ci.yml` |
| CORS/API config | Done | `CORS_ORIGINS` and `VITE_API_URL` are configurable |
| Backend dependencies | Done | `backend/requirements.txt` uses pinned versions |
| Python dependency audit | Fixed | FastAPI `0.141.1` plus explicit Starlette `1.6.0` resolve the failed backend `pip-audit --strict` gate |

## Known Drift To Keep Clean

| Item | Current risk | Recommended action |
| --- | --- | --- |
| Version strings | Historically drifted between `2.2.0` and `2.3.0` | Keep backend metadata, visible UI labels, changelog, and export headers synchronized |
| Roadmap/task docs | Old sprint docs listed completed work as future work | Treat this file plus root `implementation_plan.md` and `task.md` as the active planning surface |
| MoC wording | UI/docs previously described the solver as a bell/parabolic approximation | Use "planar MoC net with axisymmetric area mapping" until a full axisymmetric source-term solver lands |
| Archive docs | `docs/archive/*` intentionally preserves older state | Do not update archive files unless doing a historical migration |

## Next Backlog

### P0 - Product Truth And Workflow Polish

1. Keep roadmap, handoff, changelog, and visible version text synchronized after each completed slice.
2. Centralize display versioning so UI labels cannot drift from backend `/version`.
3. Replace remaining mojibake in docs/comments with clean ASCII or intentional Unicode.
4. Add a short "current capabilities" section to `README.md` that matches the verified app.

Acceptance:
- No visible stale capability labels.
- `rg "2\.2\.0|NOT_TRUE_MOC|STUB|future sprint"` returns only archive or dependency-lock references.
- `pytest tests/ -v`, `npm run lint`, and `npm run build` pass.

### P1 - Frontend Consistency And Analyst Usability

1. Finish chart layout centralization through `frontend/src/utils/chartUtils.js` on all pages.
2. Add explicit inline validation messages near sliders and inputs, matching `backend/models.py` bounds.
3. Improve comparison state UX: show what reference parameters are cached and when reference sweeps are stale.
4. Add export metadata to off-design engine-deck CSVs, not only rocket exports.

Acceptance:
- All charts share a consistent theme-aware layout source.
- Invalid inputs are prevented or explained before API submission.
- Saved/imported scenarios round-trip across cycle, rocket, mission, and off-design pages.

### P2 - Physics Fidelity

1. Upgrade MoC from planar characteristic net plus area mapping to full axisymmetric characteristic integration with radial source terms.
2. Replace generic off-design compressor map heuristics with a calibrated map import path.
3. Add a turbine map dataset/import path instead of only a parametric work-balance estimate.
4. Make Bartz wall temperature configurable and prepare an eventual regenerative-cooling model.

Acceptance:
- MoC exit-plane Mach and area ratio match analytical expectations for benchmark cases.
- Off-design maps can be sourced from a documented data file and still pass existing tests.
- Heat-flux outputs document wall-temperature assumptions in API and UI.

### P3 - Ship Readiness

1. Run and document a clean `docker compose up` smoke test.
2. Add API version namespace planning (`/api/v1`) while preserving legacy routes.
3. Add structured logging configuration and request IDs for backend diagnostics.
4. Add a release checklist that includes tests, build, Docker smoke, changelog, and handoff update.

Acceptance:
- A fresh checkout can launch from documented commands.
- CI guards backend tests, frontend lint, and frontend build.
- Release docs state exactly what was verified.

## Recommended Next Session

Take physics fidelity first: start with the P2 MoC/source-term or calibrated map work. Carry P1 chart consistency and validation polish in parallel only when it supports the physics workflow being touched.
