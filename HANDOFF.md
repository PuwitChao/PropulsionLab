# Handoff: Roadmap Version Sync

**Generated**: 2026-07-17 01:09 in local time
**Branch**: main
**Status**: Ready for Review

## Loop Telemetry
- **Active Subtask**: Roadmap and visible product truth synchronization.
- **Current Iteration**: Final wrap-up.
- **Healing Actions Taken**: Used workspace-scoped elevated PowerShell reads/writes after sandbox ACL failures blocked normal file access; verified with backend tests and frontend lint/build.

## Goal
Understand the PropulsionLab codebase, especially core calculation logic and user flow, then align active planning surfaces with repo truth. The user resolved the open decisions: centralize versioning, and prioritize physics fidelity while carrying frontend chart consistency in parallel where useful.

## Completed
- [x] Explored backend, core physics modules, frontend user flow, docs, and tests.
- [x] Refreshed `docs/ROADMAP.md` from a stale Sprint 5-8 plan into a current completed-vs-backlog roadmap.
- [x] Replaced the root `implementation_plan.md` and `task.md` with the active truth-sync plan and checklist.
- [x] Added shared release metadata in `app_version.json`.
- [x] Added frontend adapter `frontend/src/version.js`.
- [x] Updated backend API metadata, `/`, `/version`, `/health`, `/health/diagnostics`, and rocket CSV solver header to read the shared version.
- [x] Updated visible frontend labels and Settings fallback to use shared version metadata.
- [x] Corrected stale MoC UI/docs wording to describe the current planar MoC net with axisymmetric area mapping.
- [x] Recorded the next implementation priority: physics fidelity first, frontend chart consistency as parallel polish.
- [x] Verified backend/core/API tests and frontend lint/build.

## Not Yet Done
- [ ] Start the next physics-fidelity slice: either full axisymmetric MoC source-term integration or calibrated off-design map import.
- [ ] Carry chart layout consistency and input-validation polish only where it supports the selected physics workflow.
- [ ] Optionally refresh `README.md` with a current capabilities section matching the updated roadmap.
- [ ] Clean remaining mojibake in comments/docs if touched during future work.

## Failed Approaches (Don't Repeat These)
*   *Normal sandbox reads/writes*: The Windows sandbox repeatedly failed with ACL errors for normal workspace file operations, including `apply_patch`. Use workspace-scoped PowerShell commands with explicit approval if the same sandbox issue recurs.
*   *Version literals in multiple surfaces*: Repeating `2.2.0` / `2.3.0` literals across backend, frontend, and exports caused visible drift. Use `app_version.json` plus adapters instead.
*   *Stale MoC labels*: Do not label the current nozzle implementation as `NOT_TRUE_MOC` or a parabolic bell approximation. Current wording should be "planar MoC net with axisymmetric area mapping" until the next source-term solver lands.
*   *ASCII STL Comment Prepends*: Prepending `#` comment lines before the `solid` tag in ASCII STL files breaks parser imports in standard CAD applications. Keep metadata in parser-safe fields such as the solid name.

## Key Decisions
| Decision | Rationale |
|---|---|
| Centralize app versioning in `app_version.json` | Keeps backend metadata, frontend labels, Settings fallback, and export headers synchronized from one source. |
| Physics fidelity is the priority track | The user selected both physics and frontend polish, with physics taking priority for the next implementation slice. |
| Keep frontend chart consistency parallel | Chart consistency matters, but it should be advanced when touching physics workflows rather than displacing solver fidelity work. |
| Preserve archived docs as historical | Active docs should reflect current repo truth; archive docs can retain old sprint language. |

## Current State
- **Working**: `pytest tests/ -v` passed 123 tests; `npm run lint` passed; `npm run build` passed. Backend and frontend now share version metadata.
- **Broken**: No functional breakage known. Test suite still emits one existing Cantera temperature-range warning in `tests/test_api.py::test_rocket_sweep_basic`.
- **Uncommitted Changes**: Wrap-up commit should include `HANDOFF.md`, `app_version.json`, `frontend/src/version.js`, backend/frontend version wiring, docs roadmap refresh, MoC wording updates, `implementation_plan.md`, and `task.md`.

## Files to Know
| File | Why It Matters |
|---|---|
| `app_version.json` | Shared release metadata consumed by backend and frontend. |
| `backend/main.py` | Loads shared version metadata and exposes version/health/export metadata. |
| `frontend/src/version.js` | Frontend adapter for shared version metadata and visible label formatting. |
| `frontend/src/App.jsx` | Main app shell and visible version labels. |
| `frontend/src/pages/Settings.jsx` | Settings page version fallback now uses shared metadata. |
| `frontend/src/pages/RocketAnalysis.jsx` | Rocket user flow; MoC label corrected to current implementation truth. |
| `core/rocket/moc.py` | Current planar characteristic net and axisymmetric area mapping implementation; likely next physics target. |
| `core/gas_turbine/off_design.py` | Candidate next physics target for calibrated compressor/turbine map import. |
| `docs/ROADMAP.md` | Active completed-vs-backlog roadmap and next-session recommendation. |
| `implementation_plan.md` | Active plan for roadmap/capability truth sync and resolved decisions. |
| `task.md` | Active checklist for completed truth-sync work and selected next priority. |

## Code Context
```python
def _load_app_metadata() -> dict[str, str]:
    """Load shared release metadata used by backend and frontend."""
    version_path = Path(__file__).resolve().parents[1] / "app_version.json"
    ...

APP_METADATA = _load_app_metadata()
APP_VERSION = APP_METADATA["version"]
APP_BUILD_DATE = APP_METADATA["build_date"]
APP_STATUS = APP_METADATA["status"]
```

```javascript
import appVersion from '../../app_version.json'

export const APP_VERSION = appVersion.version
export const APP_BUILD_DATE = appVersion.build_date
export const APP_STATUS = appVersion.status

export const versionLabel = (prefix) => `${prefix}_V${APP_VERSION}`
```

```text
Recommended next session:
Take physics fidelity first: start with the P2 MoC/source-term or calibrated map work. Carry P1 chart consistency and validation polish in parallel only when it supports the physics workflow being touched.
```

## Resume Instructions
1. Run `git status --short --branch` and confirm the pushed wrap-up commit is present on `main`.
2. Re-run `pytest tests/ -v`, then `npm run lint` and `npm run build` inside `frontend/` if starting implementation work.
3. Pick the next physics-first slice: `core/rocket/moc.py` axisymmetric source-term MoC upgrade, or `core/gas_turbine/off_design.py` calibrated map import path.
4. When touching charts for that physics slice, centralize affected Plotly layout through `frontend/src/utils/chartUtils.js` and add inline validation only for the workflow being changed.

## Setup Required
- Python environment with backend dependencies from `backend/requirements.txt`.
- Node.js dependencies installed in `frontend/`.
- Cantera must be available for the full backend test suite.

## Warnings & Caveats
- This repo currently required explicit elevated workspace-scoped shell commands for reads/writes due Windows sandbox ACL failures.
- Keep SI-unit contracts between backend/core/frontend.
- Do not share Cantera `ct.Solution` instances across requests.
- Preserve unrelated user changes if the next session starts with a dirty worktree.
