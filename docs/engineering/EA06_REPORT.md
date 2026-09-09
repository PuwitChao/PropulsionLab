# EA-06: Atmosphere convention correction

Date: 2026-09-08. Status: altitude slice complete.
Current EA-06 closeout: [EA06_CLOSEOUT.md](EA06_CLOSEOUT.md), dated 2026-09-09.

## Change and evidence

The default atmosphere input is geometric altitude z in metres.
The solver now uses geopotential height H = r*z/(r+z), with r = 6356766 m.
The radius and height convention follow US Standard Atmosphere 1976, referenced by REF-US1976.
The explicit `altitude_kind="geopotential"` mode supports reference tables that use H.
Both modes reject inputs outside 0 through 47000 m. Existing API callers use the geometric default.

Frozen geometric reference cases at 10 km and 30 km now pass their original tolerances.
The reference runner records nine passes, zero differences, and one incompatible case. It returns exit code zero.
The cryogenic CEA case remains incompatible with the 300 K gas-reactant model.
`EA05_COMPARISONS.json` remains the historical baseline. `EA06_COMPARISONS.json` records the corrected state.
No validated operating domain or total uncertainty bound is established.

## Verification

- Focused atmosphere and reference checks: 22 passed.
- Full backend suite: 218 passed in 98.73 seconds.
- Two existing warnings remain: Starlette/httpx deprecation and a Cantera temperature below its mechanism range.
- Tests cover both altitude conventions, layer continuity, the upper input limit, and invalid convention rejection.
- No frontend source changed in this slice. Frontend checks were not repeated.

## Final model dispositions

The subsequent model slices and their final evidence are recorded in EA06_CLOSEOUT.md.
GT-A through GT-F and the EA-06 selected-upgrade/proposal gate are complete.
Calibrated matching and advanced model capabilities remain explicit later scope.
EA-07 and EA-08 remain pending.
