import React, { useState, useEffect, useCallback, useRef } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'
import StatPanel from '../components/StatPanel'
import SliderControl from '../components/SliderControl'

// ─────────────────────────────────────────────────────────────────────────────

export default function PerformanceMap() {
    const [loading, setLoading] = useState(false)
    const [mapData, setMapData] = useState(null)
    const [throttleData, setThrottleData] = useState(null)
    const [error, setError] = useState(null)
    const [activeView, setActiveView] = useState('compressor')

    const [dpParams, setDpParams] = useState({
        alt: 0,
        mach: 0.0,
        prc: 20,
        tit: 1550,
    })
    const abortRef = useRef(null)

    // Compute surge margin from the lowest-throttle operating point vs design point
    const surgeMargin = React.useMemo(() => {
        if (!throttleData || throttleData.length === 0) return null
        const dp  = throttleData.find(r => r.throttle_pct === 100) || throttleData[throttleData.length - 1]
        const low = throttleData[0]
        if (!dp || !low || !dp.pr || dp.pr === 0) return null
        return (((dp.pr - low.pr) / dp.pr) * 100).toFixed(1)
    }, [throttleData])

    const handleExportDeck = React.useCallback(() => {
        if (!throttleData || throttleData.length === 0) return
        const header = 'Throttle_%,Spec_Thrust_Nsk,TSFC_mgNs,PR,Surge\n'
        const rows = throttleData.map(r =>
            `${r.throttle_pct},${r.spec_thrust?.toFixed(3)},${r.tsfc?.toFixed(4)},${r.pr?.toFixed(4)},${r.surge ? 'YES' : 'NO'}`
        ).join('\n')
        const blob = new Blob([header + rows], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'engine_deck.csv'
        a.click()
        URL.revokeObjectURL(url)
    }, [throttleData])

    const runAnalysis = useCallback(async () => {
        setLoading(true)
        setMapData(null)
        setThrottleData(null)
        setError(null)
        try {
            const [m, t] = await Promise.all([
                fetchData('/analyze/offdesign/map',
                    { method: 'POST', body: JSON.stringify({...dpParams, n_speed_lines: 8}) }),
                fetchData('/analyze/offdesign/throttle',
                    { method: 'POST', body: JSON.stringify({...dpParams, n_points: 15}) })
            ])
            setMapData(m)
            setThrottleData(t)
        } catch (e) {
            console.error(e)
            setError('Off-design solver failed. Check backend connection and design parameters.')
        }
        setLoading(false)
    }, [dpParams])

    useEffect(() => {
        // Cancel any in-flight request before scheduling a new one
        if (abortRef.current) abortRef.current.abort()
        abortRef.current = new AbortController()
        const t = setTimeout(runAnalysis, 300)
        return () => { clearTimeout(t); abortRef.current?.abort() }
    }, [dpParams, runAnalysis])

    const buildMapTraces = () => {
        if (!mapData) return []
        const traces = []

        mapData.speed_lines.forEach((sl, idx) => {
            traces.push({
                x: sl.flow, y: sl.pr, mode: 'lines', name: sl.label,
                line: { color: `rgba(255,255,255,${0.05 + (idx/mapData.speed_lines.length)*0.5})`, width: 1.2 },
                hovertemplate: `W_corr: %{x:.3f}<br>PR: %{y:.3f}<br>${sl.label}<extra></extra>`
            })
        })

        if (mapData.surge_line) {
            traces.push({
                x: mapData.surge_line.flow, y: mapData.surge_line.pr,
                mode: 'lines', name: 'SURGE_LIMIT',
                line: { color: 'rgba(255, 68, 68, 0.4)', width: 2, dash: 'dash' },
                hovertemplate: `SURGE_LIMIT<extra></extra>`
            })
        }

        if (throttleData && throttleData.length > 0) {
            traces.push({
                x: throttleData.map(r => r.mdot_corr_norm),
                y: throttleData.map(r => r.pr),
                name: 'OPERATING_LINE',
                mode: 'lines+markers',
                marker: { size: 4, color: '#fff' },
                line: { color: '#fff', width: 2.5 },
                hovertemplate: `OP_POINT<br>Throttle: %{text}%<extra></extra>`,
                text: throttleData.map(r => r.throttle_pct)
            })
        }

        if (mapData.design_point) {
            traces.push({
                x: [mapData.design_point.flow],
                y: [mapData.design_point.pr],
                name: 'ANCHOR_DESIGN_POINT',
                mode: 'markers',
                marker: { color: '#fff', size: 12, symbol: 'star-triangle-up' },
                hovertemplate: `DESIGN_POINT<br>W_corr: 1.0<br>PR: ${mapData.design_point.pr?.toFixed(2)}<extra></extra>`
            })
        }
        return traces
    }

    const chartPlaceholder = (msg) => (
        <div className="w-full h-full flex items-center justify-center">
            <div className={`text-white/10 uppercase tracking-[0.5em] text-[13px] font-black ${loading ? 'animate-pulse' : ''}`}>
                {msg}
            </div>
        </div>
    )

    return (
        <div className="space-y-16 animate-in pb-20">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div className="flex gap-12 items-center">
                    {['compressor', 'throttle', 'surge_profile'].map(view => (
                        <button
                            key={view} onClick={() => setActiveView(view)}
                            className={`text-[12px] tracking-[0.3em] uppercase transition-all pb-3 ${activeView === view ? 'text-white border-b border-white font-black' : 'text-white/30 font-bold hover:text-white'}`}
                        >
                            {view.replace('_', ' ')}
                        </button>
                    ))}
                </div>
                <div className="status-badge">
                    {loading ? 'EXECUTING...' : error ? 'SOLVER_ERROR' : 'OFF_DESIGN_KERNEL_ACTIVE'}
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
                {/* Parameters Sidebar */}
                <section className="col-span-12 lg:col-span-3 space-y-4">
                   <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">OFF_DESIGN_SPEC</h2>
                        <SliderControl label="Flight Altitude" value={Math.round(dpParams.alt)} unit="m" min={0} max={15000} step={500} onChange={v => setDpParams({...dpParams, alt: v})} />
                        <SliderControl label="Mach Number" value={dpParams.mach.toFixed(2)} unit="M" min={0} max={1.5} step={0.01} onChange={v => setDpParams({...dpParams, mach: v})} />
                        <SliderControl label="Core PR" value={Math.round(dpParams.prc)} unit="–" min={5} max={50} step={1} onChange={v => setDpParams({...dpParams, prc: v})} />
                        <SliderControl label="Turbine Inlet T" value={Math.round(dpParams.tit)} unit="K" min={1000} max={2000} step={25} onChange={v => setDpParams({...dpParams, tit: v})} />
                   </div>

                   <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4 disabled:opacity-60"
                    >
                        <span className="material-symbols-outlined !text-[20px]">{loading ? 'sync' : 'cached'}</span>
                        {loading ? 'COMPUTING...' : 'RECALIBRATE_ENGINE_MAP'}
                   </button>
                </section>

                {/* Main Workspace */}
                <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
                    {activeView === 'compressor' && (
                        <>
                            <div className="h-[600px] bg-surface-container-lowest border border-white/10 relative overflow-hidden flex flex-col group p-12">
                                <div className="panel-accent"></div>
                                <div className="absolute top-12 right-12 z-20 space-y-3 text-right">
                                    <h3 className="mono text-[12px] font-black text-white tracking-[0.2em] uppercase">COMPRESSOR_RECOVERY_PLOT</h3>
                                    <p className="mono text-[11px] text-white/30 tracking-widest">[SPEED_LINES: 0.70 {"->"} 1.05]</p>
                                </div>

                                {loading ? (
                                    chartPlaceholder('EXECUTING_ENGINE_MAP_SOLVER...')
                                ) : mapData ? (
                                    <Plot
                                        data={buildMapTraces()}
                                        layout={{
                                            plot_bgcolor: 'transparent', paper_bgcolor: 'transparent',
                                            autosize: true, margin: { t: 80, b: 80, l: 100, r: 80 },
                                            xaxis: {
                                                title: { text: 'Corrected Mass Flow [kg/s]', font: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                                gridcolor: 'rgba(255,255,255,0.05)',
                                                tickfont: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.3)' },
                                                showline: true, linecolor: 'rgba(255,255,255,0.1)'
                                            },
                                            yaxis: {
                                                title: { text: 'Pressure Ratio [PR]', font: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                                gridcolor: 'rgba(255,255,255,0.05)',
                                                tickfont: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.3)' },
                                                showline: true, linecolor: 'rgba(255,255,255,0.1)'
                                            },
                                            showlegend: false, hovermode: 'closest',
                                            font: { family: 'Inter', size: 14, color: '#fff' }
                                        }}
                                        className="w-full h-full"
                                        config={{ displayModeBar: false, responsive: true }}
                                    />
                                ) : chartPlaceholder(error ? 'SOLVER_ERROR — CHECK BACKEND' : 'Awaiting_Analysis...')}
                            </div>

                            <div className="grid grid-cols-4 gap-1 grid-bg shrink-0">
                                <StatPanel
                                    label="SURGE MARGIN"
                                    value={surgeMargin ?? (loading ? '—' : '—')}
                                    unit="%" sub="OPERATIONAL_STATUS"
                                />
                                <StatPanel
                                    label="PEAK EFFICIENCY"
                                    value={mapData?.speed_lines?.[0]?.eta?.[0]
                                        ? (mapData.speed_lines[0].eta[0] * 100).toFixed(1)
                                        : '—'}
                                    unit="%" sub="POLYTROPIC_PEAK"
                                />
                                <StatPanel
                                    label="NORM. FLOW"
                                    value={throttleData?.[0]?.mdot_corr_norm?.toFixed(3) || '—'}
                                    unit="[-]" sub="NORMALIZED_REF"
                                />
                                <StatPanel
                                    label="THROTTLE STATUS"
                                    value={loading ? '—' : (throttleData?.some(r => r.surge) ? 'SURGE' : throttleData ? 'PASS' : '—')}
                                    unit=""
                                    sub={loading ? 'EXECUTING_ENGINE_DECK' : 'SENSORS_STABLE'}
                                    alert={!loading && throttleData?.some(r => r.surge)}
                                />
                            </div>
                        </>
                    )}

                    {activeView === 'throttle' && (
                        <div className="flex flex-col space-y-8 h-full">
                            <div className="flex items-center justify-between border-b border-white/10 pb-6 shrink-0">
                                <div className="flex items-center gap-6">
                                    <span className="material-symbols-outlined !text-[22px] text-white/40">dns</span>
                                    <h3 className="text-[13px] font-black tracking-[0.3em]">THROTTLE PERFORMANCE SUITE</h3>
                                </div>
                                <button
                                    onClick={handleExportDeck}
                                    disabled={!throttleData}
                                    className={`mono text-[11px] font-black uppercase tracking-widest transition-colors ${throttleData ? 'text-white/60 hover:text-white cursor-pointer' : 'text-white/20 cursor-not-allowed'}`}
                                >EXPORT ENGINE DECK</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 grow h-[500px]">
                                <div className="bg-surface-container-lowest border border-white/10 p-8 flex flex-col group">
                                    <h4 className="mono text-[11px] font-black text-white/30 mb-8 uppercase tracking-[0.3em]">TSFC_THRUST_CORRELATION (FISHHOOK)</h4>
                                    {loading ? chartPlaceholder('COMPUTING...') : throttleData ? (
                                        <Plot
                                            data={[{
                                                x: throttleData.map(r => r.spec_thrust),
                                                y: throttleData.map(r => r.tsfc),
                                                mode: 'lines+markers', name: 'FISHHOOK',
                                                line: { color: '#fff', width: 2, shape: 'spline' },
                                                marker: { size: 6, color: '#fff', opacity: 0.6 },
                                                hovertemplate: `TSFC: %{y:.4f}<br>Thrust: %{x:.1f}<extra></extra>`
                                            }]}
                                            layout={{
                                                plot_bgcolor: 'transparent', paper_bgcolor: 'transparent',
                                                autosize: true, margin: { t: 10, b: 60, l: 80, r: 20 },
                                                xaxis: { title: { text: 'SPEC_THRUST [Ns/kg]', font: { size: 10, color: 'rgba(255,255,255,0.4)' } }, gridcolor: 'rgba(255,255,255,0.05)', tickfont: { size: 10, color: 'rgba(255,255,255,0.3)' } },
                                                yaxis: { title: { text: 'TSFC [mg/Ns]', font: { size: 10, color: 'rgba(255,255,255,0.4)' } }, gridcolor: 'rgba(255,255,255,0.05)', tickfont: { size: 10, color: 'rgba(255,255,255,0.3)' } },
                                                showlegend: false, font: { family: 'JetBrains Mono' }
                                            }}
                                            className="w-full h-full"
                                            config={{ displayModeBar: false, responsive: true }}
                                        />
                                    ) : chartPlaceholder('Awaiting_Analysis...')}
                                </div>

                                <div className="bg-surface-container-lowest border border-white/10 p-8 flex flex-col overflow-hidden">
                                     <h4 className="mono text-[11px] font-black text-white/30 mb-8 uppercase tracking-[0.3em]">TABULAR_STATE_AUDIT</h4>
                                     <div className="overflow-y-auto grow custom-scrollbar">
                                        <table className="w-full text-left mono text-[11px]">
                                            <thead className="sticky top-0 bg-surface-container-lowest z-10 border-b border-white/10">
                                                <tr className="text-white/30 uppercase font-black tracking-widest text-[10px]">
                                                    <th className="pb-4 pr-12">THROT_%</th>
                                                    <th className="pb-4 pr-12">S_THRUST</th>
                                                    <th className="pb-4 pr-12">TSFC</th>
                                                    <th className="pb-4">SURGE</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {throttleData?.map((r, i) => (
                                                    <tr key={i} className={`group hover:bg-white/5 ${r.surge ? 'bg-red-950/20' : ''}`}>
                                                        <td className="py-4 font-black text-white">{r.throttle_pct}%</td>
                                                        <td className="py-4 text-white/40 group-hover:text-white/80">{r.spec_thrust?.toFixed(1)}</td>
                                                        <td className="py-4 text-white/40 group-hover:text-white/80">{r.tsfc?.toFixed(3)}</td>
                                                        <td className={`py-4 font-black ${r.surge ? 'text-red-500' : 'text-white/20'}`}>{r.surge ? 'CRIT' : 'SAFE'}</td>
                                                    </tr>
                                                )) ?? (
                                                    <tr><td colSpan={4} className="py-10 text-center text-white/20 text-[11px] uppercase tracking-widest">
                                                        {loading ? 'Computing...' : 'No data'}
                                                    </td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                     </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'surge_profile' && (
                        <div className="h-[600px] bg-surface-container-lowest border border-white/10 relative overflow-hidden group p-12">
                            <div className="panel-accent"></div>
                            <div className="absolute top-12 right-12 z-20 text-right space-y-2">
                                <h3 className="mono text-[12px] font-black text-white tracking-[0.2em] uppercase">SURGE_PROXIMITY_PROFILE</h3>
                                <p className="mono text-[11px] text-white/30 tracking-widest">SM vs. throttle setting</p>
                            </div>
                            {loading ? chartPlaceholder('COMPUTING_SURGE_PROFILE...') : throttleData ? (
                                <Plot
                                    data={[{
                                        x: throttleData.map(r => r.throttle_pct),
                                        y: throttleData.map((r, i, arr) => {
                                            const dp = arr[arr.length - 1]
                                            return dp?.pr ? (((dp.pr - r.pr) / dp.pr) * 100).toFixed(2) : 0
                                        }),
                                        mode: 'lines+markers', name: 'SURGE_MARGIN',
                                        line: { color: '#fff', width: 2 },
                                        marker: { size: 6, color: throttleData.map(r => r.surge ? 'rgba(255,68,68,0.9)' : '#fff') },
                                        hovertemplate: 'Throttle: %{x}%<br>SM: %{y}%<extra></extra>'
                                    }]}
                                    layout={{
                                        plot_bgcolor: 'transparent', paper_bgcolor: 'transparent',
                                        autosize: true, margin: { t: 60, b: 60, l: 80, r: 60 },
                                        xaxis: { title: { text: 'Throttle [%]', font: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.4)' } }, gridcolor: 'rgba(255,255,255,0.04)', tickfont: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.3)' } },
                                        yaxis: { title: { text: 'Surge Margin [%]', font: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.4)' } }, gridcolor: 'rgba(255,255,255,0.04)', tickfont: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.3)' } },
                                        shapes: [{ type: 'line', x0: 0, x1: 100, y0: 15, y1: 15, line: { color: 'rgba(255,68,68,0.4)', width: 1, dash: 'dash' } }],
                                        annotations: [{ x: 50, y: 15, text: 'MIN_SM_THRESHOLD (15%)', showarrow: false, font: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,68,68,0.6)' }, yshift: 10 }],
                                        showlegend: false, font: { family: 'Inter', color: '#fff' }
                                    }}
                                    className="w-full h-full"
                                    config={{ displayModeBar: false, responsive: true }}
                                />
                            ) : chartPlaceholder('Awaiting_Analysis...')}
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
