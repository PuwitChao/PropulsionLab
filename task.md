# Task List: Design Comparison, Rich Export Headers, and Merge Verification

- [/] 1. Git Branch Handoff & Merge Verification
  - [/] Review differences and prepare CHANGELOG.md updates
  - [ ] Merge `codex/refactor-architecture` into `main` branch
- [ ] 2. Implement Design Comparison Mode (U2)
  - [ ] Add reference-caching mechanism and UI buttons to `ParametricCycle.jsx`
  - [ ] Overlay reference cycle T_tot / P_tot traces on Station Thermo Plot
  - [ ] Add reference-caching mechanism and UI buttons to `RocketAnalysis.jsx`
  - [ ] Overlay reference nozzle contour on 2D Nozzle Plot
  - [ ] Extend O/F Sweep and Altitude Sweep charts in `RocketAnalysis.jsx` with comparative series
- [ ] 3. Implement Rich Export Headers (U8)
  - [ ] Add commented metadata headers in `/analyze/rocket/export/csv` route in `main.py`
  - [ ] Add metadata encoding inside 80-byte header block in `/analyze/rocket/export/stl` route/helper
- [ ] 4. Verification and Validation
  - [ ] Extend pytest coverage in `tests/test_api.py` / `tests/test_core.py` for metadata exports
  - [ ] Run backend tests and verify all 122+ pass
  - [ ] Run frontend linter and production build checks
