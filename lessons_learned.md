# Lessons Learned - PropulsionLab

## What Failed
- **Cantera Inert Fuel Behavior (100% Impurity)**: During rocket equilibrium testing with a fuel impurity mass fraction of exactly `1.0` (100% `N2`), Cantera's `set_equivalence_ratio` and `equilibrate('HP')` solvers did not raise a runtime exception. Instead, they successfully solved for a non-combusting mixture of `N2` and `O2` at 300 K, yielding a low but mathematically valid Specific Impulse (~63.7 seconds).
- **Negative Mass Fractions**: Cantera accepts negative impurity mass fractions and mass fractions > 1.0 (such as `1.1`), which results in unphysical flame temperatures (e.g. 3551 K for negative values) without raising standard exceptions.
- **PowerShell Statement Separators (&&)**: Running `npm run lint && npm run build` directly in a Windows PowerShell task throws a parser error because `&&` is not a valid statement separator in default Windows PowerShell (unlike bash). Using the semicolon `;` separator is required for compatibility.
- **Cantera Global State Race Condition**: Using a shared `self.gas` instance inside `RocketAnalyzer` is unsafe under FastAPI's multi-threaded async request loop since requests mutate the gas state concurrently.
- **E2E Port Contention & Server Reuse**: Running Playwright with `reuseExistingServer: true` against default port `5173` caused tests to inadvertently connect to an existing dev server running an unrelated project on that port.
- **Strict Mode Locator Ambiguity**: Generic compound selectors like `.js-plotly-plot, .plotly` resolved to multiple nested elements within Plotly DOM hierarchies, triggering Playwright strict mode violations.
- **CORS Dev Port Disconnects**: Strict origin lists that omitted custom testing ports (e.g. `5188`) caused cross-origin preflight rejections during automated headless browser runs.

## What Worked
- **Validation Guards**: Added explicit parameter verification in the core `RocketAnalyzer` solver to check that `impurity_species` is present in the loaded Cantera GRI30 species definition, and that `0.0 <= impurity_mass_frac < 1.0`. This prevents unphysical or chemically nonsensical dilution fractions before Cantera execution.
- **Robust Multi-Spool Solver**: Validated that the multi-spool turbofan work-matching loops handle high bypass ratios (`bpr = 12.0`) and pure turbojet LPC configurations (`bpr = 0.0`) without dividing by zero, which ensures excellent flexibility for military and high-bypass commercial engine analysis.
- **Diagnostics Validation**: Confirmed that the diagnostic reverse-cycle solver handles anomalous sensor readings (such as compressor exit temperature lower than inlet temperature) without crashes by applying strict boundaries inside the efficiency expressions.
- **Cantera Solution Thread Safety**: Created a dynamic helper method `_new_gas()` to return a fresh `ct.Solution` instance per solver request, completely eliminating race conditions.
- **FastAPI Monolith Decomposition**: Decomposed the 975-line `backend/main.py` monolithic API server by cleanly extracting model definitions into `backend/models.py` and diagnostic computations into `core/diagnostics.py`.
- **Frontend Client Consistency**: Unified all endpoint calls in the React frontend (App.jsx and Settings.jsx) to route through the centralized `fetchData` client wrapper instead of making raw window `fetch` calls.
- **Generic Station Mapping Helpers**: Consolidating station coordinate mapping into a single helper `getStationDataFor` allowed cleanly plotting comparison overlays on the cycle blueprints without duplicating mapping definitions.
- **Self-Describing STL Headers**: Storing engineering design specs (exit Mach, gamma, throat radius) directly in the ASCII STL solid name (e.g., `solid nozzle_moc_gamma_1_2...`) provides safe metadata documentation that integrates seamlessly with CAD/CFD parsers.
- **On-Demand Comparison Sweeps**: Running comparative O/F and altitude performance sweeps on-demand when the user visits the respective tab prevents making redundant API requests upon reference selection.
- **Isolated E2E WebServer Configuration**: Setting Playwright `baseURL` to `http://127.0.0.1:5188` with explicit `--host 127.0.0.1 --port 5188` flags and `reuseExistingServer: false` ensures completely isolated, collision-free browser automation runs.
- **Dynamic CORS Origin Filter**: Implemented `allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"` alongside explicit header exposure (`X-Request-ID`), allowing flexible local dev and automated test ports without security compromises.
- **Resilient Playwright Locators**: Standardized E2E test selectors on unambiguous navigation IDs (`#nav-on-design`, `#nav-rocket`), explicit accessible role selectors, and `.first()` filters on nested chart elements.
