import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'

// ── Components ───────────────────────────────────────────────────────────────

function StatPanel({ label, value, unit, sub }) {
    return (
        <div className="flex flex-col items-end group p-10 border border-white/10 bg-surface-container-low hover:bg-surface-container transition-all">
            <span className={`text-[11px] font-black tracking-[0.2em] text-white/40 uppercase mb-5 font-headline group-hover:text-white transition-colors`}>{label}</span>
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

export default function MissionAnalysis() {
    const [loading, setLoading] = useState(false)
    const [data, setData] = useState(null)
    const [aircraftData, setAircraftData] = useState(() => {
        const saved = localStorage.getItem('mission_aircraft_data')
        return saved ? JSON.parse(saved) : {
            k: 0.1,
            cd0: 0.02,
            cl_max: 2.0
        }
    })

    useEffect(() => {
        localStorage.setItem('mission_aircraft_data', JSON.stringify(aircraftData))
    }, [aircraftData])

    const runAnalysis = useCallback(async () => {
        setLoading(true)
        try {
            const result = await fetchData('/analyze/mission', {
                method: 'POST',
                body: JSON.stringify({
                    aircraft_data: aircraftData,
                    constraints: [
                        { type: 'level', label: 'Cruise (M0.8 @ 10km)', alt: 10000, mach: 0.8 },
                        { type: 'ps', label: 'Ps=50 (M0.9 @ 5km)', alt: 5000, mach: 0.9, ps: 50 },
                        { type: 'turn', label: '3G Turn (M0.7 @ 3km)', alt: 3000, mach: 0.7, n: 3 },
                        { type: 'takeoff', label: 'Takeoff (1200m)', sto: 1200, cl_max: 2.0 },
                        { type: 'ceiling', label: 'Service Ceiling (15km)', alt: 15000, mach: 0.8 }
                    ],
                    ws_min: 1000,
                    ws_max: 8000,
                    ws_steps: 60
                })
            })
            setData(result)
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [aircraftData])

    useEffect(() => {
        const t = setTimeout(runAnalysis, 300)
        return () => clearTimeout(t)
    }, [aircraftData, runAnalysis])

    // Compute Envelope Compliance: fraction of W/S range where all constraints are met below T/W=1.0
    const feasibleTW = data ? data.ws.map((_, i) => {
        return Math.max(...data.series.map(s => s.values[i]))
    }) : []

    const envelopeCompliance = data
        ? Math.round((feasibleTW.filter(v => v <= 1.0).length / feasibleTW.length) * 100)
        : 0

    const plotTraces = data ? [
        // Transparent upper boundary for filling (Target T/W limit)
        {
            x: data.ws,
            y: data.ws.map(() => 1.2),
            showlegend: false,
            mode: 'none',
            hoverinfo: 'skip'
        },
        // Feasible Region Shading (Area satisfying all requirements)
        {
            x: data.ws,
            y: feasibleTW,
            name: 'FEASIBLE_REGION',
            fill: 'tonexty',
            fillcolor: 'rgba(255,255,255,0.03)',
            type: 'scatter',
            mode: 'none',
            hoverinfo: 'skip',
            showlegend: true
        },
        ...data.series.map((s, idx) => ({
            x: data.ws,
            y: s.values,
            name: s.label.toUpperCase(),
            type: 'scatter',
            mode: 'lines',
            line: { 
                color: idx === 0 ? '#fff' : `rgba(255,255,255,${0.1 + (idx/data.series.length)*0.4})`, 
                width: idx === 0 ? 2.5 : 1.5,
                dash: idx === 0 ? 'solid' : 'dash'
            },
            hovertemplate: `<b>${s.label.toUpperCase()}</b><br>W/S: %{x}<br>T/W: %{y}<extra></extra>`
        })),
        {
            x: [data.optimum?.ws],
            y: [data.optimum?.tw],
            name: 'DESIGN_CORNER',
            mode: 'markers',
            marker: { 
                color: '#fff', 
                size: 15, 
                symbol: 'cross-thin',
                line: { width: 2, color: '#fff' }
            },
            type: 'scatter',
            hovertemplate: `<b>OPTIMUM_CORNER</b><br>W/S: %{x} PA<br>T/W: %{y}<extra></extra>`
        }
    ] : []

    return (
        <div className="space-y-16 animate-in pb-20">
             <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div className="flex items-center gap-8">
                    <span className="uppercase tracking-[0.4em] text-[13px] font-black text-white font-headline">MISSION CONSTRAINT ARCHITECTURE</span>
                </div>
                <div className="status-badge">OPTIMIZER_NODE_READY</div>
            </div>

            <div className="grid grid-cols-12 gap-12">
                {/* Aircraft Configuration */}
                <section className="col-span-12 lg:col-span-3 space-y-16">
                   <div className="bg-surface-container-low border border-white/10 p-12 space-y-12">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-6">AERODYNAMIC PROPERTIES</h2>
                        <div className="space-y-12">
                            <SliderControl 
                                label="Zero-Lift Drag (CD0)" value={aircraftData.cd0.toFixed(4)} unit="" 
                                min={0.01} max={0.05} step={0.001} 
                                onChange={v => setAircraftData({...aircraftData, cd0: v})} 
                            />
                            <SliderControl 
                                label="Induced Drag Factor (k)" value={aircraftData.k.toFixed(3)} unit="" 
                                min={0.02} max={0.2} step={0.005} 
                                onChange={v => setAircraftData({...aircraftData, k: v})} 
                            />
                            <SliderControl 
                                label="Max Lift Coefficient" value={aircraftData.cl_max.toFixed(2)} unit="CL" 
                                min={1.0} max={3.5} step={0.05} 
                                onChange={v => setAircraftData({...aircraftData, cl_max: v})} 
                            />
                        </div>
                   </div>

                   <button className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4">
                        <span className="material-symbols-outlined !text-[20px]">hub</span>
                        MAP FEASIBLE ENVELOPE
                   </button>
                </section>

                {/* Main Workspace */}
                <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
                    <div className="h-[600px] bg-surface-container-lowest border border-white/10 relative overflow-hidden flex flex-col group p-12">
                        <div className="panel-accent"></div>
                        
                        <div className="absolute top-12 right-12 z-20 space-y-3 text-right">
                            <h3 className="mono text-[12px] font-black text-white tracking-[0.2em] uppercase">PERFORMANCE CLOUD SYNTHESIS</h3>
                            <p className="mono text-[11px] text-white/30 tracking-widest">[REGION_ID: ENVELOPE_PASS]</p>
                        </div>
                        
                        <Plot 
                            data={plotTraces}
                            layout={{
                                plot_bgcolor: 'transparent',
                                paper_bgcolor: 'transparent',
                                autosize: true,
                                margin: { t: 80, b: 140, l: 100, r: 80 },
                                xaxis: { 
                                    title: { text: 'Wing Loading (W/S) [Pa]', font: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                    gridcolor: 'rgba(255,255,255,0.05)',
                                    tickfont: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.3)' },
                                    showline: true, linecolor: 'rgba(255,255,255,0.1)',
                                    range: [1000, 8000]
                                },
                                yaxis: { 
                                    title: { text: 'Thrust-to-Weight (T/W)', font: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.5)' }, standoff: 30 },
                                    gridcolor: 'rgba(255,255,255,0.05)',
                                    tickfont: { family: 'JetBrains Mono', size: 12, color: 'rgba(255,255,255,0.3)' },
                                    showline: true, linecolor: 'rgba(255,255,255,0.1)',
                                    range: [0, 1.2]
                                },
                                showlegend: true,
                                legend: { font: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.4)' }, orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center' },
                                hovermode: 'closest',
                                font: { family: 'Inter', size: 14, color: '#fff' }
                            }}
                            className="w-full h-full"
                            config={{ displayModeBar: false, responsive: true }}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-1 grid-bg">
                        <StatPanel label="DESIGN WING LOADING" value={data?.optimum?.ws?.toFixed(0) || '—'} unit="Pa" sub="MIN_AIRCRAFT_SIZE" />
                        <StatPanel label="MINIMUM T/W" value={data?.optimum?.tw?.toFixed(3) || '—'} unit="" sub="FEASIBLE_BOUND" />
                        <StatPanel label="ENVELOPE COMPLIANCE" value={data ? envelopeCompliance : '—'} unit="%" sub="REGION_OPTIMIZED" />
                    </div>

                    {/* Operational Summary */}
                    <div className="bg-surface-container-low border border-white/10 p-14 space-y-12 relative group">
                        <div className="panel-accent"></div>
                        <div className="flex items-center gap-6 pb-8 border-b border-white/20">
                             <span className="material-symbols-outlined !text-[24px] text-white/70">description</span>
                             <h2 className="text-[13px] font-black tracking-[0.3em] uppercase text-white">OPERATIONAL_SYNTHESIS_REPORT</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-20">
                            <div className="space-y-5">
                                <p className="text-[12px] font-black text-white tracking-[0.2em] uppercase">Constraint_Priority</p>
                                <p className="text-[13px] mono text-white/50 leading-[1.8] uppercase border-l-2 border-white/20 pl-8">
                                    Turn performance dictates T/W requirements for the mid-range wing loading spectrum. Takeoff performance marks the upper bound for wing load selection.
                                </p>
                            </div>
                            <div className="space-y-5">
                                <p className="text-[12px] font-black text-white tracking-[0.2em] uppercase">Optimal_Selection</p>
                                <p className="text-[13px] mono text-white/50 leading-[1.8] uppercase border-l-2 border-white/20 pl-8">
                                    The selected corner represents the theoretical global minimum for propulsion installation volume while maintaining 50m/s specific excess power at M0.9.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
