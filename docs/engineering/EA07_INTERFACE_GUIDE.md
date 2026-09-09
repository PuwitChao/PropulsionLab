# Engineering scenarios and result evidence

Updated: 2026-09-09.

## Save and restore inputs

1. Select the analysis page and model.
2. Review the input units and model limits.
3. Select the scenario export control to save a JSON input file.
4. Use the matching page's import control to restore the file.
5. Review the inputs before you use the result.

New files declare schema version 1, SI units, and the page or research model identity.
The four legacy pages also record the application version and starting-point provenance when available.
Methane research files retain their architecture discriminator and all required inputs.

Versioned files must include every declared input field.
Unversioned legacy files can omit known fields. The importer fills those fields from the documented page defaults.
An unversioned file has no reliable model identity. The importer checks its field names and types against the selected page.
Unknown fields and incompatible page envelopes produce a visible error. Rejected files do not replace the current inputs.
Import attempts clear old result evidence and cancel its pending updates.

Input-file validity does not prove physical feasibility. The solver still checks operating limits and convergence.
Rocket pressures are stored in Pa, even when a display control shows MPa.
Mission scenario files contain the editable aircraft polar. The displayed constraint set and Breguet example remain fixed page examples.

## Apply presets

1. Open Presets on the required analysis page.
2. Select a compatible starting point.
3. Review the source statement and Fields not applied.
4. Edit the inputs for your intended calculation.

Preset names identify bundled illustrative values. Independent sources and uncertainty are not recorded.
The values do not qualify a calculation as a model of the named engine or aircraft.
Each application starts from page defaults, then applies compatible fields.
Rocket chamber and exit pressures convert from bar to Pa. Preset throat radius and area ratio are not applied.
Gas-turbine architecture follows the preset type. Unsupported efficiency fields are not silently inserted into the request.
The legacy ramjet preset is unavailable. It cannot imply a conversion to methane research fuel.

Scenario provenance identifies a starting point. It does not claim that edited inputs still equal that preset.
Imported provenance is unverified. Subsequent exports identify the imported filename as the starting point.

## Inspect and export results

Open Inputs and model evidence in the solver assurance panel.
Inspect the original solver inputs, assumptions, applicability, validation record, and uncertainty.
A successful numerical calculation does not establish an independently validated operating domain.

Export result and assurance preserves the numerical result and adds export schema, application version, timestamp, and unit guidance.
The timestamp is the export time. It is not the solve time.
Sweep exports remain arrays and preserve every requested point, including failed points and unavailable values.
Charts do not connect across unavailable values. Chart images do not replace the JSON evidence export.
Map CSV files include the input values that produced the retained deck, normalized-flow limits, and per-point status.

No complete model currently has an independently validated operating domain. See EA06_CLOSEOUT.md for retained physics limits.
