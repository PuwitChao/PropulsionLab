import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'

// ── Components ───────────────────────────────────────────────────────────────

function StationDiagram() {
  return (
    <div className="relative w-full h-full flex items-center justify-center p-20 pt-32">
       <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2"></div>
      <svg className="w-full h-full relative z-10" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 400">
        <defs>
            <linearGradient id="blueprintGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor:'rgba(255,255,255,0.08)', stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'rgba(255,255,255,0)', stopOpacity:1}} />
            </linearGradient>
        </defs>

        {/* Technical Grid Overlay (Partial) */}
        <g opacity="0.15">
            <line x1="200" y1="0" x2="200" y2="400" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="400" y1="0" x2="400" y2="400" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="520" y1="0" x2="520" y2="400" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="720" y1="0" x2="720" y2="400" stroke="white" strokeWidth="0.5" strokeDasharray="4 4" />
        </g>
        
        {/* Inlet */}
        <path d="M 50 160 L 200 150 L 200 250 L 50 240 Z" fill="url(#blueprintGrad)" stroke="white" strokeWidth="1" />
        <text className="mono text-[12px] uppercase tracking-widest font-bold" fill="white" fillOpacity="0.5" x="50" y="280">S_00</text>
        
        {/* Compressor */}
        <path d="M 200 150 L 400 175 L 400 225 L 200 250 Z" fill="rgba(255,255,255,0.1)" stroke="white" strokeWidth="1.5" />
        <text className="mono text-[12px] tracking-[0.3em] font-black" fill="white" textAnchor="middle" x="300" y="130">COMP_AXIAL</text>
        <rect x="300" y="145" width="1" height="110" fill="white" opacity="0.2" />
        
        {/* Combustor */}
        <rect x="400" y="175" width="120" height="50" fill="rgba(255,255,255,0.15)" stroke="white" strokeWidth="1" />
        <text className="mono text-[12px] tracking-[0.3em] font-black" fill="white" textAnchor="middle" x="460" y="130">BURN_PRI</text>
        <circle cx="460" cy="200" r="15" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
        
        {/* Turbine */}
        <path d="M 520 175 L 720 150 L 720 250 L 520 225 Z" fill="rgba(255,255,255,0.1)" stroke="white" strokeWidth="1.5" />
        <text className="mono text-[12px] tracking-[0.3em] font-black" fill="white" textAnchor="middle" x="620" y="130">TURB_CORE</text>
        
        {/* Nozzle */}
        <path d="M 720 150 L 950 185 L 950 215 L 720 250 Z" fill="url(#blueprintGrad)" stroke="white" strokeWidth="1" />
        <text className="mono text-[12px] tracking-[0.3em] font-black" fill="white" textAnchor="middle" x="835" y="130">NOZ_EXIT</text>
        <text className="mono text-[12px] uppercase tracking-widest font-bold" fill="white" fillOpacity="0.5" x="950" y="280" textAnchor="end">S_09</text>
      </svg>
    </div>
  )
}

function StatPanel({ label, value, unit, sub }) {
    return (
        <div className="flex flex-col items-end group">
            <span className="text-[11px] font-black tracking-[0.2em] text-white/40 uppercase mb-3 font-headline group-hover:text-white transition-colors">{label}</span>
            <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black mono text-white">{value}</span>
                <span className="text-[12px] mono text-white/30 uppercase font-bold tracking-[0.1em]">{unit}</span>
            </div>
            {sub && <span className="text-[10px] mono text-white/20 uppercase tracking-[0.1em] mt-2 italic">{sub}</span>}
        </div>
    )
}

