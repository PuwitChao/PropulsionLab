# EA08-R01 dependency remediation

Date: 2026-09-09. Status: fixed and locally verified; remote CI pending.

## Boundary and change

The full Plotly distribution contained geographic mapping code. The React wrapper also installed the full Plotly source tree through its peer dependency.
A transitive override alone could not repair the prebuilt browser bundle.

The application now resolves `plotly.js` to `npm:plotly.js-gl3d-dist-min@3.7.0`.
`chartRuntime.js` exports that runtime to the existing React factory through EngineeringPlot.
The installed alias satisfies the React wrapper's peer requirement without installing the full source tree.
The official GL3D package retains scatter and 3D engineering traces but excludes geographic map trace modules.
See the [upstream bundle documentation](https://github.com/plotly/plotly.js/blob/v3.7.0/dist/README.md).

No required page uses geographic traces. All four chart pages use explicit or default scatter traces.
The regression test also exercises mesh3d and checks surface registration.
Geographic traces must not be reintroduced without a dependency and served-bundle security review.

Compatible development dependency patches were also applied by npm audit fix, without force or major overrides.
The full npm audit now reports zero vulnerabilities. This is a dated advisory result, not a universal security guarantee.

## Evidence

- Installed alias: plotly.js-gl3d-dist-min 3.7.0, deduplicated for react-plotly.js 2.6.0.
- No maplibre package exists in the resolved lockfile.
- New vendor chunk: 1,644,106 bytes. Previous vendor chunk: approximately 4,619,120 bytes.
- MapLibre class names remain only in one shared stylesheet string. They do not establish the presence of its JavaScript implementation.
- Runtime trace registration excludes scattermap, choroplethmap, scattermapbox, and choroplethmapbox.
- Lint, 13 unit tests, and production build pass.
- Full browser regression: 52 passed in 2.7 minutes.
- Independent source investigation and candidate review found no concrete bypass or regression.

The original advisory concerns malicious HTML attribution sanitization. Removing its map implementation removes that reported sink from this application's chart runtime.
This change does not claim to sanitize arbitrary HTML or remediate unrelated Plotly paths.
EA08_FIX_EVIDENCE.json records the built artifact hash and audit summary.
EA08_NPM_AUDIT_FIXED_ALL.json records the full post-fix dependency audit.

## Remaining release work

Create and push the reviewed sprint commit, then verify its remote CI result.
GitHub CLI is not authenticated in this environment. Git transport and public API access must be checked separately.
No operational qualification is claimed. The physical limits from EA06_CLOSEOUT.md remain in force.

## Closeout execution

All 52 browser tests pass. The scoped 146-file sprint change set is staged.
Automatic approval review rejected the combined commit and push to main because this broad default-branch publication lacks explicit user approval.
No commit or push occurred. The user must approve this exact operation before retry.
The staged review found no dependency/build directories or high-confidence credential patterns. This is not a complete secrets audit.
