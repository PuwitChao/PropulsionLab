import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData, fetchBlob } from '../api'
import StatPanel from '../components/StatPanel'
import SliderControl from '../components/SliderControl'
import HelpTooltip from '../components/HelpTooltip'
import { getLayout } from '../utils/chartUtils'
import { useSettings } from '../context/SettingsContext'
import usePersistentState from '../hooks/usePersistentState'

// ── MoC Nozzle Visualization ──────────────────────────────────────────────────

function MocVisualization({ mocData, loading }) {
  const [viewMode, setViewMode] = useState('2D')
  const traces = []

  const hasData = mocData && Array.isArray(mocData.x) && Array.isArray(mocData.y) && mocData.x.length > 0

  if (hasData && viewMode === '2D') {
    traces.push({
      x: mocData.x, y: mocData.y,
      name: 'NOZZLE_WALL', type: 'scatter', mode: 'lines',
      line: { color: '#fff', width: 3 },
      hovertemplate: 'WALL_NODE<br>X: %{x:.4f}m<br>R: %{y:.4f}m<extra></extra>'
    })
    traces.push({
      x: mocData.x, y: mocData.y.map(v => -v),
      name: 'WALL_LOWER', type: 'scatter', mode: 'lines',
      line: { color: 'rgba(255,255,255,0.2)', width: 1, dash: 'dash' },
      showlegend: false, hoverinfo: 'skip'
    })
    if (Array.isArray(mocData.mesh)) {
      mocData.mesh.forEach((wave, i) => {
        if (wave && Array.isArray(wave.x) && Array.isArray(wave.y)) {
          traces.push({
            x: wave.x, y: wave.y,
            name: i === 0 ? 'WAVE_REFLECTIONS' : '',
            legendgroup: 'waves', showlegend: i === 0,
            type: 'scatter', mode: 'lines',
            line: { color: wave.type === 'C+' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)', width: 0.8 },
            hovertemplate: `${wave.type}_WAVE<br>MACH: ${wave.mach || 'N/A'}<extra></extra>`
          })
          traces.push({
            x: wave.x, y: wave.y.map(v => -v),
            legendgroup: 'waves', showlegend: false,
            type: 'scatter', mode: 'lines',
            line: { color: 'rgba(255,255,255,0.05)', width: 0.5 },
            hoverinfo: 'skip'
          })
        }
      })
    }
    traces.push({
      x: [0, (mocData.x[mocData.x.length - 1] || 0) * 1.1], y: [0, 0],
      name: 'CENTER_LINE', mode: 'lines',
      line: { color: 'rgba(255,255,255,0.05)', width: 1, dash: 'dot' },
      hoverinfo: 'skip'
    })
  } else if (hasData && viewMode === '3D') {
    const nThetas = 40
    const thetas = Array.from({length: nThetas}, (_, i) => (i * 2 * Math.PI) / (nThetas - 1))
    const xMesh = [], yMesh = [], zMesh = []
    mocData.x.forEach((x, i) => {
      const r = mocData.y[i]
      const xRow = [], yRow = [], zRow = []
      thetas.forEach(theta => { xRow.push(x); yRow.push(r * Math.cos(theta)); zRow.push(r * Math.sin(theta)) })
      xMesh.push(xRow); yMesh.push(yRow); zMesh.push(zRow)
    })
    traces.push({
      type: 'surface', x: xMesh, y: yMesh, z: zMesh,
      colorscale: [[0, 'rgba(255,255,255,0.1)'], [1, 'rgba(255,255,255,0.5)']],
      showscale: false,
      lighting: { ambient: 0.4, diffuse: 0.8, fresnel: 0.2, specular: 0.6, roughness: 0.1 },
      lightposition: { x: 100, y: 100, z: 1000 },
      contours: { x: { show: true, color: 'rgba(255,255,255,0.2)', width: 1 }, y: { show: false }, z: { show: false } }
    })
  }

  return (
    <div className="flex-1 bg-surface-container-lowest border border-white/10 relative overflow-hidden flex flex-col group min-h-[550px]">
      <div className="panel-accent"></div>

      <div className="absolute top-12 left-12 z-20 space-y-3 pointer-events-none">
        <h2 className="text-[14px] font-black tracking-[0.3em] text-white">
          {viewMode === '2D' ? 'NOZZLE_EXPANSION_MESH' : 'NOZZLE_SPATIAL_TOPOLOGY'}
        </h2>
        <p className="mono text-[11px] text-white/30 uppercase underline tracking-widest">
          {hasData ? `NODE_COUNT: ${mocData.x?.length || 0} // VIEW: ${viewMode}_RENDER` : 'Awaiting Design Initialization...'}
        </p>
      </div>

      <div className="flex-1 w-full bg-black/20 relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <div className="text-white/30 uppercase tracking-[0.5em] text-[12px] font-black animate-pulse">
              Computing_MoC_Contour...
            </div>
          </div>
        )}
        {hasData ? (
          <Plot
            data={traces}
            layout={{
              plot_bgcolor: 'transparent', paper_bgcolor: 'transparent',
              autosize: true, margin: { t: 40, b: 60, l: 60, r: 60 },
              scene: viewMode === '3D' ? {
                xaxis: { title: 'X [m]', gridcolor: 'rgba(255,255,255,0.05)', backgroundcolor: 'transparent', showbackground: false, tickfont: { family: 'JetBrains Mono', color: 'rgba(255,255,255,0.3)' } },
                yaxis: { title: 'Y [m]', gridcolor: 'rgba(255,255,255,0.05)', backgroundcolor: 'transparent', showbackground: false, tickfont: { family: 'JetBrains Mono', color: 'rgba(255,255,255,0.3)' } },
                zaxis: { title: 'Z [m]', gridcolor: 'rgba(255,255,255,0.05)', backgroundcolor: 'transparent', showbackground: false, tickfont: { family: 'JetBrains Mono', color: 'rgba(255,255,255,0.3)' } },
                aspectmode: 'data'
              } : undefined,
              xaxis: viewMode === '2D' ? {
                gridcolor: 'rgba(255,255,255,0.03)', tickfont: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.3)' },
                showline: true, linecolor: 'rgba(255,255,255,0.1)', zeroline: false, scaleanchor: 'y'
              } : undefined,
              yaxis: viewMode === '2D' ? {
                gridcolor: 'rgba(255,255,255,0.03)', tickfont: { family: 'JetBrains Mono', size: 11, color: 'rgba(255,255,255,0.3)' },
                showline: true, linecolor: 'rgba(255,255,255,0.1)', zeroline: false
              } : undefined,
              showlegend: viewMode === '2D',
              legend: { font: { family: 'JetBrains Mono', size: 10, color: 'white' }, y: 0.95, x: 0.95, xanchor: 'right' },
              hovermode: 'closest', font: { family: 'Inter', color: '#fff' }
            }}
            className="w-full h-full"
            config={{ displayModeBar: false, responsive: true }}
          />
        ) : !loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white/10 uppercase tracking-[0.5em] text-[14px] font-black animate-pulse">
              Design_Record_Pending
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-12 border-t border-white/10 flex items-center justify-between bg-black/40 relative z-20">
        <div className="flex gap-x-16 text-[12px] mono text-white/40 uppercase tracking-[0.2em]">
          <span className="flex items-center gap-4">
            <div className="w-2 h-2 bg-white opacity-40"></div>
            X_DOMAIN: 0.00 {"->"} {(mocData?.x?.[mocData.x?.length-1] || 0.0).toFixed(3)} M
          </span>
          <span className="flex items-center gap-4">
            <div className="w-2 h-2 bg-white opacity-40"></div>
            R_EXIT: {(mocData?.y?.[mocData.y?.length-1] || 0.0).toFixed(3)} M
          </span>
        </div>
        <div className="flex gap-6">
          <button
            onClick={() => setViewMode('2D')} title="2D MESH VIEW"
            className={`w-14 h-14 border border-white/10 flex items-center justify-center transition-all ${viewMode === '2D' ? 'bg-white text-black' : 'text-white/60 hover:bg-white/5'}`}
          >
            <span className="material-symbols-outlined !text-[20px]">grid_4x4</span>
          </button>
          <button
            onClick={() => setViewMode('3D')} title="3D SPATIAL VIEW"
            className={`w-14 h-14 border border-white/10 flex items-center justify-center transition-all ${viewMode === '3D' ? 'bg-white text-black' : 'text-white/60 hover:bg-white/5'}`}
          >
            <span className="material-symbols-outlined !text-[20px]">3d_rotation</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RocketAnalysis() {
    const { theme } = useSettings()
    const [activeView, setActiveView] = useState('design') // 'design' | 'of_sweep' | 'altitude'
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)
    const [params, setParams] = usePersistentState('rocket_params', {
        pc: 7.5e6, of_ratio: 6.0, pe: 101325.0,
        propellant: 'H2/O2', mode: 'shifting',
        thrust_target_N: 500000
    })
    const exportScenario = () => {
        const blob = new Blob([JSON.stringify({ params }, null, 2)], { type: 'application/json' })
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = 'rocket_scenario.json'; a.click()
    }
    const importScenario = (e) => {
        const file = e.target.files?.[0]; if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => { try { const d = JSON.parse(evt.target.result); if (d.params) setParams(prev => ({ ...prev, ...d.params })) } catch { /* invalid JSON */ } }
        reader.readAsText(file); e.target.value = ''
    }
    const [mocData, setMocData] = useState(null)
    const [exportLoading, setExportLoading] = useState(null) // 'csv' | 'stl' | null
    const [toast, setToast] = useState(null)
    const [sweepData, setSweepData] = useState(null)
    const [sweepLoading, setSweepLoading] = useState(false)
    const [altData, setAltData] = useState(null)
    const [altLoading, setAltLoading] = useState(false)

    const showToast = (msg, ok = true) => {
        setToast({ msg, ok })
        setTimeout(() => setToast(null), 4000)
    }

    const runOFSweep = useCallback(async () => {
        setSweepLoading(true)
        setSweepData(null)
        try {
            const data = await fetchData('/analyze/rocket/sweep', {
                method: 'POST',
                body: JSON.stringify(params)
            })
            setSweepData(data)
        } catch (e) {
            console.error('OF sweep error:', e)
        }
        setSweepLoading(false)
    }, [params])

    const runAltitudeTable = useCallback(async () => {
        setAltLoading(true)
        setAltData(null)
        try {
            const data = await fetchData('/analyze/rocket/altitude', {
                method: 'POST',
                body: JSON.stringify({
                    pc: params.pc,
                    of_ratio: params.of_ratio,
                    propellant: params.propellant,
                    mode: params.mode,
                    alt_max_km: 100.0,
                    n_points: 20,
                })
            })
            setAltData(data)
        } catch (e) {
            console.error('Altitude table error:', e)
        }
        setAltLoading(false)
    }, [params])

    useEffect(() => {
        if (activeView === 'of_sweep') {
            const t = setTimeout(runOFSweep, 500)
            return () => clearTimeout(t)
        }
        if (activeView === 'altitude') {
            const t = setTimeout(runAltitudeTable, 500)
            return () => clearTimeout(t)
        }
    }, [activeView, params, runOFSweep, runAltitudeTable])

    const handleExportCSV = useCallback(async () => {
        if (!result) return
        setExportLoading('csv')
        try {
            const blob = await fetchBlob('/analyze/rocket/export/csv', {
                method: 'POST',
                body: JSON.stringify({
                    gamma: result.gamma,
                    mach_exit: result.mach_exit || 3.0,
                    throat_radius: result.r_throat || 0.1
                })
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `nozzle_contour_${params.propellant.replace('/', '_')}.csv`
            a.click()
            URL.revokeObjectURL(url)
            showToast('CSV export complete — nozzle contour downloaded.')
        } catch (e) {
            console.error('CSV Export Error:', e)
            showToast('Export failed. Check backend connection.', false)
        }
        setExportLoading(null)
    }, [result, params.propellant])

    const handleExportSTL = useCallback(async () => {
        if (!result) return
        setExportLoading('stl')
        try {
            const blob = await fetchBlob('/analyze/rocket/export/stl', {
                method: 'POST',
                body: JSON.stringify({
                    gamma: result.gamma,
                    mach_exit: result.mach_exit || 3.0,
                    throat_radius: result.r_throat || 0.1
                })
            })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `nozzle_design_${params.propellant.replace('/', '_')}.stl`
            a.click()
            URL.revokeObjectURL(url)
            showToast('STL export complete — 3D mesh downloaded.')
        } catch (e) {
            console.error('STL Export Error:', e)
            showToast('STL export failed. Check backend connection.', false)
        }
        setExportLoading(null)
    }, [result, params.propellant])

    const runAnalysis = useCallback(async () => {
        setLoading(true)
        setResult(null)
        setMocData(null)
        setError(null)
        try {
            const main = await fetchData('/analyze/rocket', { method: 'POST', body: JSON.stringify(params) })
            setResult(main)
            // Second pass: MoC once we have gamma from equilibrium
            if (main && main.gamma && main.r_throat) {
                try {
                    const moc = await fetchData('/analyze/rocket/moc', {
                        method: 'POST',
                        body: JSON.stringify({
                            gamma: main.gamma,
                            mach_exit: main.mach_exit || 3.0,
                            throat_radius: main.r_throat || 0.1
                        })
                    })
                    setMocData(moc)
                } catch (mocErr) {
                    console.error('MoC computation failed (non-fatal):', mocErr)
                    // Non-fatal — equilibrium result is still shown
                }
            }
        } catch (e) {
            console.error(e)
            setError(`Combustion solver failed: ${e.message || 'Backend unreachable'}`)
        }
        setLoading(false)
    }, [params])

    useEffect(() => {
        const t = setTimeout(runAnalysis, 700)
        return () => clearTimeout(t)
    }, [params, runAnalysis])

    // Build "Engineering Review" section dynamically from result
    const reviewStatus = () => {
        if (!result) return null
        const chamberTempK = result.t_chamber || 0
        const heatFlux = result.heat_transfer?.q_flux_MW_m2?.[0] || 0
        const isp = result.isp_delivered || 0

        const thermalOk = chamberTempK < 4000
        const ispOk = isp > 250

        return {
            code: thermalOk && ispOk ? 'NOMINAL // VERIFIED' : 'WARN // REVIEW_NEEDED',
            statusOk: thermalOk && ispOk,
            message: thermalOk
                ? `Chamber temperature ${chamberTempK.toFixed(0)} K within structural tolerance. Peak heat flux ${heatFlux.toFixed(2)} MW/m².`
                : `CAUTION: Chamber temperature ${chamberTempK.toFixed(0)} K exceeds 4000 K threshold — regenerative cooling mandatory.`,
        }
    }

    const review = reviewStatus()
    const fmt = (v, d = 1) => v != null ? v.toFixed(d) : '—'

    return (
        <div className="space-y-16 animate-in pb-20">
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <span className="uppercase tracking-[0.4em] text-[13px] font-black text-white font-headline">
                  ROCKET PROPULSION DESIGN SUITE
                </span>
                <div className="status-badge">
                  {loading ? 'CEA_EXECUTING...' : error ? 'SOLVER_ERROR' : 'CEA_SOLVER_READY'}
                </div>
            </div>

            {/* View tabs */}
            <div className="flex gap-2">
                {[
                    { id: 'design',    label: 'CHAMBER_DESIGN' },
                    { id: 'of_sweep',  label: 'O/F OPTIMUM' },
                    { id: 'altitude',  label: 'ALTITUDE_PERF' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveView(tab.id)}
                        className={`px-10 py-3 text-[11px] font-black tracking-[0.2em] uppercase font-headline border transition-all ${
                            activeView === tab.id
                                ? 'bg-white text-black border-white'
                                : 'bg-transparent text-white/40 border-white/10 hover:border-white/30 hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Error Banner */}
            {activeView === 'design' && error && !loading && (
                <div className="border border-red-500/30 bg-red-950/20 px-12 py-8 flex items-center gap-8">
                    <span className="material-symbols-outlined text-red-400 !text-[22px] shrink-0">error_outline</span>
                    <p className="mono text-[11px] text-red-400 uppercase tracking-widest leading-relaxed">{error}</p>
                </div>
            )}

            {activeView === 'design' && <div className="grid grid-cols-12 gap-12">
                {/* Left Col: Params */}
                <section className="col-span-12 lg:col-span-3 space-y-4">
                   <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">COMBUSTION DESIGN</h2>
                        <SliderControl
                            label="Chamber Pressure" value={(params.pc/1e6).toFixed(2)} unit="MPa"
                            min={1} max={25} step={0.1}
                            onChange={v => setParams({...params, pc: v*1e6})}
                        />
                        <SliderControl
                            label="O/F Ratio" value={params.of_ratio.toFixed(2)} unit=""
                            min={2} max={12} step={0.1}
                            onChange={v => setParams({...params, of_ratio: v})}
                        />
                        <div className="space-y-4 p-8 border border-white/10 bg-surface-container-low">
                            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 border-b border-white/10 pb-3 block">
                              Propellant
                            </label>
                            <select
                                value={params.propellant}
                                onChange={e => setParams({...params, propellant: e.target.value})}
                                className="w-full bg-surface-container-highest border border-white/20 px-8 py-5 text-[12px] mono text-white focus:outline-none focus:border-white transition-all uppercase tracking-widest"
                            >
                                <option value="H2/O2">LOX / LH2 — Hydrolox</option>
                                <option value="CH4/O2">LOX / LCH4 — Methalox</option>
                                <option value="RP1/O2">LOX / RP-1 — Kerolox</option>
                                <option value="UDMH/N2O4">UDMH / N2O4 — Hypergolic</option>
                                <option value="MMH/N2O4">MMH / N2O4 — Hypergolic</option>
                            </select>
                        </div>
                   </div>

                    <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">EXPORT_PROTOCOLS</h2>
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={handleExportCSV}
                                disabled={!result || !!exportLoading}
                                className={`w-full border border-white/20 bg-transparent text-white py-5 px-10 flex items-center justify-between text-[11px] font-black tracking-[0.2em] uppercase transition-all font-headline ${(!result || exportLoading) ? 'opacity-30 cursor-not-allowed' : 'hover:border-white'}`}
                            >
                                <span>{exportLoading === 'csv' ? 'EXPORTING...' : 'EXPORT COORDINATES (CSV)'}</span>
                                <span className="material-symbols-outlined !text-[18px]">{exportLoading === 'csv' ? 'sync' : 'csv'}</span>
                            </button>
                            <button
                                onClick={handleExportSTL}
                                disabled={!result || !!exportLoading}
                                className={`w-full border border-white/10 bg-transparent text-white/60 py-4 px-10 flex items-center justify-between text-[11px] font-bold tracking-[0.2em] uppercase transition-all font-headline ${(!result || exportLoading) ? 'opacity-30 cursor-not-allowed' : 'hover:border-white/40 hover:text-white'}`}
                            >
                                <span>{exportLoading === 'stl' ? 'EXPORTING_STL...' : 'EXPORT 3D MESH (STL)'}</span>
                                <span className="material-symbols-outlined !text-[18px]">{exportLoading === 'stl' ? 'sync' : 'draw'}</span>
                            </button>
                        </div>
                   </div>

                   <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4 disabled:opacity-60"
                    >
                        <span className="material-symbols-outlined !text-[20px]">{loading ? 'sync' : 'rocket_launch'}</span>
                        {loading ? 'COMPUTING...' : 'RUN_CHAMBER_SYNTHESIS'}
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

                {/* Middle: MoC Visualization + Stats */}
                <section className="col-span-12 lg:col-span-6 flex flex-col gap-12 relative">
                    {/* Toast Notification */}
                    {toast && (
                        <div className={`absolute top-0 right-0 z-50 px-10 py-5 text-[11px] font-black tracking-[0.2em] uppercase mono animate-in slide-in-from-right-4 ${
                            toast.ok ? 'bg-white text-black' : 'bg-red-500/90 text-white'
                        }`}>
                            {toast.msg}
                        </div>
                    )}
                    <MocVisualization mocData={mocData} loading={loading} />

                    <div className="grid grid-cols-4 gap-1 grid-bg">
                        <StatPanel label="VAC. THRUST"    value={result ? (result.thrust_vac/1000).toFixed(0) : '—'} unit="kN"  sub="DESIGN_TARGET" />
                        <StatPanel label="SPECIFIC ISP"   value={result ? fmt(result.isp_delivered) : '—'}           unit="s"   sub="SHIFTING_EQ" />
                        <StatPanel label="MASS FLOW"      value={result ? fmt(result.mdot_total, 2) : '—'}            unit="kg/s" sub="COMBUSTION" />
                        <StatPanel label="THROAT RADIUS"  value={result ? fmt(result.r_throat * 1000) : '—'}          unit="mm"  sub="GEOMETRIC" />
                        <StatPanel label="EXIT RADIUS"    value={result ? fmt(result.r_exit * 1000) : '—'}            unit="mm"  sub="GEOMETRIC" />
                        <StatPanel label="CHAMBER LENGTH" value={result ? fmt(result.l_chamber * 1000) : '—'}         unit="mm"  sub="GEOMETRIC" />
                        <StatPanel label="NOZZLE LENGTH"  value={result ? fmt(result.l_nozzle * 1000) : '—'}          unit="mm"  sub="GEOMETRIC" />
                        <StatPanel label="TOTAL LENGTH"   value={result ? fmt((result.l_chamber + result.l_nozzle) * 1000) : '—'} unit="mm" sub="GEOMETRIC" />
                    </div>
                </section>

                {/* Right: Detailed Analysis */}
                <section className="col-span-12 lg:col-span-3 space-y-12">
                    <div className="bg-surface-container-low border border-white/10 p-14">
                         <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-12 pb-5 border-b border-white/10">CHAMBER_CONSTANTS</h2>
                         <div className="space-y-10">
                            {[
                                { label: 'ISP Theoretical',   val: `${fmt(result?.isp_ideal)} s` },
                                { label: 'Thrust Coeff (Cf)', val: fmt(result?.cf_delivered, 4) },
                                { label: 'Exit Gamma',        val: fmt(result?.gamma, 4) },
                                { label: 'Flame Temp [K]',    val: `${result?.t_chamber?.toFixed(0) || '—'} K` },
                                { label: 'Expansion Ratio',   val: fmt(result?.epsilon, 2) },
                                { label: 'Peak Heat Flux',    val: result?.heat_transfer?.q_flux_MW_m2?.[0] != null ? `${result.heat_transfer.q_flux_MW_m2[0].toFixed(2)} MW/m²` : '—' },
                                { label: 'ISP Vacuum',        val: `${fmt(result?.isp_vac)} s` },
                                { label: 'C* [m/s]',          val: fmt(result?.c_star, 1) },
                            ].map((row, i) => (
                                <div key={i} className="flex justify-between items-baseline group">
                                    <span className="text-[11px] mono text-white/40 tracking-widest uppercase group-hover:text-white/70 transition-colors">{row.label}</span>
                                    <span className="text-[14px] mono text-white font-bold tracking-tighter">{row.val}</span>
                                </div>
                            ))}
                         </div>
                    </div>

                    {/* Engineering Review — Dynamic */}
                    <div className={`p-14 space-y-12 relative group border ${review?.statusOk === false ? 'bg-red-950/10 border-red-500/20' : 'bg-surface-container-high border-white/10'}`}>
                        <div className="panel-accent"></div>
                        <div className="flex items-center gap-6 pb-8 border-b border-white/20">
                             <span className={`material-symbols-outlined !text-[24px] ${review?.statusOk === false ? 'text-red-400' : 'text-white'}`}>
                               {review?.statusOk === false ? 'warning' : 'verified_user'}
                             </span>
                             <h2 className="text-[13px] font-black tracking-[0.3em] uppercase text-white">Thermal Review</h2>
                        </div>
                        <div className="space-y-10">
                            {review ? (
                                <>
                                    <div className="space-y-3">
                                        <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Status Code</p>
                                        <p className={`mono font-black text-[12px] p-4 border ${review.statusOk ? 'text-white bg-white/5 border-white/10' : 'text-red-400 bg-red-950/20 border-red-500/20'}`}>
                                          {review.code}
                                        </p>
                                    </div>
                                    <div className="space-y-5">
                                        <p className={`text-[12px] leading-relaxed uppercase mono border-l-4 pl-8 italic ${review.statusOk ? 'border-white text-white/70' : 'border-red-500 text-red-300'}`}>
                                            {review.message}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-[12px] mono text-white/20 uppercase tracking-widest italic">
                                    Run solver to generate thermal review.
                                </p>
                            )}
                        </div>
                    </div>
                </section>
            </div>}

            {/* ── O/F Sweep Panel ───────────────────────────────────────── */}
            {activeView === 'of_sweep' && (
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white/60">
                            O/F RATIO SWEEP — <HelpTooltip term="isp">ISP</HelpTooltip> vs O/F
                        </h2>
                        {sweepLoading && <span className="mono text-[11px] text-white/30 animate-pulse">COMPUTING...</span>}
                    </div>
                    {sweepData && sweepData.length > 0 ? (
                        <div className="bg-surface-container-low border border-white/10">
                            <Plot
                                data={[
                                    {
                                        x: sweepData.map(d => d.of_ratio),
                                        y: sweepData.map(d => d.isp),
                                        name: 'Isp Delivered',
                                        type: 'scatter', mode: 'lines',
                                        line: { color: '#fff', width: 2 },
                                    },
                                    {
                                        x: sweepData.map(d => d.of_ratio),
                                        y: sweepData.map(d => d.isp_vac),
                                        name: 'Isp Vacuum',
                                        type: 'scatter', mode: 'lines',
                                        line: { color: 'rgba(255,255,255,0.4)', width: 1, dash: 'dash' },
                                    },
                                ]}
                                layout={getLayout(theme, {
                                    height: 360,
                                    xaxis: { title: 'O/F Ratio' },
                                    yaxis: { title: 'Isp [s]' },
                                    margin: { l: 60, r: 20, t: 30, b: 60 },
                                })}
                                className="w-full"
                                config={{ displayModeBar: false, responsive: true }}
                            />
                        </div>
                    ) : !sweepLoading ? (
                        <div className="h-48 flex items-center justify-center text-white/20 mono text-[12px] uppercase tracking-widest">
                            Select O/F Sweep tab to compute
                        </div>
                    ) : null}
                </div>
            )}

            {/* ── Altitude Performance Panel ────────────────────────────── */}
            {activeView === 'altitude' && (
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white/60">
                            ALTITUDE PERFORMANCE TABLE — <HelpTooltip term="isp">ISP</HelpTooltip> vs Altitude
                        </h2>
                        {altLoading && <span className="mono text-[11px] text-white/30 animate-pulse">COMPUTING...</span>}
                    </div>
                    {altData && altData.length > 0 ? (
                        <div className="space-y-6">
                            <Plot
                                data={[
                                    {
                                        x: altData.filter(d => !d.error).map(d => d.altitude_m / 1000),
                                        y: altData.filter(d => !d.error).map(d => d.isp_s),
                                        name: 'Isp Delivered',
                                        type: 'scatter', mode: 'lines+markers',
                                        line: { color: '#fff', width: 2 },
                                        marker: { size: 4 },
                                    },
                                    {
                                        x: altData.filter(d => !d.error).map(d => d.altitude_m / 1000),
                                        y: altData.filter(d => !d.error).map(d => d.isp_vac),
                                        name: 'Isp Vacuum',
                                        type: 'scatter', mode: 'lines',
                                        line: { color: 'rgba(255,255,255,0.4)', width: 1, dash: 'dash' },
                                    },
                                ]}
                                layout={getLayout(theme, {
                                    height: 300,
                                    xaxis: { title: 'Altitude [km]' },
                                    yaxis: { title: 'Isp [s]' },
                                    margin: { l: 60, r: 20, t: 30, b: 60 },
                                })}
                                className="w-full"
                                config={{ displayModeBar: false, responsive: true }}
                            />
                            <div className="overflow-x-auto">
                                <table className="w-full text-[11px] mono">
                                    <thead>
                                        <tr className="border-b border-white/10 text-white/30 uppercase tracking-widest">
                                            <th className="py-3 px-6 text-left">Alt [km]</th>
                                            <th className="py-3 px-6 text-right">P_amb [Pa]</th>
                                            <th className="py-3 px-6 text-right">Isp [s]</th>
                                            <th className="py-3 px-6 text-right">Isp_vac [s]</th>
                                            <th className="py-3 px-6 text-right">Cf</th>
                                            <th className="py-3 px-6 text-right">Regime</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {altData.map((row, i) => (
                                            <tr key={i} className="border-b border-white/5 text-white/60 hover:bg-white/5 transition-colors">
                                                <td className="py-2 px-6">{(row.altitude_m / 1000).toFixed(0)}</td>
                                                <td className="py-2 px-6 text-right">{row.error ? '—' : row.p_amb_pa?.toFixed(0)}</td>
                                                <td className="py-2 px-6 text-right">{row.error ? <span className="text-red-400/60">ERR</span> : row.isp_s?.toFixed(1)}</td>
                                                <td className="py-2 px-6 text-right">{row.error ? '—' : row.isp_vac?.toFixed(1)}</td>
                                                <td className="py-2 px-6 text-right">{row.error ? '—' : row.cf_delivered?.toFixed(4)}</td>
                                                <td className="py-2 px-6 text-right text-[10px] tracking-widest">{row.regime || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : !altLoading ? (
                        <div className="h-48 flex items-center justify-center text-white/20 mono text-[12px] uppercase tracking-widest">
                            Select Altitude Performance tab to compute
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}
