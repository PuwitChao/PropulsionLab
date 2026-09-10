# EA-08 limitation follow-up

Date: 2026-09-10. Status: software fixes and code comparisons verified locally. Physical qualification remains open.

## Software warnings

The test environment now pins httpx2 2.12.0 through backend/requirements-test.txt.
This removes Starlette's deprecated httpx fallback. Production dependencies remain separate.
CI uses that requirements file and treats backend warnings as errors.
The dependency consistency check and Python test-dependency audit pass.
[Starlette documents the supported client](https://www.starlette.io/testclient/).

RocketAnalyzer checks the common mechanism temperature floor at chamber, exit, and throat states.
It checks the frozen entropy state before a shifting-equilibrium call and checks the resulting equilibrium state.
The previously reported 296.5238477 K case now produces OUTSIDE_MODEL_DOMAIN, without performance values.
The API preserves that sweep point and continues valid points.
The floor is conservative. It does not certify every species property range or extend the model to colder states.
High-temperature extrapolation remains unqualified and requires a separate thermodynamic model review.

## Independent CEA comparison

The original CEA Example 8 remains an incompatible negative control because it uses cryogenic liquids.
Its identifier, reference values, and disposition remain unchanged.
[NASA specifies the original reactant conditions](https://nasa.github.io/cea/examples/rocket/example8.html).

A separate generator now uses NASA CEA 3.3.4 with gas H2/O2 reactants at 300 K.
It uses three pressure and mass-ratio pairs: 1 MPa/2, 5 MPa/4, and 10 MPa/6.
The product set contains the eight H/O species available to the GRI30 calculation.
The thermodynamic databases differ. Their hashes and the independent binary hashes are retained in CEA_GAS_REFERENCE.json.
The generator does not import the application. Regular CI compares frozen values without installing CEA.
[NASA documents the optional Python package](https://nasa.github.io/cea/installation.html).

The preselected 1% comparison screen applies only to chamber temperature and molecular weight.
Temperature differences are 0.01608%, 0.06168%, and 0.13033%.
Molecular-weight differences are 0.00583%, 0.02045%, and 0.05423%.
All three cases pass. The complete report contains 12 PASS and 1 INCOMPATIBLE.
No tolerance was widened after execution. No solver parameter was fitted to these references.
The hottest point exceeds some GRI30 species temperature ranges. Agreement does not qualify those extrapolated properties.

## Physical qualification remains open

Code agreement is stronger evidence than an unmatched comparison, but it does not establish a physical operating domain.
The workspace lacks matched experimental measurements, output uncertainty bounds, and intended-use acceptance limits.
VALIDATION_PLAN.md now lists the measurement packages required for each model group.
MODEL_REGISTRY.json retains empty validated-domain lists and an unvalidated status.
The user authorized commit and push on 2026-09-10. Remote CI must verify the resulting revision.
No release tag, deployment, or physical qualification is authorized.

## Verification

- Focused rocket checks: 12 passed with warnings treated as errors.
- Matched reference and provenance checks: 19 passed with warnings treated as errors.
- Rocket browser assurance and export: 1 passed.
- Python dependency consistency: passed.
- Python test-dependency audit: no known vulnerabilities.
- Full backend suite: 319 passed in 345.58 seconds with warnings treated as errors.

An earlier full run loaded ten reference cases before three new fixtures were added. Its reference-count assertion failed.
The fresh reference run passes. The final full run uses fixed source and fixture files and passes all 319 tests.

The browser launcher reports a NO_COLOR/FORCE_COLOR environment warning. It does not affect the test result.

## Reproduce

```powershell
.venv\Scripts\python.exe -m pip install -r backend/requirements-test.txt
.venv\Scripts\python.exe -m pytest tests/ -q -W error
.venv\Scripts\python.exe tools/validate_references.py --output docs/engineering/EA08_LIMITATIONS_COMPARISONS.json
```

Optional independent reference regeneration requires backend/requirements-reference.txt and tools/generate_cea_reference.py.
Review any generated reference changes before accepting them as a new baseline.

## CI dependency correction

Publication commit fbd7d29 triggered CI run 34436793510.
Backend collection failed because Starlette 1.6.0 accessed the deprecated anyio.abc.BlockingPortal alias in newer AnyIO.
The local 319-test run used AnyIO 4.14.2. The test requirements now pin that exact version.
The correction preserves warnings-as-errors and does not change solver behavior.
The original evidence manifest remains the record for the first publication. Remote CI must verify this follow-up commit.
