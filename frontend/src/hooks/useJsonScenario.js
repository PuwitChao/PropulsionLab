/**
 * useJsonScenario — shared JSON scenario export/import for analysis pages.
 *
 * Replaces the near-identical Blob-download + FileReader boilerplate that was
 * duplicated across ParametricCycle, RocketAnalysis, PerformanceMap and
 * MissionAnalysis.
 *
 * @param {object}   opts
 * @param {string}   opts.filename  download filename (e.g. 'rocket_scenario.json')
 * @param {object}   opts.data      object serialized to JSON on export
 * @param {function} opts.onImport  receives the parsed object on a successful import
 * @returns {{ exportScenario: function, importScenario: function }}
 */
export default function useJsonScenario({ filename, data, onImport }) {
    const exportScenario = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = filename
        a.click()
        URL.revokeObjectURL(a.href)
    }

    const importScenario = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => {
            try { onImport(JSON.parse(evt.target.result)) }
            catch { /* invalid JSON ignored */ }
        }
        reader.readAsText(file)
        e.target.value = ''
    }

    return { exportScenario, importScenario }
}
