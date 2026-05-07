import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'
import StatPanel from '../components/StatPanel'
import SliderControl from '../components/SliderControl'

// ── Station Blueprint Diagram ─────────────────────────────────────────────────

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
  const [error, setError] = useState(null)
  const [sensParams, setSensParams] = useState({
    sweep_type: 't4', alt: 10000, mach: 0.8, prc: 25, tit: 1600,
    sweep_min: 1000, sweep_max: 2200, steps: 30
  })
  const [sensData, setSensData] = useState(null)
  const [sensLoading, setSensLoading] = useState(false)
  const [sensError, setSensError] = useState(null)

  const runSensitivity = useCallback(async () => {
    setSensLoading(true)
    setSensData(null)
    setSensError(null)
    try {
      const data = await fetchData('/analyze/cycle/sensitivity', {
        method: 'POST',
        body: JSON.stringify(sensParams)
      })
      setSensData(data)
    } catch (e) {
      console.error('Sensitivity sweep error:', e)
      setSensError(e.message || 'Sensitivity solver failed.')
    }
    setSensLoading(false)
  }, [sensParams])

  useEffect(() => {
    if (activeEngine === 'sensitivity') {
      const t = setTimeout(runSensitivity, 700)
      return () => clearTimeout(t)
    }
  }, [sensParams, activeEngine, runSensitivity])

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const isTurbofan = activeEngine === 'turbofan' || activeEngine === 'mixed_flow'
      const endpoint = !isTurbofan ? '/analyze/cycle' : '/analyze/cycle/turbofan'
      const body = !isTurbofan ? p : { ...p, opr: p.prc, mixed_exhaust: activeEngine === 'mixed_flow' }
      const data = await fetchData(endpoint, { method: 'POST', body: JSON.stringify(body) })
      setResult(data)
    } catch (e) {
      console.error(e)
      setError('Solver kernel returned an error. Check backend connection and input parameters.')
    }
    setLoading(false)
  }, [p, activeEngine])

  // Clear results when switching engine type, then re-run
  useEffect(() => {
    if (activeEngine === 'sensitivity') return
    setResult(null)
    setError(null)
    const t = setTimeout(runAnalysis, 700)
    return () => clearTimeout(t)
  }, [p, activeEngine, runAnalysis])

  // Build station display rows — returns empty array cleanly when no result
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
        ],
        'turbofan': [
            { id: '00', ref: 'Freestream', k: 0 },
            { id: '02', ref: 'Fan Inlet', k: 2 },
            { id: '21', ref: 'Fan Bypass Exit', k: 21 },
            { id: '25', ref: 'LPC / Booster Exit', k: 25 },
            { id: '03', ref: 'HPC Exit', k: 3 },
            { id: '04', ref: 'Combustor Exit', k: 4 },
            { id: '45', ref: 'HPT Exit', k: 45 },
            { id: '05', ref: 'LPT Exit', k: 5 },
        ],
        'mixed_flow': [
            { id: '00', ref: 'Freestream', k: 0 },
            { id: '02', ref: 'Fan Inlet', k: 2 },
            { id: '21', ref: 'Fan / Bypass Exit', k: 21 },
            { id: '25', ref: 'LPC / Booster Exit', k: 25 },
            { id: '03', ref: 'HPC Exit', k: 3 },
            { id: '04', ref: 'Combustor Exit', k: 4 },
            { id: '45', ref: 'HPT Exit', k: 45 },
            { id: '05', ref: 'LPT / Mixer Inlet', k: 5 },
        ],
    }
    const set = mapping[activeEngine] || mapping['turbojet']
    return set.map(s => {
        const d = result.stations[s.k]
        if (!d) return { id: s.id, ref: s.ref, tt: null, pt: null, v: null, m: null }
        return {
            id: s.id,
            ref: s.ref,
            tt: d.tt,
            pt: d.pt,
            v: d.v ?? 0,
            m: d.m ?? 0
        }
    })
  }

  const stations = getStationData()
  const fmt = v => v != null ? v.toFixed(1) : '—'
  const fmtP = v => v != null ? v.toLocaleString() : '—'
  const fmtM = v => v != null ? v.toFixed(3) : '—'

  return (
    <div className="space-y-16 animate-in pb-20">
      {/* Platform Controls */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex gap-12 items-center">
            {['turbojet', 'turbofan', 'mixed_flow', 'sensitivity'].map(mode => (
                <button
                    key={mode} onClick={() => setActiveEngine(mode)}
                    className={`text-[12px] tracking-[0.3em] uppercase transition-all pb-3 ${activeEngine === mode ? 'text-white border-b border-white font-black' : 'text-white/30 font-bold hover:text-white'}`}
                >
                    {mode === 'sensitivity' ? '⚡ SENSITIVITY' : mode.replace('_', ' ').toUpperCase()}
                </button>
            ))}
        </div>
        <div className="status-badge">
          KERN_ID: {activeEngine.toUpperCase()} // {loading || sensLoading ? 'EXECUTING...' : error ? 'ERROR' : 'READY'}
        </div>
      </div>

      {/* ── Main Engine View ── */}
      {activeEngine !== 'sensitivity' && (
      <div className="grid grid-cols-12 gap-12">
        {/* Left Col: Params */}
        <section className="col-span-12 lg:col-span-3 space-y-4">
             <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                  <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">ENVIRONMENT</h2>
                  <SliderControl label="Flight Altitude" value={Math.round(p.alt)} min={0} max={15000} unit="m" step={100} onChange={v => setP({...p, alt: v})} />
                  <SliderControl label="Mach Number" value={p.mach.toFixed(2)} min={0} max={2.5} unit="M" step={0.01} onChange={v => setP({...p, mach: v})} />
             </div>

             <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                  <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">CYCLE_SPEC</h2>
                  <SliderControl label="Core PR" value={Math.round(p.prc)} min={2} max={60} unit="" step={1} onChange={v => setP({...p, prc: v})} />
                  <SliderControl label="Turbine Inlet T" value={Math.round(p.tit)} min={1000} max={2500} unit="K" step={10} onChange={v => setP({...p, tit: v})} />
             </div>

             {(activeEngine === 'turbofan' || activeEngine === 'mixed_flow') && (
               <div className="bg-surface-container-low border border-white/10 p-12 space-y-4 animate-in">
                    <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">TURBOFAN_SPEC</h2>
                    <SliderControl label="Bypass Ratio" value={p.bpr.toFixed(1)} min={0.5} max={15.0} unit="" step={0.1} onChange={v => setP({...p, bpr: v})} />
                    <SliderControl label="Fan Pressure Ratio" value={p.fpr.toFixed(2)} min={1.1} max={3.0} unit="" step={0.05} onChange={v => setP({...p, fpr: v})} />
               </div>
             )}

             <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white">AUGMENTATION</h2>
                    <input
                        type="checkbox" checked={p.ab_enabled}
                        onChange={e => setP({...p, ab_enabled: e.target.checked})}
                        className="w-5 h-5 accent-white cursor-pointer"
                    />
                  </div>
                  <SliderControl
                       label="Afterburner T" value={Math.round(p.ab_temp)} min={1000} max={2500} unit="K" step={10}
                       disabled={!p.ab_enabled} onChange={v => setP({...p, ab_temp: v})}
                  />
             </div>

             <button
                onClick={runAnalysis}
                disabled={loading}
                className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4 disabled:opacity-60"
            >
                <span className="material-symbols-outlined !text-[20px]">{loading ? 'sync' : 'rebase_edit'}</span>
                {loading ? 'COMPUTING...' : 'SOLVE_GAS_TURBINE_CYCLE'}
            </button>
        </section>

        {/* Right: Visualization */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
            <div className="h-[600px] bg-surface-container-lowest border border-white/10 relative overflow-hidden group">
                <div className="panel-accent"></div>

                {/* Overlay Performance Panel */}
                <div className="absolute top-12 left-12 right-12 flex justify-between items-start z-30">
                    <div className="space-y-3">
                        <h2 className="text-[14px] font-black tracking-[0.3em] text-white">STATION_THERMO_BLUEPRINT</h2>
                        <p className="mono text-[11px] text-white/30 uppercase tracking-widest underline decoration-white/20">
                          SYSTEM_ID: {activeEngine.toUpperCase()}_EXPLORER
                        </p>
                    </div>
                    <div className="flex gap-16">
                        <StatPanel
                          label="SPECIFIC THRUST"
                          value={result ? (result.spec_thrust ?? 0).toFixed(1) : '—'}
                          unit="Ns/kg"
                          sub="NET_AIR_FORCE"
                        />
                        <StatPanel
                          label="THERMAL EFF."
                          value={result?.eta_thermal != null ? (result.eta_thermal * 100).toFixed(1) : '—'}
                          unit="%"
                          sub="CYCLE_TOTAL"
                        />
                        <StatPanel
                          label="SFC"
                          value={result?.tsfc != null ? (result.tsfc * 1e6).toFixed(2) : '—'}
                          unit="mg/Ns"
                          sub="FUEL_EFFICIENCY"
                        />
                    </div>
                </div>

                {/* Loading overlay */}
                {loading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                        <div className="text-white/30 uppercase tracking-[0.5em] text-[13px] font-black animate-pulse">
                            EXECUTING_CYCLE_SOLVER...
                        </div>
                    </div>
                )}

                {/* Error state */}
                {error && !loading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="border border-red-500/30 bg-red-950/20 px-16 py-10 text-center space-y-4 max-w-md">
                            <span className="material-symbols-outlined text-red-400 !text-[28px]">error_outline</span>
                            <p className="mono text-[11px] text-red-400 uppercase tracking-widest leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

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
                                    title: { text: 'P [Pa]', font: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.3)' } },
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

            {/* Station Table + Solver Log */}
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
                                    <th className="px-10 py-5">Station // Ref</th>
                                    <th className="px-10 py-5 border-l border-white/10 text-white/70">T_Tot [K]</th>
                                    <th className="px-10 py-5 border-l border-white/10 text-white/70">P_Tot [Pa]</th>
                                    <th className="px-10 py-5 border-l border-white/10 text-white">Mach</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {stations.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-10 py-8 text-center text-white/20 mono text-[11px] uppercase tracking-widest">
                                            {loading ? 'Computing station properties...' : 'Run solver to populate station data'}
                                        </td>
                                    </tr>
                                ) : stations.map((s, i) => (
                                    <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-10 py-5 font-black text-white border-l-[3px] border-transparent group-hover:border-white">
                                          {s.id} // {s.ref}
                                        </td>
                                        <td className="px-10 py-5 border-l border-white/10 text-white/50 group-hover:text-white/90">{fmt(s.tt)}</td>
                                        <td className="px-10 py-5 border-l border-white/10 text-white/50 group-hover:text-white/90">{fmtP(s.pt)}</td>
                                        <td className="px-10 py-5 border-l border-white/10 text-white font-black">{fmtM(s.m)}</td>
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
                            {result?.math_trace?.length > 0
                                ? result.math_trace.map((t, i) => <p key={i}>{t}</p>)
                                : <p className="text-white/10 italic">Log empty — run solver to populate.</p>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </section>
      </div>
      )}

      {/* ── Sensitivity Mode ── */}
      {activeEngine === 'sensitivity' && (
        <div className="grid grid-cols-12 gap-12 animate-in">
          <section className="col-span-12 lg:col-span-3 space-y-4">
            <div className="bg-surface-container-low border border-white/10 p-12 space-y-8">
              <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">SWEEP_CONFIG</h2>
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Sweep Parameter</label>
                <div className="flex flex-col gap-2">
                  {[['t4', 'TIT — Turbine Inlet Temp'], ['alt', 'Altitude'], ['opr', 'Overall Pressure Ratio']].map(([val, lab]) => (
                    <button
                      key={val}
                      onClick={() => setSensParams(s => ({...s, sweep_type: val,
                        sweep_min: val==='t4' ? 800 : val==='alt' ? 0 : 5,
                        sweep_max: val==='t4' ? 2200 : val==='alt' ? 15000 : 60
                      }))}
                      className={`text-left py-4 px-8 border text-[11px] mono tracking-widest uppercase transition-all ${
                        sensParams.sweep_type === val
                          ? 'border-white bg-white/10 text-white font-black'
                          : 'border-white/10 text-white/40 hover:border-white/30'
                      }`}
                    >{lab}</button>
                  ))}
                </div>
              </div>
              <SliderControl label="Fixed: Alt" value={Math.round(sensParams.alt)} min={0} max={15000} unit="m" step={500} onChange={v => setSensParams(s => ({...s, alt: v}))} />
              <SliderControl label="Fixed: Mach" value={sensParams.mach.toFixed(2)} min={0} max={2.5} unit="M" step={0.01} onChange={v => setSensParams(s => ({...s, mach: v}))} />
              <SliderControl label="Fixed: OPR" value={Math.round(sensParams.prc)} min={2} max={60} step={1} onChange={v => setSensParams(s => ({...s, prc: v}))} />
              <SliderControl label="Fixed: TIT" value={Math.round(sensParams.tit)} min={1000} max={2500} unit="K" step={10} onChange={v => setSensParams(s => ({...s, tit: v}))} />
            </div>
            <button
              onClick={runSensitivity}
              disabled={sensLoading}
              className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4 disabled:opacity-60"
            >
              <span className="material-symbols-outlined !text-[20px]">{sensLoading ? 'sync' : 'stacked_line_chart'}</span>
              {sensLoading ? 'COMPUTING...' : 'RUN_SWEEP'}
            </button>
          </section>

          <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
            <div className="h-[650px] bg-surface-container-lowest border border-white/10 relative overflow-hidden group">
              <div className="panel-accent"></div>
              <div className="absolute top-12 left-12 z-20 space-y-3 pointer-events-none">
                <h2 className="text-[14px] font-black tracking-[0.3em] text-white">PARAMETRIC_SENSITIVITY_CURVE</h2>
                <p className="mono text-[11px] text-white/30 uppercase tracking-widest">
                  {sensData ? `SWEEP: ${sensData.sweep_label} // POINTS: ${sensData.data?.length}` : 'Awaiting Sweep Execution...'}
                </p>
              </div>
              <div className="w-full h-full pt-16">
                {sensLoading && (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-white/20 uppercase tracking-[0.5em] text-[13px] font-black animate-pulse">
                            Computing_Sensitivity_Sweep...
                        </div>
                    </div>
                )}
                {!sensLoading && sensData && sensData.data?.length > 0 && (
                  <Plot
                    data={[
                      {
                        x: sensData.data.map(d => d.sweep_value),
                        y: sensData.data.map(d => d.spec_thrust),
                        name: 'SPEC_THRUST',
                        type: 'scatter', mode: 'lines+markers',
                        line: { color: '#ffffff', width: 2 },
                        marker: { size: 6, color: '#fff' },
                        yaxis: 'y1',
                        hovertemplate: `${sensData.sweep_label}: %{x}<br>Spec Thrust: %{y:.2f} Ns/kg<extra></extra>`
                      },
                      {
                        x: sensData.data.map(d => d.sweep_value),
                        y: sensData.data.map(d => d.tsfc * 1e6),
                        name: 'TSFC [mg/Ns]',
                        type: 'scatter', mode: 'lines+markers',
                        line: { color: 'rgba(255,255,255,0.35)', width: 2, dash: 'dot' },
                        marker: { size: 5, color: 'rgba(255,255,255,0.4)' },
                        yaxis: 'y2',
                        hovertemplate: `${sensData.sweep_label}: %{x}<br>TSFC: %{y:.3f} mg/Ns<extra></extra>`
                      },
                      {
                        x: sensData.data.map(d => d.sweep_value),
                        y: sensData.data.map(d => d.eta_thermal * 100),
                        name: 'η_THERMAL [%]',
                        type: 'scatter', mode: 'lines',
                        line: { color: 'rgba(255,255,255,0.15)', width: 1.5, dash: 'longdash' },
                        yaxis: 'y1',
                        hovertemplate: `${sensData.sweep_label}: %{x}<br>η_th: %{y:.1f}%<extra></extra>`
                      }
                    ]}
                    layout={{
                      plot_bgcolor: 'transparent',
                      paper_bgcolor: 'transparent',
                      autosize: true,
                      margin: { t: 60, b: 60, l: 70, r: 70 },
                      showlegend: true,
                      legend: { font: { family: 'JetBrains Mono', size: 10, color: 'white' }, x: 0.02, y: 0.98, bgcolor: 'rgba(0,0,0,0.3)' },
                      xaxis: {
                        title: { text: sensData.sweep_label, font: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.4)' } },
                        gridcolor: 'rgba(255,255,255,0.04)',
                        tickfont: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.3)' },
                      },
                      yaxis: {
                        title: { text: 'Spec Thrust / η_th [Ns/kg | %]', font: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.4)' } },
                        gridcolor: 'rgba(255,255,255,0.04)',
                        tickfont: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.3)' },
                        side: 'left'
                      },
                      yaxis2: {
                        title: { text: 'TSFC [mg/Ns]', font: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.2)' } },
                        overlaying: 'y', side: 'right',
                        tickfont: { family: 'JetBrains Mono', size: 10, color: 'rgba(255,255,255,0.2)' },
                        showgrid: false
                      },
                      font: { family: 'Inter', color: '#fff' }
                    }}
                    className="w-full h-full"
                    config={{ displayModeBar: false, responsive: true }}
                  />
                )}
                {!sensLoading && (!sensData || sensData.data?.length === 0) && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-white/10 uppercase tracking-[0.5em] text-[14px] font-black">
                      Select_Parameters_And_Run_Sweep
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
