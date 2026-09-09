import { APP_VERSION } from '../version'
import { useEffect, useRef, useState } from 'react'
import { createScenario, readPageScenario, validatePageInputs } from '../utils/scenario'

/** Import declared page inputs and invalidate evidence before asynchronous reads. */
export default function useJsonScenario({ filename, model, data, template, onImport, onInvalidate, validate }) {
    const [scenarioError, setScenarioError] = useState(null)
    const [scenarioSource, setScenarioSource] = useState(() => {
        try { return JSON.parse(localStorage.getItem(`${model}_scenario_source`)) } catch { return null }
    })
    const sequence = useRef(0)
    const identity = JSON.stringify(data)
    useEffect(() => {
        sequence.current += 1
        return () => { sequence.current += 1 }
    }, [identity])
    const exportScenario = () => {
        try {
            validatePageInputs(data, template)
            validate?.(data)
            const file = createScenario({ model, ...data })
            file.app_version = APP_VERSION
            file.provenance = scenarioSource
            const a = document.createElement('a')
            a.href = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }))
            a.download = filename
            a.click()
            URL.revokeObjectURL(a.href)
            setScenarioError(null)
        } catch (error) { setScenarioError(error.message) }
    }
    const importScenario = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        event.target.value = ''
        const request = ++sequence.current
        onInvalidate()
        setScenarioError(null)
        try {
            const parsed = JSON.parse(await file.text())
            if (request !== sequence.current) return
            const inputs = readPageScenario(parsed, model, template)
            validate?.(inputs)
            onImport(inputs)
            const source = { kind: 'import', label: file.name, source: 'User-supplied file; provenance not independently verified', ignored_fields: [] }
            setScenarioSource(source)
            try { localStorage.setItem(`${model}_scenario_source`, JSON.stringify(source)) } catch { /* Inputs remain usable without persistence. */ }
        } catch (error) {
            if (request === sequence.current) setScenarioError(error.message)
        }
    }
    return { exportScenario, importScenario, scenarioError, scenarioSource }
}
