# Code Refactoring Plan - Propulsion Analysis Suite

We will perform a systematic code refactoring of the project in smaller, sequential sprints. The primary goals are to improve code maintainability, ensure robust thread safety under concurrent requests (specifically regarding Cantera solutions), decouple the monolithic backend API file, eliminate mathematical duplication, and clean up frontend hooks.

The program must remain fully functional throughout, and the refactor will not interfere with the core physics calculations.

---

## User Review Required

> [!IMPORTANT]
> - **Cantera Concurrency (Sprint 1)**: We will remove `self.gas` from `RocketAnalyzer.__init__` and instead instantiate the Cantera GRI-30 gas solution dynamically per method invocation (using a thread-safe helper `_new_gas()`). This aligns it with `CycleAnalyzer` and prevents memory race conditions during concurrent REST requests.
> - **Monolith Decomposition (Sprint 2)**: We will extract thermodynamic fault diagnostic math from the route layer in [main.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/main.py) to a new module [diagnostics.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/diagnostics.py) and move all Pydantic request validation models to [models.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/models.py). This will dramatically reduce the complexity of the main routing file.

---

## Open Questions

None. We are executing this plan under the `/goal` parameter to achieve the refactored state iteratively.

---

## Proposed Changes

### Component 1: Rocket Physics Core (Sprint 1)
We will refactor the chemical equilibrium model to be fully thread-safe, removing shared mutable state.

#### [MODIFY] [analyzer.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/rocket/analyzer.py)
- Remove `self.gas` from `__init__`.
- Implement `_new_gas()` returning a fresh `ct.Solution('gri30.yaml', transport_model='mixture-averaged')`.
- Update `solve_equilibrium`, `altitude_performance`, and species validation to use localized gas variables.

---

### Component 2: Backend API and Diagnostics (Sprint 2)
We will split the monolithic FastAPI server file into logical modules.

#### [NEW] [diagnostics.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/diagnostics.py)
- Create `DiagnosticsAnalyzer` class.
- Move reverse-thermodynamic calculations (`eta_c`, `eta_t`, `dp_b`) and alert compilation from `backend/main.py` here.

#### [NEW] [models.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/models.py)
- House all Pydantic request/response validation models: `AircraftData`, `MissionConstraint`, `MissionConstraintRequest`, `CycleRequest`, `TurbofanRequest`, `CycleSweepRequest`, `OffDesignMapRequest`, `DiagnosticsRequest`.

#### [MODIFY] [main.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/backend/main.py)
- Import schemas from `backend/models.py`.
- Import and invoke `DiagnosticsAnalyzer` in `/analyze/diagnostics`.
- Clean up unused imports and structure routes neatly.

---

### Component 3: Gas Turbine Code Deduplication (Sprint 3)
We will eliminate mathematical duplication in the Brayton solvers.

#### [NEW] [thermo.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/thermo.py)
- Consolidate isentropic/polytropic efficiency calculators (`_poly_to_isen_comp`, `_poly_to_isen_turb`).
- Move the critical pressure ratio nozzle exit calculator (`_nozzle_exit`) to this shared helper module.

#### [MODIFY] [cycle.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/cycle.py)
- Import from `core.gas_turbine.thermo` and remove duplicate internal helper methods.

#### [MODIFY] [off_design.py](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/core/gas_turbine/off_design.py)
- Import from `core.gas_turbine.thermo` and remove duplicate helper methods.

---

### Component 4: Frontend Sanity (Sprint 4)
We will audit and clean the React client.

#### [MODIFY] [frontend](file:///d:/Documents/Personal_Project/Google_AG/Propulsion_Analysis_Site/frontend)
- Verify `api.js` is the sole entry point for HTTP requests.
- Address outstanding linter warnings/clean imports.

---

## Verification Plan

### Automated Tests
- Run `pytest tests/ -v` to ensure physics calculations are identical before/after refactoring.
- Run `npm run lint` and `npm run build` in the `frontend` workspace to verify static health.
