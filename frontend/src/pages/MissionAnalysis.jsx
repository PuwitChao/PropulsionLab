import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'
import StatPanel from '../components/StatPanel'
import SliderControl from '../components/SliderControl'

// ─────────────────────────────────────────────────────────────────────────────

export default function MissionAnalysis() {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState(null)
    const [error, setError] = useState(null)
    const [aircraftData, setAircraftData] = useState(() => {
        try {
            const saved = localStorage.getItem('mission_aircraft_data')
            return saved ? JSON.parse(saved) : { k: 0.1, cd0: 0.02, cl_max: 2.0 }
        } catch {
            return { k: 0.1, cd0: 0.02, cl_max: 2.0 }
        }
    })

    useEffect(() => {
        try { localStorage.setItem('mission_aircraft_data', JSON.stringify(aircraftData)) }
        catch { /* localStorage unavailable */ }
    }, [aircraftData])

    const runAnalysis = useCallback(async () => {
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
                        { type: 'takeoff', label: 'Takeoff (1200m)',         sto: 1200,  cl_max: 2.0 },
                        { type: 'ceiling', label: 'Service Ceiling (15km)', alt: 15000, mach: 0.8 }
                    ],
                    ws_min: 1000, ws_max: 8000, ws_steps: 60
                })
            })
            setData(result)
        } catch (e) {
            console.error(e)
            setError('Mission solver failed. Check backend connection.')
        }
        setLoading(false)
    }, [aircraftData])

    useEffect(() => {
        const t = setTimeout(runAnalysis, 300)
        return () => clearTimeout(t)
    }, [aircraftData, runAnalysis])

    // Compute envelope compliance: fraction of W/S range where all constraints are met below T/W=1.0
    const feasibleTW = data ? data.ws.map((_, i) => Math.max(...data.series.map(s => s.values[i]))) : []
    const envelopeCompliance = data
        ? Math.round((feasibleTW.filter(v => v <= 1.0).length / feasibleTW.length) * 100)
        : null

    // Derive constraint priority description from actual results
    const getConstraintSummary = () => {
        if (!data?.series || data.series.length === 0) return null
        // Find the binding (highest T/W at optimum ws) constraint
        const optIdx = data.ws.findIndex(ws => Math.abs(ws - (data.optimum?.ws || 0)) < 50)
        if (optIdx < 0) return null
        const vals = data.series.map(s => ({ label: s.label, tw: s.values[optIdx] || 0 }))
        vals.sort((a, b) => b.tw - a.tw)
        const binding = vals[0]
        const margin = data.optimum?.tw != null ? (1.0 - data.optimum.tw) : null
        return {
            binding: binding?.label || '—',
            margin: margin != null ? (margin * 100).toFixed(1) : '—',
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
            fillcolor: 'rgba(255,255,255,0.03)',
            type: 'scatter', mode: 'none', hoverinfo: 'skip', showlegend: true
        },
        ...data.series.map((s, idx) => ({
            x: data.ws, y: s.values,
            name: s.label.toUpperCase(), type: 'scatter', mode: 'lines',
            line: {
                color: idx === 0 ? '#fff' : `rgba(255,255,255,${0.1 + (idx/data.series.length)*0.4})`,
                width: idx === 0 ? 2.5 : 1.5,
                dash: idx === 0 ? 'solid' : 'dash'
            },
            hovertemplate: `<b>${s.label.toUpperCase()}</b><br>W/S: %{x} Pa<br>T/W: %{y:.3f}<extra></extra>`
        })),
        {
            x: [data.optimum?.ws], y: [data.optimum?.tw],
            name: 'DESIGN_CORNER', mode: 'markers',
            marker: { color: '#fff', size: 15, symbol: 'cross-thin', line: { width: 2, color: '#fff' } },
            type: 'scatter',
            hovertemplate: `<b>OPTIMUM_CORNER</b><br>W/S: %{x} Pa<br>T/W: %{y:.3f}<extra></extra>`
        }
    ] : []

    const fmt = (v, d = 0) => v != null ? v.toFixed(d) : '—'

    return (
        <div className="space-y-16 animate-in pb-20">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <span className="uppercase tracking-[0.4em] text-[13px] font-black text-white font-headline">
                  MISSION CONSTRAINT ARCHITECTURE
                </span>
                <div className="status-badge">
                    {loading ? 'OPTIMIZING...' : error ? 'SOLVER_ERROR' : 'OPTIMIZER_NODE_READY'}
                </div>
            </div>

            {/* Error Banner */}
            {error && !loading && (
                <div className="border border-red-500/30 bg-red-950/20 px-12 py-8 flex items-center gap-8">
                    <span className="material-symbols-outlined text-red-400 !text-[22px] shrink-0">error_outline</span>
                    <p className="mono text-[11px] text-red-400 uppercase tracking-widest">{error}</p>
                </div>
            )}

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
                </section>

                {/* Main Workspace */}
                <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
                    <div className="h-[600px] bg-surface-container-lowest border border-white/10 relative overflow-hidden flex flex-col group p-12">
                        <div className="panel-accent"></div>
                        <div className="absolute top-12 right-12 z-20 space-y-3 text-right">
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
                                layout={{
                                    plot_bgcolor: 'transparent', paper_bgcolor: 'transparent',
                                    autosize: true, margin: { t: 80, b: 140, l: 100, r: 80 },
                                    xaxis: {
                                        title: { text: 'Wing Loading (W/S) [Pa]', font: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                        gridcolor: 'rgba(255,255,255,0.05)',
                                        tickfont: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.3)' },
                                        showline: true, linecolor: 'rgba(255,255,255,0.1)', range: [1000, 8000]
                                    },
                                    yaxis: {
                                        title: { text: 'Thrust-to-Weight (T/W)', font: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                        gridcolor: 'rgba(255,255,255,0.05)',
                                        tickfont: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.3)' },
                                        showline: true, linecolor: 'rgba(255,255,255,0.1)', range: [0, 1.2]
                                    },
                                    showlegend: true,
                                    legend: { font: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.4)' }, orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center' },
                                    hovermode: 'closest', font: { family: 'Inter', size: 14, color: '#fff' }
                                }}
                                className="w-full h-full"
                                config={{ displayModeBar: false, responsive: true }}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-3 gap-1 grid-bg">
                        <StatPanel label="DESIGN WING LOADING" value={data?.optimum?.ws != null ? fmt(data.optimum.ws) : '—'} unit="Pa" sub="MIN_AIRCRAFT_SIZE" />
                        <StatPanel label="MINIMUM T/W"         value={data?.optimum?.tw  != null ? data.optimum.tw.toFixed(3) : '—'} unit="" sub="FEASIBLE_BOUND" />
                        <StatPanel label="ENVELOPE COMPLIANCE" value={envelopeCompliance != null ? `${envelopeCompliance}` : '—'} unit="%" sub="REGION_OPTIMIZED" />
                    </div>

                    {/* Operational Summary — Dynamic */}
                    <div className="bg-surface-container-low border border-white/10 p-14 space-y-12 relative group">
                        <div className="panel-accent"></div>
                        <div className="flex items-center gap-6 pb-8 border-b border-white/20">
                             <span className="material-symbols-outlined !text-[24px] text-white/70">description</span>
                             <h2 className="text-[13px] font-black tracking-[0.3em] uppercase text-white">OPERATIONAL_SYNTHESIS_REPORT</h2>
                        </div>
                        {summary ? (
                            <div className="grid grid-cols-2 gap-20">
                                <div className="space-y-5">
                                    <p className="text-[12px] font-black text-white tracking-[0.2em] uppercase">Binding_Constraint</p>
                                    <p className="text-[13px] mono text-white/50 leading-[1.8] uppercase border-l-2 border-white/20 pl-8">
                                        At the design corner, <strong className="text-white/70">{summary.binding}</strong> is the dominant sizing constraint, setting the minimum thrust-to-weight requirement.
                                    </p>
                                </div>
                                <div className="space-y-5">
                                    <p className="text-[12px] font-black text-white tracking-[0.2em] uppercase">Envelope_Status</p>
                                    <p className="text-[13px] mono text-white/50 leading-[1.8] uppercase border-l-2 border-white/20 pl-8">
                                        {summary.compliance}% of the W/S range satisfies all constraints within T/W ≤ 1.0. Optimum corner at T/W {data?.optimum?.tw?.toFixed(3) || '—'}, leaving {summary.margin}% margin.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="mono text-[12px] text-white/20 uppercase tracking-widest italic">
                                {loading ? 'Computing synthesis report...' : 'Run analysis to generate operational summary.'}
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
