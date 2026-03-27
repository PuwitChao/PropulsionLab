# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0-dev] - 2026-03-27

### Added

- `POST /analyze/rocket/export/csv` — Nozzle contour (X, R) export for CFD and CAD meshing.
- `POST /analyze/cycle/sensitivity` — Multi-parameter sensitivity sweep (T4, Altitude, OPR) for gas turbine analysis.
- `POST /analyze/cycle/multispool` — Stub endpoint for multi-spool turbofan work matching (Sprint 5 deliverable).
- `MultispoolRequest` Pydantic model with full parameter set for future implementation.
- `CycleAnalyzer.solve_multispool()` stub with detailed work-matching algorithm docstring.
- `test_moc_contour_csv_format` and `test_moc_contour_monotonic` regression tests.

### Changed

- Version bumped to `v2.2.0-dev`.

---

## [2.1.0] - 2026-03-24

### Added

- Created `tools/` directory for internal audit and debug scripts.
- Created `scripts/` directory for operational scripts (`run_platform.bat`, `kill_port_8000.py`).
- Added GET `/version` endpoint to the backend.
- Integrated `logging` module in the backend for structured diagnostic output.

### Changed

- Moved utility scripts from root and `core/` to `tools/` and `scripts/`.
- Standardized backend response keys for `tsfc` and `spec_thrust`.
- Improved thermodynamic solver documentation with standardized docstrings and type hints.
- Integrated automatic port clearing (port 8000) directly into the backend startup.

### Removed

- Cleaned up redundant log and error files from the root directory (`backend_crash.log`, `error_rocket.txt`, `full_error.txt`).

## [2.0.1] - 2026-03-22

### Added

- Unified aerospace nomenclature across the frontend and backend.
- Integrated `mach_exit` into `RocketAnalyzer` for MoC visualization.
- Implemented `kill_port_8000.py` for Windows maintenance.

### Fixed

- Resolved `NaN` errors in cycle charts by standardizing API keys.
- Fixed Windows socket reuse errors ([Errno 10048]).
