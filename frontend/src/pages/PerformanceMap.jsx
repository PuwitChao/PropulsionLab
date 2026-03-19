import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'

// ── Components ───────────────────────────────────────────────────────────────

function StatPanel({ label, value, unit, sub, alert }) {
    return (
        <div className={`flex flex-col items-end group p-10 border border-white/10 bg-surface-container-low hover:bg-surface-container transition-all ${alert ? 'border-red-500/20' : ''}`}>
            <span className={`text-[11px] font-black tracking-[0.2em] uppercase mb-5 font-headline transition-colors ${alert ? 'text-red-500' : 'text-white/40 group-hover:text-white'}`}>{label}</span>
            <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black mono text-white">{value}</span>
                <span className="text-[12px] mono text-white/30 uppercase font-bold tracking-[0.1em]">{unit}</span>
            </div>
            {sub && <span className="text-[10px] mono text-white/20 uppercase tracking-[0.1em] mt-2 italic">{sub}</span>}
        </div>
    )
}

function SliderControl({ label, value, unit, min, max, onChange, disabled, step }) {
    return (
        <div className={`flex flex-col gap-6 transition-all ${disabled ? 'opacity-20 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-baseline px-2">
                <span className="text-[11px] mono font-black tracking-[0.1em] text-white/40 uppercase">{label}</span>
                <span className="text-[12px] font-mono font-black text-white uppercase tracking-widest">{value} {unit}</span>
            </div>
            <input 
                type="range" min={min} max={max} step={step || (max-min)/100}
                value={value} onChange={e => onChange(parseFloat(e.target.value))}
            />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PerformanceMap() {
    const [loading, setLoading] = useState(false)
    const [mapData, setMapData] = useState(null)
    const [throttleData, setThrottleData] = useState(null)
    const [activeView, setActiveView] = useState('compressor')
    
    const [dpParams, setDpParams] = useState({
        alt: 0,
        mach: 0.0,
        prc: 20,
        tit: 1550,
    })

    const runAnalysis = useCallback(async () => {
        setLoading(true)
        try {
            const [m, t] = await Promise.all([
                fetchData('/analyze/offdesign/map', { method: 'POST', body: JSON.stringify({...dpParams, n_speed_lines: 8}) }),
                fetchData('/analyze/offdesign/throttle', { method: 'POST', body: JSON.stringify({...dpParams, n_points: 15}) })
            ])
            setMapData(m)
            setThrottleData(t)
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [dpParams])

    useEffect(() => {
        const t = setTimeout(runAnalysis, 300)
        return () => clearTimeout(t)
    }, [dpParams, runAnalysis])

    const buildMapTraces = () => {
        if (!mapData) return []
        const traces = []
        
        // 1. Speed Lines
        mapData.speed_lines.forEach((sl, idx) => {
            traces.push({
                x: sl.flow, y: sl.pr, mode: 'lines', name: sl.label,
                line: { color: `rgba(255,255,255,${0.05 + (idx/mapData.speed_lines.length)*0.5})`, width: 1.2 },
                hovertemplate: `W_corr: %{x}<br>PR: %{y}<br>ETA: ${sl.eta[0]}<extra></extra>`
            })
        })
        
        // 2. Surge Line
        if (mapData.surge_line) {
            traces.push({ 
                x: mapData.surge_line.flow, y: mapData.surge_line.pr, mode: 'lines', name: 'SURGE_LIMIT', 
                line: { color: 'rgba(255, 68, 68, 0.4)', width: 2, dash: 'dash' },
                hovertemplate: `SURGE_LIMIT<extra></extra>`
            })
        }

        // 3. Operating Line (from throttle sweep)
        if (throttleData && throttleData.length > 0) {
            traces.push({
                x: throttleData.map(r => r.N_corr_norm ** 1.4), // Approx flow
                y: throttleData.map(r => r.pr),
                name: 'OPERATING_LINE',
                mode: 'lines+markers',
                marker: { size: 4, color: '#fff' },
                line: { color: '#fff', width: 2.5 },
                hovertemplate: `OP_POINT<br>Throttle: %{text}%<extra></extra>`,
                text: throttleData.map(r => r.throttle_pct)
            })
        }

        // 4. Design Point Marker
        if (mapData.design_point) {
            traces.push({
                x: [mapData.design_point.flow],
                y: [mapData.design_point.pr],
                name: 'ANCHOR_DESIGN_POINT',
                mode: 'markers',
                marker: { color: '#fff', size: 12, symbol: 'star-triangle-up' },
                hovertemplate: `DESIGN_POINT<br>W_corr: 1.0<br>PR: ${mapData.design_point.pr}<extra></extra>`
            })
        }

        return traces
    }

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
                <div className="status-badge">OFF_DESIGN_KERNEL_ACTIVE</div>
            </div>

            <div className="grid grid-cols-12 gap-12">
                {/* Parameters Sidebar */}
                <section className="col-span-12 lg:col-span-3 space-y-16">
                   <div className="bg-surface-container-low border border-white/10 p-12 space-y-12">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-6">DESIGN_POINT_FIX</h2>
                        <div className="space-y-12">
                            <SliderControl label="ALTITUDE" value={dpParams.alt} unit="M" min={0} max={15000} step={500} onChange={v => setDpParams({...dpParams, alt: v})} />
                            <SliderControl label="FLIGHT_MACH" value={dpParams.mach.toFixed(2)} unit="M" min={0} max={1.5} step={0.01} onChange={v => setDpParams({...dpParams, mach: v})} />
                            <SliderControl label="CORE_PR" value={dpParams.prc} unit="PI" min={5} max={50} step={1} onChange={v => setDpParams({...dpParams, prc: v})} />
                            <SliderControl label="TURB_TIT" value={dpParams.tit} unit="K" min={1000} max={2000} step={25} onChange={v => setDpParams({...dpParams, tit: v})} />
                        </div>
                   </div>

                   <button 
                        onClick={runAnalysis}
                        className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4"
                    >
                        <span className="material-symbols-outlined !text-[20px]">cached</span>
                        RECALIBRATE_MAP
                   </button>
                </section>

                {/* Main Workspace */}
                <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
                    {activeView === 'compressor' && (
                        <>
                            <div className="h-[600px] bg-surface-container-lowest border border-white/10 relative overflow-hidden flex flex-col group p-12">
                                <div className="panel-accent"></div>
                                
                                <div className="absolute top-12 right-12 z-20 space-y-3 text-right">
                                    <h3 className="mono text-[12px] font-black text-white tracking-[0.2em] uppercase">CORRECTED_SPEED_PLOTS</h3>
                                    <p className="mono text-[11px] text-white/30 tracking-widest">[N_LINES: 0.70 {"->"} 1.05]</p>
                                </div>
                                
                                <Plot 
                                    data={buildMapTraces()}
                                    layout={{
                                        plot_bgcolor: 'transparent',
                                        paper_bgcolor: 'transparent',
                                        autosize: true,
                                        margin: { t: 80, b: 80, l: 100, r: 80 },
                                        xaxis: { 
                                            title: { text: 'W_CORRECTED [kg/s]', font: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                            gridcolor: 'rgba(255,255,255,0.05)',
                                            tickfont: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.3)' },
                                            showline: true, linecolor: 'rgba(255,255,255,0.1)'
                                        },
                                        yaxis: { 
                                            title: { text: 'PRESSURE_RATIO [PI]', font: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                            gridcolor: 'rgba(255,255,255,0.05)',
                                            tickfont: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.3)' },
                                            showline: true, linecolor: 'rgba(255,255,255,0.1)'
                                        },
                                        showlegend: false,
                                        hovermode: 'closest',
                                        font: { family: 'Inter', size: 14, color: '#fff' }
                                    }}
                                    className="w-full h-full"
                                    config={{ displayModeBar: false, responsive: true }}
                                />
                            </div>

                            <div className="grid grid-cols-4 gap-1 grid-bg">
                                <StatPanel label="SURGE_MARGIN" value="14.2" unit="%" sub="NOMINAL_ENVELOPE" />
                                <StatPanel label="PEAK_EFF" value="89.1" unit="%" sub="POLYTROPIC_STABLE" />
                                <StatPanel label="NORM_FLOW" value="0.945" unit="W" sub="OP_POINT_REF" />
                                <StatPanel label="STALL_STAT" value="NOM" unit="" sub="SENSOR_FEED_ACTIVE" />
                            </div>
                        </>
                    )}

                    {activeView === 'throttle' && (
                        <div className="flex flex-col space-y-8">
                            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                                <div className="flex items-center gap-6">
                                    <span className="material-symbols-outlined !text-[22px] text-white/40">dns</span>
                                    <h3 className="text-[13px] font-black tracking-[0.3em]">PERFORMANCE_THROTTLE_DECK</h3>
                                </div>
                                <button className="mono text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">EXPORT_CSV_NODE</button>
                            </div>

                            <div className="bg-surface-container-low border border-white/10 overflow-hidden">
                                <table className="w-full text-left mono text-[12px]">
                                    <thead>
                                        <tr className="bg-white/5 text-white/30 font-black tracking-[0.1em] border-b border-white/10 uppercase">
                                            <th className="px-12 py-6">Throt_Pct</th>
                                            <th className="px-12 py-6 border-l border-white/10">Spec_Thrust [Ns/kg]</th>
                                            <th className="px-12 py-6 border-l border-white/10">TSFC [mg/Ns]</th>
                                            <th className="px-12 py-6 border-l border-white/10">TIT_Temp [K]</th>
                                            <th className="px-12 py-6 border-l border-white/10">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {throttleData?.map((r, i) => (
                                            <tr key={i} className={`hover:bg-white/[0.03] transition-colors group ${r.surge ? 'bg-red-950/20' : ''}`}>
                                                <td className="px-12 py-5 font-black text-white border-l-[3px] border-transparent group-hover:border-white">{r.throttle_pct}%</td>
                                                <td className="px-12 py-5 border-l border-white/10 text-white/50 group-hover:text-white/90">{r.spec_thrust?.toFixed(1)}</td>
                                                <td className="px-12 py-5 border-l border-white/10 text-white/50 group-hover:text-white/90">{(r.tsfc*1e6).toFixed(3)}</td>
                                                <td className="px-12 py-5 border-l border-white/10 text-white/50 group-hover:text-white/90">{r.tt4?.toFixed(0)}</td>
                                                <td className={`px-12 py-5 border-l border-white/10 font-black tracking-[0.1em] ${r.surge ? 'text-red-500 underline decoration-red-900' : 'text-white/40'}`}>
                                                    {r.surge ? 'CRITICAL_SURGE' : 'NOMINAL_STATE'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
