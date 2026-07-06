# Implementation Plan: Design Comparison Mode, Rich Export Headers, and Merge Verification

This plan outlines the next phase of work for the Propulsion Analysis Suite. It focuses on closing remaining product roadmap items: enabling design comparison overlay mode on Plotly charts (U2), implementing rich metadata headers for CSV/STL exports (U8), and verifying/merging the current stable `codex/refactor-architecture` branch.

---

## User Review Required

> [!IMPORTANT]
> - **Comparison Mode (U2)**: We will implement a feature allowing users to compare two distinct engine designs. Users can click "Set as Reference" on their active design, which caches it. Changing parameters will show the active design as solid lines and the cached reference design as dotted/translucent overlay lines on the Plotly charts.
> - **Rich Export Headers (U8)**: We will inject engineering metadata (design parameters, timestamps, solver version) into the text header of CSV exports and the 80-byte header of STL binary exports. This ensures engineering compliance without breaking CAD/CFD client imports.
> - **Merge Verification**: The current branch `codex/refactor-architecture` has all refactoring (Sprints 1-4) and UI/UX responsive polish successfully implemented and verified (all tests pass). We will coordinate the final merge to `main`.

---

## Proposed Changes

### Component 1: Git Branch Handoff & Merge Verification
We will verify the branch's clean state and prepare the merge to `main`.

#### [MODIFY] [CHANGELOG.md](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/CHANGELOG.md)
- Document the newly implemented thread-safety, monolith decomposition, physics deduplication, API standardization, and responsive UI/UX polish under a new version heading (e.g. `[2.3.0]`).

---

### Component 2: Design Comparison Mode (U2)
We will add a state-driven reference comparator on the frontend.

#### [MODIFY] [ParametricCycle.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/ParametricCycle.jsx)
- Add a "Set as Reference" button to the configuration sidebar.
- Maintain a `referenceResult` state (holding the result of the reference cycle).
- If `referenceResult` is present, overlay its temperature (`tt`) and pressure (`pt`) curves on the Station Thermo Blueprint Plotly chart using distinct dashed line styles (e.g., `#ffaa00` for reference temperature and `rgba(255,170,0,0.4)` for pressure).
- Add clear legend labeling: `Active T_tot`, `Active P_tot`, `Reference T_tot`, `Reference P_tot`.
- Add a "Clear Reference" option.

#### [MODIFY] [RocketAnalysis.jsx](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend/src/pages/RocketAnalysis.jsx)
- Add a "Set as Reference" button to the Rocket configuration sidebar.
- Maintain a `referenceResult` and `referenceMocData` state.
- In `MocVisualization`: If a reference nozzle configuration exists, overlay its 2D nozzle wall contour as a dashed reference line.
- In the O/F Sweep and Altitude Performance charts: If a reference result exists, run the sweeps for both the active and reference configurations, overlaying the results on the same Plotly charts.

---

### Component 3: Rich Export Headers (U8)
We will enrich exported data files with engineering metadata.

#### [MODIFY] [main.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/main.py)
- Update `/analyze/rocket/export/csv` to accept optional metadata fields or automatically write a commented header (prefixed with `#`) detailing the nozzle's design parameters (throat radius, exit Mach, gamma), date, and solver version.
- Update `/analyze/rocket/export/stl` to encode design parameters and a timestamp inside the first 80 bytes (the header block) of the binary STL file.

#### [MODIFY] [analyzer.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/rocket/analyzer.py)
- Refactor the STL mesh generator to write the custom metadata string to the binary header block.

---

## Verification Plan

### Automated Tests
- Extend the test suite in `tests/test_core.py` and `tests/test_api.py` to assert that:
  - Exported CSV files contain the metadata header comments.
  - Exported STL files contain the metadata parameters in their binary headers.
- Run `pytest tests/ -v` to ensure all tests pass.
- Run `npm run lint` and `npm run build` in the frontend directory to ensure the build compiles cleanly.

### Manual Verification
- Launch the development server and verify the layout.
- Click "Set as Reference" in the Gas Turbine cycle, change parameters, and verify the comparison traces overlay correctly.
- Do the same for Rocket Analysis.
- Export CSV and STL files and inspect them in a text editor to confirm the metadata is embedded.
