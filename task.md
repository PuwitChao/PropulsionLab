# Task List: Roadmap And Capability Truth Sync

- [x] 1. Refresh active planning docs
  - [x] Inspect current roadmap, implementation plan, task list, handoff, and verification state
  - [x] Replace stale `docs/ROADMAP.md` with a current completed-vs-backlog roadmap
  - [x] Replace root `implementation_plan.md` with the active truth-sync plan
  - [x] Replace root `task.md` with this active checklist

- [x] 2. Correct visible product truth
  - [x] Align backend-visible API version metadata to `v2.3.0`
  - [x] Align frontend-visible version labels to `v2.3.0`
  - [x] Replace stale rocket MoC UI text
  - [x] Update user documentation wording for the current MoC implementation

- [x] 3. Verify
  - [x] Run `pytest tests/ -v`
  - [x] Run `npm run lint` in `frontend/`
  - [x] Run `npm run build` in `frontend/`
  - [x] Search for stale active-surface strings and review remaining hits

- [x] 4. Decide next implementation slice
  - [x] P1 option: chart layout consistency, inline validation UX, and comparison state polish
  - [x] P2 option: full axisymmetric MoC source-term solver or calibrated off-design map import is the priority track
