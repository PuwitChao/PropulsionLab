# EA-08 release assurance review

Date: 2026-09-09. Current decision: dependency blocker remediated locally; immutable remote CI still pending.
See EA08_REMEDIATION.md for the current fix. The initial audit below remains historical evidence.
Review status: completed. The release gate is not passed.

## Decision and release conditions

The local numerical and interface checks support continued exploratory development.
They do not establish a qualified engineering tool or a releasable immutable artifact.

| Condition | Current evidence | Required action |
| --- | --- | --- |
| Dependency gate | Production npm audit fails with two critical package entries from one MapLibre advisory | Resolve the dependency and bundled-code exposure, then repeat audits and browser regression |
| Immutable release evidence | Work remains uncommitted on main | Select an immutable reviewed revision before release |
| Remote CI | Updated workflow is locally parsed, but no remote run exists for these workspace changes | Obtain passing remote CI for the selected revision |
| Physical validation | No complete model has an independently validated operating domain | Retain exploratory-use limits. Acquire independent evidence before any operational qualification |

EA-08 records a hold decision. It does not authorize deployment, publishing, tagging, or operational use.

## Dependency finding EA08-R01

`npm audit --omit=dev --audit-level=high --json` exits 1.
The tree contains react-plotly.js 2.6.0, plotly.js 3.4.0, and maplibre-gl 4.7.1.
The audit reports maplibre-gl and its dependent plotly.js as critical entries for GHSA-jrc7-96c5-q579.
The [reviewed advisory](https://github.com/advisories/GHSA-jrc7-96c5-q579) identifies an attribution sanitizer bypass and names 6.4.1 as patched.

The compatible audit-fix dry run does not remove the critical finding.
No dependency update, forced major override, or lockfile change was applied.
The application imports the prebuilt plotly.js-dist-min 3.7.0 bundle through a factory.
Changing an unused dependency-tree entry alone would not prove that the prebuilt browser bundle is remediated.
No exploit reachability or absence of exposure is established by this audit.

Remediation must cover the installed tree and the actual served bundle.
Select an upstream compatible fix or a reviewed chart bundle without the affected component.
Inspect the built artifact, repeat the production audit, and run the full browser suite before removing this hold.
The audit JSON is EA08_NPM_AUDIT.json. Python audit results are in EA08_PYTHON_AUDIT.json.

## Local verification

- Backend: 312 passed, 2 warnings, 171.58 seconds. Core statement coverage: 92%.
- Dependency consistency: pip check passed.
- Python dependency audit: no known vulnerabilities reported for the pinned requirements and resolved dependencies.
- Independent reference comparisons: 9 PASS, 1 INCOMPATIBLE, no DIFFERENCE or ERROR.
- Frontend lint, 13 unit tests, and production build: passed.
- Full browser suite: 51 passed in 2.9 minutes.
- CI YAML: parsed locally. Playwright lists all 51 tests with the portable runner configuration.

The backend warnings concern Starlette/httpx deprecation and a Cantera temperature of 296.5238477 K below the mechanism's 300 K bound.
The temperature warning remains a model applicability limit. Test success does not remove it.
The incompatible CEA case uses different reactant phase and inlet enthalpy.
Coverage measures executed statements. It does not measure physical accuracy or complete boundary coverage.

The local runtime uses Python 3.13.3, Cantera 3.2.0, NumPy 2.2.6, Node 24.13.0, and npm 11.6.2.
CI selects Python 3.11 and Node 24. Local results do not substitute for the unexecuted Linux/Python 3.11 pipeline.

## CI changes and evidence boundary

The workflow now runs independent comparisons, retains backend reports, and includes the full Chromium suite.
Node 24 matches the tested local major version. Workflow permissions are restricted to repository read access.
Playwright uses the repository virtual environment on Windows and the configured Python interpreter on Linux.
Existing dependency audits remain mandatory. The unresolved production audit will fail CI until remediation.

Only local configuration was changed. No remote workflow was dispatched and no remote pass is claimed.

## Engineering findings and documentation review

| Original findings | Disposition | Evidence |
| --- | --- | --- |
| F01-F06 | Architecture, termination, heat-addition, expansion, TSFC, and failed-point integrity corrected | VALIDATION_REPORT.md; test_solver_assurance.py; current full regression |
| F07-F09 | Atmosphere limits, fixed rocket geometry, ambient pressure, and saved exit composition corrected | VALIDATION_REPORT.md; EA06_REPORT.md; current regression and reference report |
| F10-F11 | Normalized map units, SI TSFC, and same-speed surge reporting corrected | VALIDATION_REPORT.md; solver_assurance.spec.js |
| F12-F13 | Mission units and model assumptions declared; invalid telemetry rejected before indicators | EA04_REPORT.md; mission_assurance.spec.js |
| Deeper fidelity gaps | Retained as explicit limitations and separate proposals | MODEL_CREDIBILITY.md; EA06_CLOSEOUT.md |

README now distinguishes legacy approximations, methane research, prescribed maps, and unqualified thermal/structural estimates.
It corrects Pc/Pe/Pa semantics, removes a momentum-conserving mixer claim, and distinguishes Cantera equilibrium from NASA CEA.
The setup and scenario procedures now match the repository interfaces.
The functional breakdown and sprint records identify the release gate and unresolved dependency finding.

## Reproduce

Run from the repository root:

```powershell
.venv\Scripts\python.exe -m pytest tests/ -q --cov=core --cov-report=term-missing --junitxml=docs/engineering/EA08_TEST_RESULTS.xml
.venv\Scripts\python.exe tools/validate_references.py --output docs/engineering/EA08_COMPARISONS.json
.venv\Scripts\python.exe -m pip check
.venv\Scripts\python.exe -m pip_audit -r backend/requirements.txt --strict --format json --output docs/engineering/EA08_PYTHON_AUDIT.json
cd frontend
npm audit --omit=dev --audit-level=high --json
npm run lint
npm test
npm run build
npx playwright test
```

Advisory databases change over time. Preserve the dated audit files when comparing later runs.
The base commit is 71d6bdfad6215d2492ae574c52ff36e632b78658. It does not contain the uncommitted sprint changes.
The final EA08_EVIDENCE.json identifies the tested workspace files by hash.
