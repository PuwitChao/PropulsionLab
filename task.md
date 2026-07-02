# Refactoring Task Checklist

- [x] Sprint 1: Concurrency & Thread-Safety (Cantera Solutions)
  - [x] Implement `_new_gas` in `RocketAnalyzer` in `core/rocket/analyzer.py`
  - [x] Refactor species validation and calculations to use localized gas instances
  - [x] Verify thread safety changes with pytest
- [x] Sprint 2: Backend Monolith Decomposition
  - [x] Create `core/diagnostics.py` containing `DiagnosticsAnalyzer`
  - [x] Move reverse-thermodynamic diagnostics engine out of `backend/main.py`
  - [x] Create `backend/models.py` and move Pydantic request/response schemas
  - [x] Update `backend/main.py` routes and imports
  - [x] Verify API routes and integration with pytest
- [x] Sprint 3: Core Calculations Deduplication
  - [x] Create `core/gas_turbine/thermo.py` with shared gas turbine calculations
  - [x] Refactor `core/gas_turbine/cycle.py` to use `thermo.py`
  - [x] Refactor `core/gas_turbine/off_design.py` to use `thermo.py`
  - [x] Run full physics test suite with pytest
- [x] Sprint 4: Frontend Sanity & Linting
  - [x] Audit frontend pages for fetch calls
  - [x] Run `npm run lint` and `npm run build` in the frontend directory
