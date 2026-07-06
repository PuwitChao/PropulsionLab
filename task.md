# Task List: Design Comparison, Rich Export Headers, and Merge Verification

- [x] 1. Git Branch Handoff & Merge Verification
  - [x] Review differences and prepare CHANGELOG.md updates
  - [x] Merge `codex/refactor-architecture` into `main` branch
- [x] 2. Implement Design Comparison Mode (U2)
  - [x] Add reference-caching mechanism and UI buttons to `ParametricCycle.jsx`
  - [x] Overlay reference cycle T_tot / P_tot traces on Station Thermo Plot
  - [x] Add reference-caching mechanism and UI buttons to `RocketAnalysis.jsx`
  - [x] Overlay reference nozzle contour on 2D Nozzle Plot
  - [x] Extend O/F Sweep and Altitude Sweep charts in `RocketAnalysis.jsx` with comparative series
- [x] 3. Implement Rich Export Headers (U8)
  - [x] Add commented metadata headers in `/analyze/rocket/export/csv` route in `main.py`
  - [x] Add metadata encoding inside 80-byte header block in `/analyze/rocket/export/stl` route/helper
- [x] 4. Verification and Validation
  - [x] Extend pytest coverage in `tests/test_api.py` / `tests/test_core.py` for metadata exports
  - [x] Run backend tests and verify all 122+ pass
  - [x] Run frontend linter and production build checks
