# EA-07 engineering interface closeout

Date: 2026-09-09. Status: EA-07.1 through EA-07.5 complete.

## Delivered gates

| Gate | Delivered scope | Evidence |
| --- | --- | --- |
| EA-07.1 | Versioned methane research scenarios and old dry-engine migration | scenario.test.js; methane_research.spec.js |
| EA-07.2 | Versioned cycle, rocket, map, and mission inputs with visible errors and stale-result protection | engineeringInterfaces.test.js; engineering_interfaces.spec.js |
| EA-07.3 | Applied preset values, pressure conversion, architecture selection, provenance, and omitted-field labels | engineeringInterfaces.test.js; engineering_interfaces.spec.js |
| EA-07.4 | Shared chart gap policy, model-evidence displays, and metadata exports | engineeringInterfaces.test.js; solver_assurance.spec.js; mission_assurance.spec.js |
| EA-07.5 | Integrated regression, rendered interface review, and synchronized records | Final verification below |

Test paths refer to frontend/src/utils or frontend/e2e.
The implementation plan is EA07_PLAN.md. The user procedure is EA07_INTERFACE_GUIDE.md.

## Behavior and contracts

All new input files declare schema version 1, SI units, and model identity.
Versioned inputs require complete declared fields. Legacy migration fills missing known fields from explicit defaults.
An import attempt invalidates old results, scheduled calculations, active requests, and relevant comparison data.
Rejected files retain the current inputs and display an error.

Preset selection now applies compatible fields, then selects the matching page or architecture.
Each application starts from shared page defaults. It does not inherit unrelated settings from the previous preset.
Rocket pressure converts from bar to Pa. Unsupported geometry and model parameters appear as omitted fields.
Slider ranges and precision preserve the low bypass ratio, fan pressure ratio, and chamber pressure used by the presets.
Preset sources remain explicitly unverified. Named engines are illustrative starting points, not calibrated engine models.

The shared Plotly component preserves null gaps and converts non-finite chart coordinates to unavailable points.
JSON results preserve their numerical keys and assurance. Additional metadata identifies the export schema, application version, timestamp, and unit convention.
Sweep arrays retain every point and add metadata per row. The map CSV retains the originating design inputs.
The assurance panel exposes solver identity, physical checks, applicability, assumptions, input values, validation, uncertainty, and existing convergence evidence.

## Final verification

- Frontend lint: passed with no warnings.
- Frontend unit tests: 13 passed.
- Frontend production build: passed.
- Full Chromium suite: 51 passed in 2.8 minutes.
- Rendered desktop review: cycle, rocket, and mission provenance and assurance panels inspected.
- Whitespace check: git diff --check passed.
- Runtime: Node v24.13.0, npm 11.6.2.

Run `npm.cmd run lint`, `npm.cmd test`, `npm.cmd run build`, and `npx.cmd playwright test` from frontend/.
The browser runner starts the local Vite and FastAPI servers through playwright.config.js.
The earlier full run passed 48 of 49 tests. Its sole failure was the old exact-match assertion for the new sweep metadata.
The corrected test checks original row equality and export metadata separately. The final full run passes all 51 tests.
The two additional tests cover preset slider values and invalidation of a pending calculation.

EA07_EVIDENCE.json records the final checks and frontend source hashes.


## Review boundaries

No backend or core source changed during EA-07. All 26 source hashes in EA06_FINAL_EVIDENCE.json still match.
The 312-test backend result remains the dated EA-06 baseline. EA-07 does not claim a new backend test run.
Browser tests exercise the live backend and include deliberate failures to check visible error behavior.

No complete model has an independently validated operating domain.
Calibrated maps, advanced cooling, structural qualification, and full axisymmetric MoC remain later work from EA-06.
Unversioned files lack reliable model identity. Their field shapes support migration, not provenance verification.
The mission page retains fixed constraint and Breguet examples. Scenario files cover its editable aircraft polar.
Preset values without recorded independent sources remain unverified.

EA-08 release assurance remains the next package. No commit, push, deployment, or release occurs in this closeout.
