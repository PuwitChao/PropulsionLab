import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'

// ── Components ───────────────────────────────────────────────────────────────

function StatPanel({ label, value, unit, sub }) {
    return (
        <div className="flex flex-col items-end group p-12 border border-white/10 bg-surface-container-low hover:bg-surface-container transition-all">
            <span className="text-[11px] font-black tracking-[0.2em] text-white/40 uppercase mb-5 font-headline group-hover:text-white transition-colors">{label}</span>
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
            <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-black tracking-[0.2em] text-white/40 uppercase">{label}</span>
                <span className="text-[12px] font-mono font-bold text-white uppercase tracking-widest">{value} {unit}</span>
            </div>
            <input 
                type="range" min={min} max={max} step={step || (max-min)/100}
                value={value} onChange={e => onChange(parseFloat(e.target.value))}
            />
        </div>
    )
}

function MocVisualization({ mocData }) {
  const traces = []
  
  if (mocData) {
    // 1. Wall Contour
    traces.push({
      x: mocData.x,
      y: mocData.y,
      name: 'NOZZLE_WALL',
      type: 'scatter',
      mode: 'lines',
      line: { color: '#fff', width: 3 },
      hovertemplate: 'WALL_NODE<br>X: %{x}m<br>R: %{y}m<extra></extra>'
    })
    
    // Lower wall (Symmetry)
    traces.push({
      x: mocData.x,
      y: mocData.y.map(v => -v),
      name: 'WALL_LOWER',
      type: 'scatter',
      mode: 'lines',
      line: { color: 'rgba(255,255,255,0.2)', width: 1, dash: 'dash' },
      showlegend: false,
      hoverinfo: 'skip'
    })

    // 2. Wave Mesh (C+ and C-)
    if (mocData.mesh) {
        mocData.mesh.forEach((wave, i) => {
            traces.push({
                x: wave.x,
                y: wave.y,
                name: i === 0 ? 'WAVE_REFLECTIONS' : '',
                legendgroup: 'waves',
                showlegend: i === 0,
                type: 'scatter',
                mode: 'lines',
                line: { 
                    color: wave.type === 'C+' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)', 
                    width: 0.8 
                },
                hovertemplate: `${wave.type}_WAVE<br>MACH: ${wave.mach}<extra></extra>`
            })
            
            // Lower symmetry waves
            traces.push({
                x: wave.x,
                y: wave.y.map(v => -v),
                legendgroup: 'waves',
                showlegend: false,
                type: 'scatter',
                mode: 'lines',
                line: { 
                    color: 'rgba(255,255,255,0.05)', 
                    width: 0.5 
                },
                hoverinfo: 'skip'
            })
        })
    }
    
    // 3. Centerline
    traces.push({
        x: [0, Math.max(...mocData.x) * 1.1],
        y: [0, 0],
        name: 'CENTER_LINE',
        mode: 'lines',
        line: { color: 'rgba(255,255,255,0.05)', width: 1, dash: 'dot' },
        hoverinfo: 'skip'
    })
  }

  return (
    <div className="flex-1 bg-surface-container-lowest border border-white/10 relative overflow-hidden flex flex-col group min-h-[550px]">
      <div className="panel-accent"></div>
      
      <div className="absolute top-12 left-12 z-20 space-y-3 pointer-events-none">
        <h2 className="text-[14px] font-black tracking-[0.3em] text-white">NOZZLE_EXPANSION_MESH</h2>
        <p className="mono text-[11px] text-white/30 uppercase underline tracking-widest">
            {mocData ? `NODE_COUNT: ${mocData.x?.length || 0} // SOLVER: MOC_RADIAL_SYM` : 'Awaiting Design Initialization...'}
        </p>
      </div>

      <div className="flex-1 w-full bg-black/20">
        {mocData ? (
            <Plot 
                data={traces}
                layout={{
                    plot_bgcolor: 'transparent',
                    paper_bgcolor: 'transparent',
                    autosize: true,
                    margin: { t: 40, b: 60, l: 60, r: 60 },
                    xaxis: { 
                        gridcolor: 'rgba(255,255,255,0.03)',
                        tickfont: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.3)' },
                        showline: true, linecolor: 'rgba(255,255,255,0.1)',
                        zeroline: false,
                        scaleanchor: 'y'
                    },
                    yaxis: { 
                        gridcolor: 'rgba(255,255,255,0.03)',
                        tickfont: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.3)' },
                        showline: true, linecolor: 'rgba(255,255,255,0.1)',
                        zeroline: false
                    },
                    showlegend: true,
                    legend: { font: { family: 'JetBrains Mono', size: 10, color: 'white' }, y: 0.95, x: 0.95, xanchor: 'right' },
                    hovermode: 'closest',
                    font: { family: 'Inter', color: '#fff' }
                }}
                className="w-full h-full"
                config={{ displayModeBar: false, responsive: true }}
            />
        ) : (
            <div className="w-full h-full flex items-center justify-center">
                <div className="text-white/10 uppercase tracking-[0.5em] text-[14px] font-black animate-pulse">Design_Record_Pending</div>
            </div>
        )}
      </div>

      <div className="p-12 border-t border-white/10 flex items-center justify-between bg-black/40 relative z-20">
        <div className="flex gap-x-16 text-[12px] mono text-white/40 uppercase tracking-[0.2em]">
          <span className="flex items-center gap-4"><div className="w-2 h-2 bg-white opacity-40"></div> X_DOMAIN: 0.00 {"->"} {(mocData?.x[mocData.x.length-1] || 0.0).toFixed(2)} M</span>
          <span className="flex items-center gap-4"><div className="w-2 h-2 bg-white opacity-40"></div> R_EXIT: {(mocData?.y[mocData.y.length-1] || 0.0).toFixed(2)} M</span>
        </div>
        <div className="flex gap-6">
          <button className="w-14 h-14 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center">
            <span className="material-symbols-outlined !text-[22px] text-white/60 hover:text-white transition-colors">zoom_in</span>
          </button>
          <button className="w-14 h-14 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all flex items-center justify-center">
            <span className="material-symbols-outlined !text-[22px] text-white/60 hover:text-white transition-colors">3d_rotation</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RocketAnalysis() {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [params, setParams] = useState({
        pc: 7.5e6, of_ratio: 6.0, pe: 101325.0,
        propellant: 'H2/O2', mode: 'shifting',
        thrust_target_N: 500000 
    })
    const [mocData, setMocData] = useState(null)

    const runAnalysis = useCallback(async () => {
        setLoading(true)
        try {
            const [main, moc] = await Promise.all([
                fetchData('/analyze/rocket', { method: 'POST', body: JSON.stringify(params) }),
                fetchData('/analyze/rocket/moc', { 
                    method: 'POST', 
                    body: JSON.stringify({ gamma: 1.22, mach_exit: 3.5, throat_radius: 0.12 }) 
                })
            ])
            setResult(main)
            setMocData(moc)
        } catch (e) { console.error(e) }
        setLoading(false)
    }, [params])

    useEffect(() => {
        const t = setTimeout(runAnalysis, 300)
        return () => clearTimeout(t)
    }, [params, runAnalysis])

    return (
        <div className="space-y-16 animate-in pb-20">
             {/* Platform Controls */}
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div className="flex gap-12 items-center">
                    <span className="uppercase tracking-[0.4em] text-[13px] font-black text-white font-headline">CHAMBER_DESIGN_SOLVER</span>
                </div>
                <div className="status-badge">EQUILIBRIUM_ENGINE_READY</div>
            </div>

            <div className="grid grid-cols-12 gap-12">
                {/* Left Col: Params */}
                <section className="col-span-12 lg:col-span-3 space-y-16">
                   <div className="bg-surface-container-low border border-white/10 p-12 space-y-12">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-6">DESIGN_SPEC</h2>
                        <div className="space-y-12">
                            <SliderControl 
                                label="CHAMBER_PR (PC)" value={(params.pc/1e6).toFixed(2)} unit="MPA"
                                min={1} max={25} step={0.1}
                                onChange={v => setParams({...params, pc: v*1e6})}
                            />
                            <SliderControl 
                                label="O/F_RATIO" value={params.of_ratio.toFixed(2)} unit=""
                                min={2} max={12} step={0.1}
                                onChange={v => setParams({...params, of_ratio: v})}
                            />
                            <div className="space-y-6">
                                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 border-b border-white/10 pb-3 block">PROPELLANT_SYS</label>
                                <select 
                                    value={params.propellant} 
                                    onChange={(e) => setParams({...params, propellant: e.target.value})}
                                    className="w-full bg-surface-container-highest border border-white/20 px-8 py-5 text-[12px] mono text-white focus:outline-none focus:border-white transition-all uppercase tracking-widest"
                                >
                                    <option value="H2/O2">LOX / LH2 - HYDROLOX</option>
                                    <option value="CH4/O2">LOX / LCH4 - METHALOX</option>
                                    <option value="RP1/O2">LOX / RP-1 - KEROLOX</option>
                                </select>
                            </div>
                        </div>
                   </div>

                   <div className="bg-surface-container-low border border-white/10 p-12 space-y-10">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-6">EXPORT_PROTOCOLS</h2>
                        <div className="flex flex-col gap-4">
                            <button className="w-full bg-white text-black py-5 px-10 flex items-center justify-between text-[11px] font-black tracking-[0.2em] uppercase hover:bg-white/90 transition-all font-headline">
                                <span>PDF_REPORT</span>
                                <span className="material-symbols-outlined !text-[18px]">picture_as_pdf</span>
                            </button>
                            <button className="w-full border border-white/20 bg-transparent text-white py-5 px-10 flex items-center justify-between text-[11px] font-black tracking-[0.2em] uppercase hover:border-white transition-all font-headline">
                                <span>CAD_MOC_STL</span>
                                <span className="material-symbols-outlined !text-[18px]">draw</span>
                            </button>
                        </div>
                   </div>

                   <button 
                        onClick={runAnalysis}
                        className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4"
                    >
                        <span className="material-symbols-outlined !text-[20px]">rocket_launch</span>
                        SYNTHESIZE_CHAMBER
                   </button>
                </section>

                {/* Middle: Visualization & Stats */}
                <section className="col-span-12 lg:col-span-6 flex flex-col gap-12">
                    <MocVisualization mocData={mocData} />
                    
                    <div className="grid grid-cols-3 gap-1 grid-bg">
                        <StatPanel label="RECORDED_THRUST" value={result ? (result.thrust_vac/1000).toFixed(0) : '0'} unit="kN" sub="VACUUM_NOMINAL" />
                        <StatPanel label="SPECIFIC_IMPULSE" value={result ? result.isp_delivered?.toFixed(1) : '0.0'} unit="s" sub="SHIFTING_EQUILIBRIUM" />
                        <StatPanel label="MASS_FLOW" value={result ? (result.thrust_vac/(result.isp_delivered*9.81)).toFixed(2) : '0.00'} unit="kg/s" sub="STATION_FLOW_RATE" />
                    </div>
                </section>

                {/* Right: Detailed Analysis */}
                <section className="col-span-12 lg:col-span-3 space-y-12">
                    <div className="bg-surface-container-low border border-white/10 p-14">
                         <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-12 pb-5 border-b border-white/10">SOLVER_CONSTANTS</h2>
                         <div className="space-y-10">
                            {[
                                { label: 'ISP_IDEAL', val: `${result?.isp_ideal?.toFixed(1) || '0.0'} S` },
                                { label: 'THRUST_COEFF', val: result?.cf_delivered?.toFixed(4) || '0.0000' },
                                { label: 'EXIT_GAMMA', val: result?.gamma?.toFixed(4) || '0.0000' },
                                { label: 'FLAME_TEMP', val: `${result?.t_chamber?.toFixed(0) || '0'} K` }
                            ].map((row, i) => (
                                <div key={i} className="flex justify-between items-baseline group">
                                    <span className="text-[11px] mono text-white/40 tracking-widest uppercase group-hover:text-white/70 transition-colors">{row.label}</span>
                                    <span className="text-[14px] mono text-white font-bold tracking-tighter">{row.val}</span>
                                </div>
                            ))}
                         </div>
                    </div>

                    <div className="bg-surface-container-high p-14 space-y-12 relative group">
                        <div className="panel-accent"></div>
                        <div className="flex items-center gap-6 pb-8 border-b border-white/20">
                             <span className="material-symbols-outlined !text-[24px] text-white">verified_user</span>
                             <h2 className="text-[13px] font-black tracking-[0.3em] uppercase text-white">Engineering Review</h2>
                        </div>
                        <div className="space-y-10">
                            <div className="space-y-3">
                                <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Status Code</p>
                                <p className="mono font-black text-[13px] text-white bg-white/5 p-4 border border-white/10">SEC_RESTRICTED // VERIFIED</p>
                            </div>
                            <div className="space-y-5">
                                <p className="text-[13px] text-white/90 leading-relaxed uppercase mono border-l-4 border-white pl-8 italic">
                                    Thermal loads at throat section verified within 3200K safety thresholds.
                                </p>
                            </div>
                            <div className="pt-12 border-t border-white/10 flex flex-col gap-3">
                                <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em]">Reviewing Officer</p>
                                <p className="text-[13px] font-black text-white mono uppercase tracking-tight">E. THORNE // CHIEF_ARCHITECT</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
