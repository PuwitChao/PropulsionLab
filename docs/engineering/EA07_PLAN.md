# EA-07 implementation gates

Date: 2026-09-09. Status: EA-07.1 through EA-07.5 complete. See EA07_CLOSEOUT.md.

EA-07 consolidates engineering interfaces without promoting model validation.
Each gate uses the stable EA-06 contracts and preserves explicit failures and unavailable values.

| Gate | Responsibility | Acceptance evidence | Status |
| --- | --- | --- | --- |
| EA-07.1 | Versioned research scenarios in scenario.js and MethaneRamjet.jsx | SI envelope, architecture checks, old dry-file migration, rejected future versions, browser roundtrip | Complete |
| EA-07.2 | Shared scenario adoption across legacy cycle, rocket, map, and mission pages | Versioned files, explicit migration, visible import errors, stale-result protection | Complete |
| EA-07.3 | Preset provenance and engineering page consolidation | Source and applicability labels, editable input traceability, compatible model selection | Complete |
| EA-07.4 | Shared charts, metadata exports, and validation displays | Null gaps, units, input identity, model limits, consistent result evidence | Complete |
| EA-07.5 | Integrated frontend review and closeout | Lint, build, unit tests, affected browser checks, documentation review | Complete |

## Scenario version 1

The envelope uses schema `propulsion-analysis-scenario`, schema_version 1, model, units `SI`, created_at, and inputs.
The timestamp describes file creation. It does not identify a solver run or a validation date.
Inputs retain the API model discriminator. The envelope and input model must match the selected architecture.
Result and assurance exports remain separate from reusable input files.

Unknown schemas, unsupported versions, non-SI declarations, malformed inputs, and different architectures produce visible errors.
An import clears old result evidence before file processing. Rejected files do not replace current inputs.
The existing request sequence guard prevents an older solve or file read from replacing newer state.

Unversioned methane files remain supported. Older dry engine files receive only the documented afterburner defaults.
Versioned files must contain all required inputs. They do not receive silent migration defaults.
Legacy cycle files cannot enter methane research paths.

## Verification boundary

This first gate changes frontend scenario handling only. It does not change solver equations or backend contracts.
The EA-06 backend evidence remains historical. Run frontend checks and the research browser suite for this gate.
The integrated verification gate passes. EA-08 remains pending.

## EA-07.1 verification: 2026-09-09

Frontend lint and build pass. All 8 unit tests and 8 Chromium research tests pass.
The browser suite completes in 56.2 seconds and includes live solves for all research architectures.
The rejection test confirms that unsupported versions retain current inputs and clear old result evidence.
`git diff --check` passes. No backend source changed in this gate.
Next: EA-07.2, shared scenario adoption across the remaining analysis pages.

## EA-07.2 through EA-07.4 implementation: 2026-09-09

All four legacy analysis pages now use the shared versioned scenario hook.
PAGE_DEFAULTS defines each page contract and the missing values allowed during unversioned migration.
Versioned files require all fields. Unknown fields, types, units, versions, and page identities produce visible errors.
Cycle imports apply the recorded architecture. Rocket imports check the supported propellant and expansion mode.
Imports invalidate active and scheduled computations, sweep data, and comparison references.

The preset selector now applies compatible values and selects the corresponding page or cycle architecture.
Rocket preset pressures convert from bar to Pa. Ambient pressure and thrust target retain explicit page defaults.
Unsupported geometry, efficiency, and mission fields appear under Fields not applied.
The legacy ramjet preset is disabled because that page has no compatible exposed architecture.
No implicit conversion to methane fuel occurs.

Preset labels describe illustrative starting points. Independent sources are not recorded.
Scenario files retain the starting-point provenance separately from editable inputs.
Imported provenance is treated as unverified. A later export identifies the imported filename, not a trusted original source.

EngineeringPlot consolidates Plotly initialization, responsive behavior, and the null-gap policy across the four analysis pages.
SolverStatus exposes input identity, applicability, assumptions, validation, uncertainty, solver version, and existing convergence data.
Result exports preserve numerical keys and assurance, with additive export metadata.
Sweep exports retain their array shape and add metadata to each row.
The map CSV records the inputs that produced its retained data, even if the form changes before a new solve.

The shared chart policy does not establish a physical validity domain. Existing solver limits remain unchanged.

## Final gate: 2026-09-09

All five gates are complete. Lint, build, 13 unit tests, and all 51 Chromium tests pass.
See EA07_CLOSEOUT.md for verification limits and EA07_INTERFACE_GUIDE.md for the user procedure.
