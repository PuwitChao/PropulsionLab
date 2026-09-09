import ScenarioSource from '../components/ScenarioSource'
import { PAGE_DEFAULTS } from '../data/pageDefaults'
import SolverStatus from '../components/SolverStatus'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Plot from '../components/EngineeringPlot'
import { fetchData } from '../api'
import StatPanel from '../components/StatPanel'
import SliderControl from '../components/SliderControl'
import { useSettings } from '../context/SettingsContext'
import { getLayout } from '../utils/chartUtils'
import usePersistentState from '../hooks/usePersistentState'
import useJsonScenario from '../hooks/useJsonScenario'
import ErrorBanner from '../components/ErrorBanner'

// ─────────────────────────────────────────────────────────────────────────────

export default function MissionAnalysis() {
    const { theme } = useSettings()
    const isLight = theme === 'light'
    const requestSequence = useRef(0)
    const rangeSequence = useRef(0)
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [rangeResult, setRangeResult] = useState(null)
    const [rangeError, setRangeError] = useState(null)
    const [aircraftData, setAircraftData] = usePersistentState('mission_aircraft_data', PAGE_DEFAULTS.mission)
    const { exportScenario, importScenario, scenarioError, scenarioSource } = useJsonScenario({
        filename: 'mission_scenario.json',
        data: { aircraftData },
        model: 'mission_constraints', template: { aircraftData: PAGE_DEFAULTS.mission },
        onInvalidate: () => { requestSequence.current += 1; rangeSequence.current += 1; setData(null); setRangeResult(null); setLoading(false) },
        onImport: d => setAircraftData(d.aircraftData),
    })

    const runAnalysis = useCallback(async () => {
        const sequence = ++requestSequence.current
        setData(null)
        setLoading(true)
        setError(null)
        try {
            const result = await fetchData('/analyze/mission', {
                method: 'POST',
                body: JSON.stringify({
                    aircraft_data: aircraftData,
                    constraints: [
                        { type: 'level',   label: 'Cruise (M0.8 @ 10km)',   alt: 10000, mach: 0.8 },
                        { type: 'ps',      label: 'Ps=50 (M0.9 @ 5km)',     alt: 5000,  mach: 0.9, ps: 50 },
                        { type: 'turn',    label: '3G Turn (M0.7 @ 3km)',   alt: 3000,  mach: 0.7, n: 3 },
                        { type: 'takeoff', label: 'Ideal ground roll (1200m)', sto: 1200, cl_max: aircraftData.cl_max },
                        { type: 'ceiling', label: 'Service Ceiling (15km)', alt: 15000, mach: 0.8 }
                    ],
                    ws_min: 1000, ws_max: 8000, ws_steps: 60
                })
            })
            if (sequence === requestSequence.current) setData(result)
        } catch (e) {
            console.error(e)
            if (sequence === requestSequence.current) setError(e.message)
        }
        if (sequence === requestSequence.current) setLoading(false)
    }, [aircraftData])

    useEffect(() => {
        const scheduled = requestSequence.current
        const t = setTimeout(() => { if (scheduled === requestSequence.current) runAnalysis() }, 300)
        return () => { clearTimeout(t); requestSequence.current += 1 }
    }, [aircraftData, runAnalysis])

    // Compute envelope compliance: fraction of W/S range where all constraints are met below T/W=1.0
    const feasibleTW = data?.feasible_boundary || []
    const envelopeCompliance = data
        ? Math.round((feasibleTW.filter(v => v != null && v <= 1.0).length / feasibleTW.length) * 100)
        : null

    // Derive constraint priority description from actual results
    const getConstraintSummary = () => {
        if (!data?.series || data.series.length === 0) return null
        // Find the binding (highest T/W at optimum ws) constraint
        const optIdx = data.ws.findIndex(ws => Math.abs(ws - (data.optimum?.ws || 0)) < 50)
        if (optIdx < 0) return null
        const vals = data.series.map(s => ({ label: s.label, tw: s.values[optIdx] }))
        vals.sort((a, b) => b.tw - a.tw)
        const binding = vals[0]
        const margin = data.optimum?.tw != null ? (1.0 - data.optimum.tw) : null
        return {
            binding: binding?.label || '-',
            margin: margin != null ? (margin * 100).toFixed(1) : '-',
            compliance: envelopeCompliance
        }
    }

    const summary = getConstraintSummary()

    const plotTraces = data ? [
        {
            x: data.ws, y: data.ws.map(() => 1.2),
            showlegend: false, mode: 'none', hoverinfo: 'skip'
        },
        {
            x: data.ws, y: feasibleTW,
            name: 'FEASIBLE_REGION', fill: 'tonexty',
            fillcolor: isLight ? 'rgba(0, 240, 255, 0.04)' : 'rgba(0, 240, 255, 0.03)',
            type: 'scatter', mode: 'none', hoverinfo: 'skip', showlegend: true
        },
        ...data.series.map((s, idx) => ({
            x: data.ws, y: s.values,
            name: s.label.toUpperCase(), type: 'scatter', mode: 'lines',
            line: {
                color: idx === 0 ? '#00f0ff' : (isLight ? `rgba(15,23,42,${0.2 + (idx/data.series.length)*0.45})` : `rgba(255,255,255,${0.1 + (idx/data.series.length)*0.4})`),
                width: idx === 0 ? 2.5 : 1.5,
                dash: idx === 0 ? 'solid' : 'dash'
            },
            hovertemplate: `<b>${s.label.toUpperCase()}</b><br>W/S: %{x} Pa<br>T/W: %{y:.3f}<extra></extra>`
        })),
        {
            x: [data.optimum?.ws], y: [data.optimum?.tw],
            name: 'DESIGN_CORNER', mode: 'markers',
            marker: { color: '#00f0ff', size: 15, symbol: 'cross-thin', line: { width: 2, color: '#00f0ff' } },
            type: 'scatter',
            hovertemplate: `<b>OPTIMUM_CORNER</b><br>W/S: %{x} Pa<br>T/W: %{y:.3f}<extra></extra>`
        },
    ] : []

    const fmt = (v, d = 0) => v != null ? v.toFixed(d) : '-'

    return (
        <div className="space-y-16 animate-in pb-20">
      {scenarioError && <p role="alert">Scenario import/export: {scenarioError}</p>}
      <ScenarioSource source={scenarioSource} />
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-white/10 pb-6">
                <span className="uppercase tracking-[0.4em] text-[13px] font-black text-white font-headline">
                  MISSION CONSTRAINT ARCHITECTURE
                </span>
                <div className="status-badge">
                    {loading ? 'OPTIMIZING...' : error ? 'SOLVER_ERROR' : 'OPTIMIZER_NODE_READY'}
                </div>
            </div>

            {/* Error Banner */}
            {!loading && <ErrorBanner error={error} onRetry={runAnalysis} />}

            <SolverStatus result={data} />
            <div className="grid grid-cols-12 gap-12">
                {/* Aircraft Configuration */}
                <section className="col-span-12 lg:col-span-3 space-y-4">
                   <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">AERODYNAMIC CONFIG</h2>
                        <SliderControl
                            label="Zero-Lift Drag (CD0)" value={aircraftData.cd0.toFixed(4)} unit=""
                            min={0.01} max={0.05} step={0.001}
                            onChange={v => setAircraftData({...aircraftData, cd0: Math.round(v * 1000) / 1000})}
                        />
                        <SliderControl
                            label="Induced Drag Factor (k)" value={aircraftData.k.toFixed(3)} unit=""
                            min={0.02} max={0.2} step={0.005}
                            onChange={v => setAircraftData({...aircraftData, k: Math.round(v * 200) / 200})}
                        />
                        <SliderControl
                            label="Max Lift Coeff (CLmax)" value={aircraftData.cl_max.toFixed(2)} unit="CL"
                            min={1.0} max={3.5} step={0.05}
                            onChange={v => setAircraftData({...aircraftData, cl_max: Math.round(v * 20) / 20})}
                        />
                   </div>

                   <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4 disabled:opacity-60"
                    >
                        <span className="material-symbols-outlined !text-[20px]">{loading ? 'sync' : 'hub'}</span>
                        {loading ? 'OPTIMIZING...' : 'RE-RUN ANALYSIS'}
                   </button>
                   <div className="grid grid-cols-2 gap-4">
                        <button onClick={exportScenario} className="mono text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/30 py-3 transition-colors">
                            EXPORT_JSON
                        </button>
                        <label className="mono text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white border border-white/10 hover:border-white/30 py-3 transition-colors text-center cursor-pointer">
                            IMPORT_JSON
                            <input type="file" accept=".json" className="hidden" onChange={importScenario} />
                        </label>
                    </div>
                </section>

                {/* Main Workspace */}
                <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
                    <div className="h-[450px] lg:h-[600px] bg-surface-container-lowest border border-white/10 relative overflow-hidden flex flex-col group p-6 lg:p-12">
                        <div className="panel-accent"></div>
                        <div className="absolute top-6 right-6 lg:top-12 lg:right-12 z-20 space-y-2 lg:space-y-3 text-right pointer-events-none">
                            <h3 className="mono text-[12px] font-black text-white tracking-[0.2em] uppercase">PERFORMANCE CLOUD SYNTHESIS</h3>
                            <p className="mono text-[11px] text-white/30 tracking-widest">
                              {data ? `[COMPLIANCE: ${envelopeCompliance}%]` : '[REGION_ID: ENVELOPE_PENDING]'}
                            </p>
                        </div>

                        {loading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30">
                                <div className="text-white/20 uppercase tracking-[0.5em] text-[13px] font-black animate-pulse">
                                    SYNTHESIZING_CONSTRAINT_ENVELOPE...
                                </div>
                            </div>
                        )}

                        {!loading && (data || error) && (
                            <Plot
                                data={plotTraces}
                                layout={getLayout(theme, {
                                    plot_bgcolor: 'transparent', paper_bgcolor: 'transparent',
                                    autosize: true, margin: { t: 80, b: 140, l: 100, r: 80 },
                                    xaxis: {
                                        title: { text: 'Wing Loading (W/S) [Pa]', font: { family: 'JetBrains Mono', size: 12, color: isLight ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                        gridcolor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                                        tickfont: { family: 'JetBrains Mono', size: 12, color: isLight ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.3)' },
                                        showline: true, linecolor: isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.1)', range: [1000, 8000]
                                    },
                                    yaxis: {
                                        title: { text: 'Thrust-to-Weight (T/W)', font: { family: 'JetBrains Mono', size: 12, color: isLight ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                        gridcolor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                                        tickfont: { family: 'JetBrains Mono', size: 12, color: isLight ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.3)' },
                                        showline: true, linecolor: isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.1)', range: [0, 1.2]
                                    },
                                    showlegend: true,
                                    legend: { font: { family: 'JetBrains Mono', size: 11, color: isLight ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.4)' }, orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center' },
                                    hovermode: 'closest', font: { family: 'Outfit', size: 14, color: isLight ? '#0f172a' : '#fff' }
                                })}
                                className="w-full h-full"
                                config={{ displayModeBar: false, responsive: true }}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 grid-bg">
                        <StatPanel label="DESIGN WING LOADING" value={data?.optimum?.ws != null ? fmt(data.optimum.ws) : '-'} unit="Pa" sub="SAMPLED_MINIMUM_TW" />
                        <StatPanel label="MINIMUM T/W"         value={data?.optimum?.tw  != null ? data.optimum.tw.toFixed(3) : '-'} unit="" sub="FEASIBLE_BOUND" />
                        <StatPanel label="ENVELOPE COMPLIANCE" value={envelopeCompliance != null ? `${envelopeCompliance}` : '-'} unit="%" sub="SELECTED_TW_LIMIT_1" />
                    </div>

                    {/* Operational Summary - Dynamic */}
                    <div className="bg-surface-container-low border border-white/10 p-14 space-y-12 relative group">
                        <div className="panel-accent"></div>
                        <div className="flex items-center gap-6 pb-8 border-b border-white/20">
                             <span className="material-symbols-outlined !text-[24px] text-white/70">description</span>
                             <h2 className="text-[13px] font-black tracking-[0.3em] uppercase text-white">OPERATIONAL_SYNTHESIS_REPORT</h2>
                        </div>
                        {summary ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-20">
                                <div className="space-y-5">
                                    <p className="text-[12px] font-black text-white tracking-[0.2em] uppercase">Binding_Constraint</p>
                                    <p className="text-[13px] mono text-white/50 leading-[1.8] uppercase border-l-2 border-white/20 pl-8">
                                        At the design corner, <strong className="text-white/70">{summary.binding}</strong> is the dominant sizing constraint, setting the minimum thrust-to-weight requirement.
                                    </p>
                                </div>
                                <div className="space-y-5">
                                    <p className="text-[12px] font-black text-white tracking-[0.2em] uppercase">Envelope_Status</p>
                                    <p className="text-[13px] mono text-white/50 leading-[1.8] uppercase border-l-2 border-white/20 pl-8">
                                        {summary.compliance}% of the W/S range satisfies all constraints within T/W {'<='} 1.0. Optimum corner at T/W {data?.optimum?.tw?.toFixed(3) || '-'}, leaving {summary.margin}% below the selected T/W limit. This is a numerical comparison, not operational compliance.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="mono text-[12px] text-white/20 uppercase tracking-widest italic">
                                {loading ? 'Computing synthesis report...' : 'Run analysis to generate operational summary.'}
                            </p>
                        )}
                    </div>

                    {/* Breguet Range Calculator Card */}
                    <div className="technical-card p-6 border border-white/10 relative">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                            <div className="flex items-center space-x-3">
                                <span className="material-symbols-outlined text-accent-cyan">flight_takeoff</span>
                                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                                    Breguet Payload-Range & Endurance Estimator
                                </h3>
                            </div>
                            <button
                                onClick={async () => {
                                    const request = ++rangeSequence.current
                                    setRangeResult(null)
                                    setRangeError(null)
                                    try {
                                        const res = await fetchData('/analyze/mission/breguet', {
                                            method: 'POST',
                                            body: JSON.stringify({
                                                tsfc_kg_per_n_s: 0.000015,
                                                mach: 0.78, alt: 11000,
                                                l_over_d: 16.0,
                                                w_initial: 75000 * 9.80665,
                                                w_final: 45000 * 9.80665
                                            })
                                        });
                                        if (request === rangeSequence.current) setRangeResult(res)
                                    } catch (e) {
                                        if (request === rangeSequence.current) setRangeError(e.message)
                                    }
                                }}
                                className="px-4 py-2 bg-accent-cyan/10 border border-accent-cyan/40 text-accent-cyan text-xs font-mono font-bold uppercase hover:bg-accent-cyan/20 transition-all"
                            >
                                Calculate Breguet Range
                            </button>
                        </div>
                        <ErrorBanner error={rangeError} />
                        {rangeResult && <div role="status" aria-label="Breguet result">
                            Range: {rangeResult.range_km.toFixed(1)} km ({(rangeResult.range_km / 1.852).toFixed(1)} nmi).
                            Flight duration: {rangeResult.flight_time_hours.toFixed(2)} hours.
                            <SolverStatus result={rangeResult} />
                        </div>}
                        <p className="text-xs text-white/60 font-mono">Example: Mach 0.78 at 11 km, TSFC 15 mg/(N s), L/D 16, mass 75,000 to 45,000 kg.</p>
                        <p className="text-xs text-white/60 font-mono">
                            Calculates cruise range (km / nmi) and fuel burn fraction using the steady level flight Breguet equation for jet aircraft.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    )
}