function SliderControl({ label, value, unit, min, max, onChange, disabled }) {
    return (
        <div className={`flex flex-col gap-6 p-8 border border-white/10 bg-surface-container-low transition-all ${disabled ? 'opacity-10 opacity-20 filter grayscale pointer-events-none' : 'hover:border-white/20'}`}>
            <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-black tracking-[0.2em] text-white/40 uppercase">{label}</span>
                <span className="text-[12px] font-mono font-bold text-white uppercase tracking-widest">{value} {unit}</span>
            </div>
            <input 
                type="range" min={min} max={max} step={(max-min)/100}
                value={value} onChange={e => onChange(parseFloat(e.target.value))}
            />
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ParametricCycle() {
  const [activeEngine, setActiveEngine] = useState('turbojet')
  const [p, setP] = useState({
    alt: 10000, mach: 0.8, prc: 25, tit: 1650,
    bpr: 6.0, fpr: 1.6,
    eta_c: 0.88, eta_t: 0.92, burner_dp_frac: 0.04,
    inlet_recovery: 0.98, phi_inlet: 0.0, eta_install_nozzle: 1.0,
    ab_enabled: false, ab_temp: 2000
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setResult(null)
    try {
      const isTurbofan = activeEngine === 'turbofan' || activeEngine === 'mixed_flow'
      const endpoint = !isTurbofan ? '/analyze/cycle' : '/analyze/cycle/turbofan'
      
      const body = !isTurbofan ? p : { ...p, opr: p.prc, mixed_exhaust: activeEngine === 'mixed_flow' }
      const data = await fetchData(endpoint, { method: 'POST', body: JSON.stringify(body) })
      setResult(data)
    } catch (e) { 
      console.error(e)
      setResult(null)
    }
    setLoading(false)
  }, [p, activeEngine])

  useEffect(() => {
    setResult(null); // Clear stale data when switching engine types
    const t = setTimeout(runAnalysis, 300)
    return () => clearTimeout(t)
  }, [p, activeEngine, runAnalysis])

  const getStationData = () => {
    if (!result || !result.stations) return []
    const mapping = {
        'turbojet': [
            { id: '00', ref: 'Freestream', k: 0 },
            { id: '02', ref: 'Inlet Exit', k: 2 },
            { id: '03', ref: 'Compressor Exit', k: 3 },
            { id: '04', ref: 'Combustor Exit', k: 4 },
            { id: '05', ref: 'Turbine Exit', k: 5 },
            { id: '07', ref: 'Augmentor Exit', k: 7 },
            { id: '09', ref: 'Nozzle Exit', k: 9 },
        ],
        'turbofan': [
            { id: '00', ref: 'Freestream', k: 0 },
            { id: '02', ref: 'Fan Inlet', k: 2 },
            { id: '21', ref: 'Fan Bypass', k: 21 },
            { id: '03', ref: 'HPC Exit', k: 3 },
            { id: '04', ref: 'Combustor Exit', k: 4 },
            { id: '05', ref: 'LPT Exit', k: 5 },
            { id: '07', ref: 'Augmentor Exit', k: 7 },
            { id: '09', ref: 'Nozzle Exit', k: 9 },
        ]
    }
    const set = mapping[activeEngine] || mapping['turbojet']
    return set.map(s => {
        const d = result.stations[s.k]
        return {
            id: s.id,
            ref: s.ref,
            tt: d?.tt,
            pt: d?.pt,
            v: d?.v || 0,
            m: d?.m || 0
        }
    })
  }

  const stations = getStationData()

  return (
    <div className="space-y-16 animate-in pb-20">
      {/* Platform Controls */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex gap-12 items-center">
            {['turbojet', 'turbofan', 'mixed_flow'].map(mode => (
                <button 
                    key={mode} onClick={() => setActiveEngine(mode)}
                    className={`text-[12px] tracking-[0.3em] uppercase transition-all pb-3 ${activeEngine === mode ? 'text-white border-b border-white font-black' : 'text-white/30 font-bold hover:text-white'}`}
                >
                    {mode.replace('_', ' ').toUpperCase()}
                </button>
            ))}
        </div>
        <div className="status-badge">KERN_ID: {activeEngine.toUpperCase()} // {loading ? 'EXECUTING' : 'READY'}</div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        {/* Left Col: Params */}
        <section className="col-span-12 lg:col-span-3 space-y-12">
             <div className="bg-surface-container-low border border-white/10 p-12 space-y-12">
                  <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-6">ENVIRONMENT</h2>
                  <div className="space-y-12">
                       <SliderControl label="Flight Altitude" value={p.alt} min={0} max={15000} unit="m" onChange={v => setP({...p, alt: v})} />
                       <SliderControl label="Mach Number" value={p.mach.toFixed(2)} min={0} max={2.5} unit="M" onChange={v => setP({...p, mach: v})} />
                  </div>
             </div>

             <div className="bg-surface-container-low border border-white/10 p-12 space-y-12">
                  <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-6">CYCLE_SPEC</h2>
                  <div className="space-y-12">
                       <SliderControl label="Core PR" value={p.prc} min={2} max={60} unit="" onChange={v => setP({...p, prc: v})} />
                       <SliderControl label="Turbine Inlet T" value={p.tit} min={1000} max={2500} unit="K" onChange={v => setP({...p, tit: v})} />
                  </div>
             </div>

             {(activeEngine === 'turbofan' || activeEngine === 'mixed_flow') && (
               <div className="bg-surface-container-low border border-white/10 p-12 space-y-12 animate-in slide-in-from-left-4">
                    <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-6">TURBOFAN_SPEC</h2>
                    <div className="space-y-12">
                         <SliderControl label="Bypass Ratio" value={p.bpr} min={0.5} max={15.0} unit="" onChange={v => setP({...p, bpr: v})} />
                         <SliderControl label="Fan Pressure Ratio" value={p.fpr} min={1.1} max={3.0} unit="" onChange={v => setP({...p, fpr: v})} />
                    </div>
               </div>
             )}

             <div className="bg-surface-container-low border border-white/10 p-12 space-y-12">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white">AUGMENTATION</h2>
                    <input 
                        type="checkbox" checked={p.ab_enabled} 
                        onChange={e => setP({...p, ab_enabled: e.target.checked})}
                        className="w-5 h-5 accent-white cursor-pointer"
                    />
                  </div>
                  <div className="space-y-12">
                       <SliderControl 
                            label="Afterburner T" value={p.ab_temp} min={1000} max={2500} unit="K" 
                            disabled={!p.ab_enabled} onChange={v => setP({...p, ab_temp: v})} 
                       />
                  </div>
             </div>

             <button 
                onClick={runAnalysis}
                className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4"
            >
                <span className="material-symbols-outlined !text-[20px]">rebase_edit</span>
                SOLVE_GAS_TURBINE_CYCLE
            </button>
        </section>

        {/* Middle: Visualization */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
            <div className="h-[600px] bg-surface-container-lowest border border-white/10 relative overflow-hidden group">
                <div className="panel-accent"></div>
                
                {/* Overlay Performance Panel */}
                <div className="absolute top-12 left-12 right-12 flex justify-between items-start z-30">
                    <div className="space-y-3">
                        <h2 className="text-[14px] font-black tracking-[0.3em] text-white">STATION_THERMO_BLUEPRINT</h2>
                        <p className="mono text-[11px] text-white/30 uppercase tracking-widest underline decoration-white/20">SYSTEM_ID: {activeEngine.toUpperCase()}_EXPLORER</p>
                    </div>
                    <div className="flex gap-16">
                        <StatPanel label="SPECIFIC THRUST" value={(result?.spec_thrust_installed || result?.spec_thrust)?.toFixed(1) || '0.0'} unit="Ns/kg" sub="NET_INSTALLED" />
                        <StatPanel label="THERMAL EFFICIENCY" value={(result?.eta_thermal * 100)?.toFixed(1) || '0.0'} unit="%" sub="CYCLE_TOTAL" />
                        <StatPanel label="SFC" value={(result?.tsfc * 1e6)?.toFixed(2) || '0.00'} unit="mg/Ns" sub="SPECIFIC_FUEL_CONS" />
                    </div>
                </div>

                <div className="absolute bottom-12 left-12 right-12 h-[200px] z-20">
                    {result && (
                        <Plot 
                            data={[
                                {
                                    x: stations.map(s => s.id),
                                    y: stations.map(s => s.tt),
                                    name: 'TEMP_TOT',
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    line: { color: 'rgba(255,255,255,0.8)', width: 2 },
                                    marker: { size: 8, color: '#fff' },
                                    yaxis: 'y1'
                                },
                                {
                                    x: stations.map(s => s.id),
                                    y: stations.map(s => s.pt),
                                    name: 'PRES_TOT',
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    line: { color: 'rgba(255,255,255,0.3)', width: 2, dash: 'dot' },
                                    marker: { size: 6, color: 'rgba(255,255,255,0.4)' },
                                    yaxis: 'y2'
                                }
                            ]}
                            layout={{
                                plot_bgcolor: 'transparent',
                                paper_bgcolor: 'transparent',
                                autosize: true,
                                margin: { t: 0, b: 40, l: 60, r: 60 },
                                showlegend: false,
                                xaxis: { 
                                    gridcolor: 'rgba(255,255,255,0.05)',
                                    tickfont: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.3)' },
                                    showline: false
                                },
                                yaxis: { 
                                    title: { text: 'T [K]', font: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.3)' } },
                                    gridcolor: 'rgba(255,255,255,0.05)',
                                    tickfont: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.3)' },
                                    side: 'left'
                                },
                                yaxis2: { 
                                    title: { text: 'P [PA]', font: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.3)' } },
                                    overlaying: 'y',
                                    side: 'right',
                                    tickfont: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.1)' },
                                    showgrid: false
                                }
                            }}
                            className="w-full h-full"
                            config={{ displayModeBar: false, responsive: true }}
                        />
                    )}
                </div>

                <StationDiagram />
            </div>

            <div className="grid grid-cols-12 gap-12">
                <div className="col-span-12 lg:col-span-8 flex flex-col space-y-8">
                    <div className="flex items-center justify-between border-b border-white/10 pb-6">
                        <div className="flex items-center gap-6">
                            <span className="material-symbols-outlined !text-[22px] text-white/40">layers</span>
                            <h3 className="text-[13px] font-black tracking-[0.3em]">STATION_PROPERTY_MATRIX</h3>
                        </div>
                    </div>
                    <div className="bg-surface-container-low border border-white/10 overflow-hidden">
                        <table className="w-full text-left mono text-[12px]">
                            <thead>
                                <tr className="bg-white/5 text-white/40 font-bold tracking-[0.1em] border-b border-white/10 uppercase">
                                    <th className="px-10 py-5">Ref</th>
                                    <th className="px-10 py-5 border-l border-white/10 text-white/70">T_Tot [K]</th>
                                    <th className="px-10 py-5 border-l border-white/10 text-white/70">P_Tot [Pa]</th>
                                    <th className="px-10 py-5 border-l border-white/10 text-white">Mach</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {stations.map((s, i) => (
                                    <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-10 py-5 font-black text-white border-l-[3px] border-transparent group-hover:border-white">{s.id} // {s.ref}</td>
                                        <td className="px-10 py-5 border-l border-white/10 text-white/50 group-hover:text-white/90">{s.tt?.toFixed(1)}</td>
                                        <td className="px-10 py-5 border-l border-white/10 text-white/50 group-hover:text-white/90">{s.pt?.toLocaleString()}</td>
                                        <td className="px-10 py-5 border-l border-white/10 text-white font-black">{s.m?.toFixed(3)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <div className="flex items-center gap-6 border-b border-white/10 pb-6">
                        <span className="material-symbols-outlined !text-[22px] text-white/40">history_edu</span>
                        <h3 className="text-[13px] font-black tracking-[0.3em]">SOLVER_LOG</h3>
                    </div>
                    <div className="bg-surface-container-lowest border border-white/10 p-10 h-[300px] overflow-auto scrollbar-hide">
                        <div className="space-y-4 mono text-[11px] text-white/40 uppercase tracking-[0.1em] leading-relaxed">
                            {result?.math_trace?.map((t, i) => <p key={i}>{t}</p>)}
                        </div>
                    </div>
                </div>
            </div>
        </section>
      </div>
    </div>
  )
}
