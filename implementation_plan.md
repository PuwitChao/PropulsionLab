# Implementation Plan: Roadmap And Capability Truth Sync

## Objective

Synchronize the repository's planning surfaces and visible product labels with the verified current state of PropulsionLab, then leave a clear next backlog for future implementation.

## Scope

### 1. Roadmap Refresh

- Replace the stale Sprint 5-8 roadmap with a current roadmap that distinguishes completed work from remaining backlog.
- Preserve old sprint history in `docs/archive/` only; do not treat archived docs as active planning.
- Record the current verification baseline and the practical next-session recommendation.

### 2. Visible Product Truth

- Align visible UI version labels with `v2.3.0`.
- Align backend API metadata with `v2.3.0`.
- Replace stale rocket MoC text that claimed the solver was not a true MoC implementation.
- Update user documentation so MoC is described as a planar characteristic net with axisymmetric area mapping.

### 3. Tracking Artifacts

- Replace the completed comparison/export plan with this current plan.
- Replace the completed task checklist with the active truth-sync checklist.

## Verification Plan

- Run `pytest tests/ -v` for backend/core/API confidence.
- Run `npm run lint` in `frontend/`.
- Run `npm run build` in `frontend/`.
- Run `rg "2\.2\.0|NOT_TRUE_MOC|BELL_APPROX|PARABOLIC_FIT" backend frontend docs README.md CHANGELOG.md implementation_plan.md task.md` and confirm remaining hits are intentional or absent.

## Open Questions

- Resolved: centralize application versioning in `app_version.json`; backend and frontend adapters read from that shared file.
- Resolved: prioritize physics fidelity first, while carrying frontend chart consistency as parallel polish where it overlaps.