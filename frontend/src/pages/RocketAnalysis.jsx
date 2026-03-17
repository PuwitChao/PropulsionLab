import React, { useState, useEffect } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'
import { useSettings } from '../context/SettingsContext'
import { getLayout, ax } from '../utils/chartUtils'


function MetricCard({ label, value, unit, sub, warn, delta }) {
  const hasDelta = delta !== undefined && Math.abs(delta) > 0.0001;
  return (
    <div className="metric-card" style={{ borderLeftColor: warn ? '#ff4444' : undefined }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ marginTop: '0.25rem' }}>
        {value} <span className="metric-unit">{unit}</span>
      </div>
      {hasDelta && (
        <div style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: '0.2rem', color: delta > 0 ? '#10b981' : '#f43f5e' }}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(delta < 1 ? 4 : 1)}
        </div>
      )}
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  )
}

function Label({ children }) {
  return (
    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
      {children}
    </label>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RocketAnalysis() {
  const { theme } = useSettings();
  const isLight = theme === 'light';
  const chartMainColor = isLight ? '#0f172a' : '#fff';
  const chartSecondaryColor = isLight ? '#64748b' : '#aaa';
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [result,   setResult]   = useState(null)
  const [prevResult, setPrevResult] = useState(null)
  const [prevSweepData, setPrevSweepData] = useState(null)
  const [prevAltData, setPrevAltData] = useState(null)
  const [compMode, setCompMode] = useState(false)
  const [sweepData, setSweepData]   = useState(null)
  const [altData,   setAltData]     = useState(null)
  const [sizingResult, setSizingResult] = useState(null)
  const [prevSizingResult, setPrevSizingResult] = useState(null)
  const [mocData,   setMocData]     = useState(null)
  const [activeTab, setActiveTab]   = useState('performance')

  // Customizable chart parameters
  const [sweepY1, setSweepY1] = useState('isp')
  const [sweepY2, setSweepY2] = useState('t_chamber')
  const [altY, setAltY] = useState('isp_s')
  const [plotRevision, setPlotRevision] = useState(0)

  const [params, setParams] = useState({
    pc: 10e6, of_ratio: 6.0, pe: 101325.0,
    propellant: 'H2/O2', mode: 'shifting',
    exit_half_angle_deg: 15.0,
    thrust_target_N: null,
    compute_heat_transfer: true,
  })

  const [mocParams, setMocParams] = useState({ gamma: 1.2, mach_exit: 3.2, throat_radius: 0.1 })
  const [sizingParams, setSizingParams] = useState({ thrust_N: 20000 })

  // ── Auto-run ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(runAll, 800)
    return () => clearTimeout(t)
  }, [params])

  useEffect(() => { runAll(); runMoc() }, [])

  const runAll = async () => {
    setLoading(true); setProgress(15)
    try {
      const [main, sweep, alt] = await Promise.all([
        fetchData('/analyze/rocket', { method: 'POST', body: JSON.stringify(params) }),
        fetchData('/analyze/rocket/sweep', { method: 'POST', body: JSON.stringify(params) }),
        fetchData('/analyze/rocket/altitude', {
          method: 'POST',
          body: JSON.stringify({ pc: params.pc, of_ratio: params.of_ratio, propellant: params.propellant, mode: params.mode, alt_max_km: 100, n_points: 20 })
        }),
      ])
    setResult(main)
    setSweepData(sweep)
    setAltData(alt)
    if (main.gamma) {
      setMocParams(prev => ({ ...prev, gamma: parseFloat(main.gamma.toFixed(3)) }))
    }
    setProgress(100)
    } catch (e) { console.error('Rocket analysis failed:', e) }
    setTimeout(() => { setLoading(false); setProgress(0) }, 400)
  }

  const runMoc = async () => {
    try {
      const data = await fetchData('/analyze/rocket/moc', { method: 'POST', body: JSON.stringify(mocParams) })
      setMocData(data)
    } catch (e) { console.error('MoC failed:', e) }
  }

  const runSizing = async () => {
    setLoading(true)
    try {
      const data = await fetchData('/analyze/rocket/sizing', {
        method: 'POST',
        body: JSON.stringify({ ...sizingParams, pc: params.pc, of_ratio: params.of_ratio, pe: params.pe, propellant: params.propellant, mode: params.mode }),
      })
      setSizingResult(data)
    } catch (e) { console.error('Sizing failed:', e) }
    setLoading(false)
  }

  // ── Chart data ─────────────────────────────────────────────────────────────
  const compositionData = result?.composition_exit
    ? Object.entries(result.composition_exit).filter(([, v]) => v > 0.001).sort((a, b) => b[1] - a[1]).slice(0, 10)
    : []

  const sweepLabelMap = {
    isp: 'Isp Delivered [s]',
    isp_vac: 'Isp Vacuum [s]',
    c_star: 'c* Velocity [m/s]',
    cf_delivered: 'Thrust Coeff Cf',
    t_chamber: 'Flame Temp [K]',
    mw_chamber: 'Molec. Weight [g/mol]',
    gamma: 'Gamma (γ)',
  }
  const altLabelMap = {
    isp_s: 'Isp Delivered [s]',
    isp_vac: 'Isp Vacuum [s]',
    cf_delivered: 'Thrust Coeff Cf',
    p_amb_pa: 'Ambient Pressure [Pa]',
  }

  const sweepTraces = sweepData ? (() => {
    const traces = [
      { x: sweepData.map(d => d.of_ratio), y: sweepData.map(d => d[sweepY1]), name: `${sweepY1.toUpperCase()} (Cur)`, yaxis: 'y1', type: 'scatter', mode: 'lines', line: { color: chartMainColor, width: 2.5 } },
      { x: sweepData.map(d => d.of_ratio), y: sweepData.map(d => d[sweepY2] / (sweepY2 === 't_chamber' ? 100 : 1)), name: `${sweepY2.toUpperCase()}${sweepY2 === 't_chamber' ? '/100' : ''} (Cur)`, yaxis: 'y2', type: 'scatter', mode: 'lines', line: { color: isLight ? '#94a3b8' : '#555', dash: 'dash', width: 1.5 } },
    ]
    if (compMode && prevSweepData) {
      traces.push({ x: prevSweepData.map(d => d.of_ratio), y: prevSweepData.map(d => d[sweepY1]), name: `${sweepY1.toUpperCase()} (Base)`, yaxis: 'y1', type: 'scatter', mode: 'lines', line: { color: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)', dash: 'dot', width: 2 } })
      traces.push({ x: prevSweepData.map(d => d.of_ratio), y: prevSweepData.map(d => d[sweepY2] / (sweepY2 === 't_chamber' ? 100 : 1)), name: `${sweepY2.toUpperCase()} (Base)`, yaxis: 'y2', type: 'scatter', mode: 'lines', line: { color: isLight ? 'rgba(100,100,100,0.1)' : 'rgba(150,150,150,0.15)', dash: 'dot', width: 1.5 } })
    }
    return traces;
  })() : []

  const altTraces = altData ? (() => {
    const traces = [
      { x: altData.map(d => d.altitude_m / 1000), y: altData.map(d => d[altY]), name: `${altY.toUpperCase()} (Cur)`, type: 'scatter', mode: 'lines+markers', line: { color: chartMainColor, width: 2 }, marker: {size: 4} }
    ]
    if (compMode && prevAltData) {
      traces.push({ x: prevAltData.map(d => d.altitude_m / 1000), y: prevAltData.map(d => d[altY]), name: `${altY.toUpperCase()} (Base)`, type: 'scatter', mode: 'lines', line: { color: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)', dash: 'dot' } })
    }
    return traces;
  })() : []

  const heatTraces = result?.heat_transfer ? [
    { x: result.heat_transfer.area_ratio, y: result.heat_transfer.q_flux_MW_m2, name: 'Heat Flux [MW/m²]', type: 'scatter', mode: 'lines', line: { color: chartMainColor, width: 2 }, yaxis: 'y1' },
    { x: result.heat_transfer.area_ratio, y: result.heat_transfer.h_gas_W_m2_K.map(h => h / 1e4), name: 'h_gas [×10⁴ W/m²K]', type: 'scatter', mode: 'lines', line: { color: chartSecondaryColor, dash: 'dot' }, yaxis: 'y2' },
  ] : []

  const mocTraces = mocData ? [
    { x: mocData.x, y: mocData.y,           name: 'Nozzle Wall',  mode: 'lines', line: { color: chartMainColor, width: 2.5 } },
    { x: mocData.x, y: mocData.y.map(y=>-y), name: 'Nozzle Wall', mode: 'lines', line: { color: chartMainColor, width: 2.5 }, showlegend: false },
    ...(mocData.mesh || []).flatMap(m => [
      { x: m.x, y: m.y,           mode: 'lines', line: { color: m.type==='C+' ? (isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.12)') : (isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)'), width: 1 }, showlegend: false, hoverinfo: 'text', text: `M=${m.mach} (${m.type})` },
      { x: m.x, y: m.y.map(y=>-y), mode: 'lines', line: { color: m.type==='C+' ? (isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.12)') : (isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)'), width: 1 }, showlegend: false },
    ]),
  ] : []

  const tabs = [
    { id: 'performance',   label: 'Performance' },
    { id: 'heat_transfer', label: 'Heat Transfer' },
    { id: 'sizing',        label: 'Engine Sizing' },
    { id: 'altitude',      label: 'Altitude Performance' },
    { id: 'nozzle',        label: 'Nozzle Design (MoC)' },
    { id: 'properties',    label: 'Fluid Properties' },
  ]

  return (
    <div className="animate-in" style={{ position: 'relative' }}>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-text">Chemical Equilibrium Solver</div>
          <div className="progress-container"><div className="progress-bar" style={{ width: `${progress}%` }} /></div>
          <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>RUNNING CANTERA CEA EQUILIBRIUM...</p>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Rocket Propulsion Analysis</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Chemical equilibrium performance with Bartz heat transfer, engine sizing & altitude analysis
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="button-primary" style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', fontSize: '0.8rem', opacity: loading || compMode ? 0.5 : 1 }}
              disabled={loading || compMode}
              onClick={() => { setPrevResult(result); setPrevSweepData(sweepData); setPrevAltData(altData); setPrevSizingResult(sizingResult); setCompMode(true) }}>
              {compMode ? 'Update Baseline' : 'Set Baseline'}
            </button>
            {mocData && (
              <button className="button-primary" style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                onClick={() => {
                  const csv = mocData.x.map((x, i) => `${x},${mocData.y[i]}`).join('\n')
                  const blob = new Blob([`x,y\n${csv}`], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = 'nozzle_contour.csv'; a.click()
                }}>
                Export Nozzle CSV
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Control Panel ─────────────────────────────────────────────── */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Propellant & Operating Conditions</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div>
            <Label>Propellant Combination</Label>
            <select value={params.propellant} onChange={e => setParams({...params, propellant: e.target.value})} className="input-field">
              <optgroup label="Standard Liquid Systems">
                <option value="H2/O2">LOX / LH2 — Hydrolox</option>
                <option value="CH4/O2">LOX / LCH4 — Methalox</option>
                <option value="RP1/O2">LOX / Kerolox (RP-1 Surrogate)</option>
                <option value="Propane/O2">LOX / Propane</option>
                <option value="Ethanol/O2">LOX / Ethanol (Methanol Surrogate)</option>
                <option value="Methanol/O2">LOX / Methanol</option>
                <option value="Ammonia/O2">LOX / Ammonia</option>
              </optgroup>
              <optgroup label="High Energy / Tactical">
                <option value="C2H2/O2">LOX / Acetylene</option>
                <option value="C2H4/O2">LOX / Ethylene</option>
                <option value="C2H6/O2">LOX / Ethane</option>
              </optgroup>
              <optgroup label="Nitrous Oxide Systems">
                <option value="CH4/N2O">N2O / Methane</option>
                <option value="C3H8/N2O">N2O / Propane</option>
              </optgroup>
            </select>
          </div>
          <div>
            <Label>Expansion Mode</Label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              {['shifting', 'frozen'].map(m => (
                <button key={m} onClick={() => setParams({...params, mode: m})}
                  style={{ flex: 1, padding: '0.65rem', fontFamily: 'var(--font-family)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
                    background: params.mode === m ? 'var(--accent-color)' : 'transparent',
                    border: '1px solid', borderColor: 'var(--surface-border)',
                    color: params.mode === m ? 'var(--bg-color)' : 'var(--text-muted)', borderRadius: '4px', transition: 'all 0.2s' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Chamber Pressure [bar]</Label>
            <input type="number" value={(params.pc / 1e5).toFixed(1)} onChange={e => setParams({...params, pc: parseFloat(e.target.value) * 1e5})} className="input-field" step="5" min="1" max="500" />
          </div>
          <div>
            <Label>O/F Mixture Ratio</Label>
            <input type="number" value={params.of_ratio} onChange={e => setParams({...params, of_ratio: parseFloat(e.target.value)})} className="input-field" step="0.1" min="0.5" max="20" />
          </div>
          <div>
            <Label>Exit Pressure [bar]</Label>
            <input type="number" value={(params.pe / 1e5).toFixed(4)} onChange={e => setParams({...params, pe: parseFloat(e.target.value) * 1e5})} className="input-field" step="0.01" min="0" max="10" />
          </div>
          <div>
            <Label>Divergence Half-Angle [°]</Label>
            <input type="number" value={params.exit_half_angle_deg} onChange={e => setParams({...params, exit_half_angle_deg: parseFloat(e.target.value)})} className="input-field" step="1" min="5" max="30" />
          </div>
        </div>
      </section>

      {/* ── Tab Navigation ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-border)', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding: '0.6rem 1.2rem', fontFamily: 'var(--font-family)', fontSize: '0.78rem', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.07em', background: 'transparent', border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: '-1px', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Performance                                                  */}
      {activeTab === 'performance' && (
        <div className="animate-in">
          {result && (
            <>
              <div className="metric-container" style={{ marginBottom: '1.5rem' }}>
                <MetricCard label="Specific Impulse (Delivered)" value={result.isp_delivered?.toFixed(1)} unit="s"
                  delta={compMode && prevResult ? result.isp_delivered - prevResult.isp_delivered : undefined} />
                <MetricCard label="Isp (Vacuum)" value={result.isp_vac?.toFixed(1)} unit="s" sub="Pe term + momentum"
                  delta={compMode && prevResult ? result.isp_vac - prevResult.isp_vac : undefined} />
                <MetricCard label="Isp (Sea Level)" value={result.isp_sl?.toFixed(1)} unit="s"
                  delta={compMode && prevResult ? result.isp_sl - prevResult.isp_sl : undefined} />
                <MetricCard label="Ideal Isp" value={result.isp_ideal?.toFixed(1)} unit="s" sub="No divergence/friction losses"
                  delta={compMode && prevResult ? result.isp_ideal - prevResult.isp_ideal : undefined} />
                <MetricCard label="Flame Temperature" value={result.t_chamber?.toFixed(0)} unit="K" warn={result.t_chamber > 3500}
                  delta={compMode && prevResult ? result.t_chamber - prevResult.t_chamber : undefined} />
                <MetricCard label="Characteristic Velocity (c*)" value={result.c_star?.toFixed(1)} unit="m/s" sub="c* = √(Rspec·Tc / γ) / (throat factor)"
                  delta={compMode && prevResult ? result.c_star - prevResult.c_star : undefined} />
                <MetricCard label="Thrust Coefficient (Cf)" value={result.cf_delivered?.toFixed(4)} unit="" sub={`Ideal: ${result.cf_ideal?.toFixed(4)}`}
                  delta={compMode && prevResult ? result.cf_delivered - prevResult.cf_delivered : undefined} />
                <MetricCard label="Area Ratio (ε)" value={result.epsilon?.toFixed(3)} unit="" sub="Ae/At" />
                <MetricCard label="Divergence Factor (λ)" value={result.lambda_div?.toFixed(4)} unit="" sub={`α = ${params.exit_half_angle_deg}°`} />
                <MetricCard label="Exit Velocity (Delivered)" value={result.v_exit_delivered?.toFixed(1)} unit="m/s"
                  delta={compMode && prevResult ? result.v_exit_delivered - prevResult.v_exit_delivered : undefined} />
                <MetricCard label="Equivalence Ratio (φ)" value={result.phi?.toFixed(4)} unit="" />
                <MetricCard label="Flow Regime" value={result.regime} unit="" warn={result.regime?.includes('Sep') || result.regime?.includes('Over')} />
              </div>

              {/* Calculation trace */}
              <section className="card" style={{ borderTop: '3px solid var(--accent-color)', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3>Thermodynamic Calculation Trace</h3>
                  <div className="status-badge">{params.mode.toUpperCase()} EQUILIBRIUM</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                  <div className="calculation-card">
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>COMBUSTION (HP EQUILIBRATION)</h4>
                    <div className="equation">Tc = {result.t_chamber?.toFixed(1)} K &nbsp;|&nbsp; Pc = {(params.pc / 1e6).toFixed(2)} MPa</div>
                    <div className="equation">MW = {result.mw_chamber?.toFixed(3)} g/mol &nbsp;|&nbsp; γ = {result.gamma?.toFixed(4)}</div>
                  </div>
                  <div className="calculation-card">
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>CHARACTERISTIC VELOCITY</h4>
                    <div className="equation">c* = √(Rspec·Tc / γ) / [(2/(γ+1))^((γ+1)/(2(γ-1)))]</div>
                    <div className="equation">c* = {result.c_star?.toFixed(1)} m/s</div>
                  </div>
                  <div className="calculation-card">
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>IDEAL NOZZLE EXIT</h4>
                    <div className="equation">Ve_ideal = √(2·Δh_stag) = {result.v_exit_ideal?.toFixed(1)} m/s</div>
                    <div className="equation">ε = (ρ*·V*) / (ρe·Ve) = {result.epsilon?.toFixed(3)}</div>
                  </div>
                  <div className="calculation-card">
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>DELIVERED PERFORMANCE</h4>
                    <div className="equation">Ve_del = Ve_ideal · λ_div · Cf_friction = {result.v_exit_delivered?.toFixed(1)} m/s</div>
                    <div className="equation">Isp = Ve_del / g₀ = {result.isp_delivered?.toFixed(1)} s</div>
                  </div>
                </div>
              </section>

              {/* OF Sweep Chart */}
              <section className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3 style={{ margin: 0 }}>O/F Ratio Sensitivity — Performance Sweep</h3>
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Label style={{ margin: 0 }}>Y1:</Label>
                      <select value={sweepY1} onChange={e => { setSweepY1(e.target.value); setPlotRevision(r => r + 1) }} className="input-field" style={{ padding: '0.3rem', fontSize: '0.72rem', width: '90px' }}>
                        <option value="isp">Isp Del</option>
                        <option value="isp_vac">Isp Vac</option>
                        <option value="c_star">c* Velocity</option>
                        <option value="cf_delivered">Cf Coeff</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Label style={{ margin: 0 }}>Y2:</Label>
                      <select value={sweepY2} onChange={e => { setSweepY2(e.target.value); setPlotRevision(r => r + 1) }} className="input-field" style={{ padding: '0.3rem', fontSize: '0.72rem', width: '90px' }}>
                        <option value="t_chamber">Flame Temp</option>
                        <option value="mw_chamber">Molec. Wt</option>
                        <option value="gamma">Gamma (γ)</option>
                      </select>
                    </div>
                    <div className="status-badge" style={{ whiteSpace: 'nowrap' }}>PARAMETRIC SWEEP</div>
                  </div>
                </div>
                <div style={{ background: isLight ? 'var(--bg-color)' : '#000', borderRadius: '8px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
                  {sweepData ? (
                  <Plot data={sweepTraces} revision={plotRevision}
                    layout={getLayout(theme, { height: 320,
                      xaxis: ax(theme, 'O/F Mixture Ratio'),
                      yaxis:  { ...ax(theme, sweepLabelMap[sweepY1]), side: 'left' },
                      yaxis2: { ...ax(theme, sweepLabelMap[sweepY2]), overlaying: 'y', side: 'right', showgrid: false },
                      legend: { orientation: 'h', y: -0.28, font: { size: 9 } },
                    })}
                    style={{ width: '100%' }} useResizeHandler config={{ responsive: true, displayModeBar: false }} />
                  ) : <div style={{ height: '320px' }} />}
                </div>
              </section>

              {/* Species composition */}
              <section className="card" style={{ marginTop: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Exit Species Mole Fractions (Top 10)</h3>
                <div style={{ background: isLight ? '#f8fafc' : '#000', borderRadius: '8px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
                  <Plot
                    data={[{ x: compositionData.map(d => d[0]), y: compositionData.map(d => d[1]), type: 'bar', marker: { color: compositionData.map((_, i) => isLight ? `rgba(15,23,42,${0.9 - i * 0.07})` : `rgba(255,255,255,${0.9 - i * 0.07})`) } }]}
                    layout={getLayout(theme, { height: 260, xaxis: ax(theme, 'Species'), yaxis: { ...ax(theme, 'Mole Fraction'), type: 'log' }, showlegend: false })}
                    style={{ width: '100%' }} useResizeHandler config={{ responsive: true, displayModeBar: false }} />
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Heat Transfer                                                */}
      {activeTab === 'heat_transfer' && (
        <div className="animate-in">
          <section className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3>Bartz Convective Heat Transfer Distribution</h3>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Convective heat flux q [MW/m²] and heat transfer coefficient h_gas [W/m²K] along the divergent section
                </p>
              </div>
              <div className="status-badge">BARTZ (1957) CORRELATION</div>
            </div>

            {result?.heat_transfer ? (
              <>
                <div className="metric-container" style={{ marginBottom: '1.5rem' }}>
                  <MetricCard label="Throat Heat Flux" value={(result.heat_transfer.h_throat * (result.t_chamber - 600) / 1e6 || 0).toFixed(2)} unit="MW/m²" sub="Bartz h_throat × (Taw − Twall)" />
                  <MetricCard label="h_gas at Throat" value={result.heat_transfer.h_throat?.toFixed(0)} unit="W/m²K" sub="Critical design point" />
                  <MetricCard label="Max q (approx.)" value={Math.max(...(result.heat_transfer.q_flux_MW_m2 || [0])).toFixed(2)} unit="MW/m²" />
                </div>

                <div style={{ background: isLight ? 'var(--bg-color)' : '#000', borderRadius: '10px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
                  <Plot data={heatTraces}
                    layout={getLayout(theme, { height: 380,
                      xaxis: ax(theme, 'Expansion Ratio (ε = Ae/At)'),
                      yaxis:  { ...ax(theme, 'Heat Flux q [MW/m²]'),         side: 'left' },
                      yaxis2: { ...ax(theme, 'h_gas [×10⁴ W/m²·K]'), overlaying: 'y', side: 'right', showgrid: false },
                      legend: { orientation: 'h', y: -0.2, font: { size: 9 } },
                    })}
                    style={{ width: '100%' }} useResizeHandler config={{ responsive: true, displayModeBar: false }} />
                </div>

                {/* Bartz methodology */}
                <div className="calculation-card" style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>BARTZ CORRELATION — KEY EQUATIONS</h4>
                  <div className="equation">{'h₀ = (0.026 / Dₜ⁰·²) · (μ⁰·² · Cp / Pr⁰·⁶) · (Pc/c*)⁰·⁸ · (Dₜ/Rc)⁰·¹'}</div>
                  <div className="equation">{'q_conv = h_gas · (T_aw − T_wall),  T_aw = Tc · r / (1 + (γ−1)/2 · M²)'}</div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: 1.6 }}>
                    The Bartz correlation (1957) predicts convective heat transfer based on nozzle geometry 
                    and combustion gas properties. Peak flux occurs at the throat (smallest area → highest velocity and density). 
                    Regenerative cooling channel design uses these values to size jacket flow rates and wall thickness.
                  </p>
                </div>
              </>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Run analysis to compute Bartz heat transfer distribution.
              </div>
            )}
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Engine Sizing                                                */}
      {activeTab === 'sizing' && (
        <div className="animate-in">
          <section className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1.25rem' }}>Engine Sizing from Thrust Target</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Specify a required vacuum thrust level. The solver back-calculates throat area, exit area, mass flow rates,
              nozzle dimensions, and engine mass estimate using the current propellant configuration.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <Label>Target Vacuum Thrust [N]</Label>
                <input type="number" value={sizingParams.thrust_N} onChange={e => setSizingParams({...sizingParams, thrust_N: parseFloat(e.target.value)})}
                  className="input-field" step="1000" min="100" max="10000000" />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="button-primary" onClick={runSizing} style={{ width: '100%', padding: '0.75rem' }}>
                  ▶ Compute Engine Sizing
                </button>
              </div>
            </div>

            {sizingResult && (
              <>
                <div className="metric-container">
                  <MetricCard label="Target Thrust" value={(sizingResult.thrust_N / 1000).toFixed(1)} unit="kN" delta={compMode && prevSizingResult ? (sizingResult.thrust_N - prevSizingResult.thrust_N) / 1000 : undefined} />
                  <MetricCard label="Throat Area (At)" value={(sizingResult.A_throat_m2 * 10000).toFixed(3)} unit="cm²" delta={compMode && prevSizingResult ? (sizingResult.A_throat_m2 - prevSizingResult.A_throat_m2) * 10000 : undefined} />
                  <MetricCard label="Exit Area (Ae)" value={(sizingResult.A_exit_m2 * 10000).toFixed(2)} unit="cm²" delta={compMode && prevSizingResult ? (sizingResult.A_exit_m2 - prevSizingResult.A_exit_m2) * 10000 : undefined} />
                  <MetricCard label="Throat Radius" value={(sizingResult.r_throat_m * 1000).toFixed(2)} unit="mm" delta={compMode && prevSizingResult ? (sizingResult.r_throat_m - prevSizingResult.r_throat_m) * 1000 : undefined} />
                  <MetricCard label="Exit Radius" value={(sizingResult.r_exit_m * 1000).toFixed(1)} unit="mm" delta={compMode && prevSizingResult ? (sizingResult.r_exit_m - prevSizingResult.r_exit_m) * 1000 : undefined} />
                  <MetricCard label="Total Mass Flow (ṁ)" value={sizingResult.mdot_kg_s?.toFixed(3)} unit="kg/s" delta={compMode && prevSizingResult ? sizingResult.mdot_kg_s - prevSizingResult.mdot_kg_s : undefined} />
                  <MetricCard label="Fuel Mass Flow" value={sizingResult.mdot_fuel?.toFixed(4)} unit="kg/s" delta={compMode && prevSizingResult ? sizingResult.mdot_fuel - prevSizingResult.mdot_fuel : undefined} />
                  <MetricCard label="Oxidiser Mass Flow" value={sizingResult.mdot_ox?.toFixed(4)} unit="kg/s" delta={compMode && prevSizingResult ? sizingResult.mdot_ox - prevSizingResult.mdot_ox : undefined} />
                  <MetricCard label="Isp Vacuum" value={sizingResult.isp_vac?.toFixed(1)} unit="s" delta={compMode && prevSizingResult ? sizingResult.isp_vac - prevSizingResult.isp_vac : undefined} />
                  <MetricCard label="Cf (Delivered)" value={sizingResult.cf_delivered?.toFixed(4)} unit="" delta={compMode && prevSizingResult ? sizingResult.cf_delivered - prevSizingResult.cf_delivered : undefined} />
                  <MetricCard label="Est. Engine Mass" value={sizingResult.mass_engine_kg?.toFixed(2)} unit="kg" delta={compMode && prevSizingResult ? sizingResult.mass_engine_kg - prevSizingResult.mass_engine_kg : undefined} sub="Simplified Inconel 718 estimate" />
                  <MetricCard label="Thrust-to-Weight" value={(sizingResult.thrust_N / (sizingResult.mass_engine_kg * 9.81)).toFixed(1)} unit="" delta={compMode && prevSizingResult ? (sizingResult.thrust_N / (sizingResult.mass_engine_kg * 9.81)) - (prevSizingResult.thrust_N / (prevSizingResult.mass_engine_kg * 9.81)) : undefined} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
                  <div className="calculation-card">
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>THROAT & NOZZLE GEOMETRY</h4>
                    <div className="equation">{'At = F_vac / (Cf · Pc) = ' + (sizingResult.A_throat_m2 * 10000).toFixed(3) + ' cm²'}</div>
                    <div className="equation">{'Ae = At · ε = ' + (sizingResult.A_exit_m2 * 10000).toFixed(2) + ' cm²'}</div>
                    <div className="equation">{'L_bell ≈ ' + (sizingResult.nozzle_dims?.l_bell * 100 || 0).toFixed(1) + ' cm &nbsp;&nbsp; L_cone_equiv ≈ ' + (sizingResult.nozzle_dims?.l_cone * 100 || 0).toFixed(1) + ' cm'}</div>
                  </div>
                  <div className="calculation-card">
                    <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>MASS FLOW BALANCE</h4>
                    <div className="equation">{'ṁ_total = Pc · At / c* = ' + sizingResult.mdot_kg_s?.toFixed(4) + ' kg/s'}</div>
                    <div className="equation">{'ṁ_ox = ṁ · (OF/(1+OF)) = ' + sizingResult.mdot_ox?.toFixed(4) + ' kg/s'}</div>
                    <div className="equation">{'ṁ_fuel = ṁ − ṁ_ox = ' + sizingResult.mdot_fuel?.toFixed(4) + ' kg/s'}</div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Structural summary from main result */}
          {result && (
            <section className="card">
              <h3 style={{ marginBottom: '1rem' }}>Structural Estimation (Reference Engine)</h3>
              <div className="metric-container">
                <MetricCard label="Est. Engine Mass" value={result.mass_est?.toFixed(2)} unit="kg" sub="3× chamber mass (valves, pumps)" />
                <MetricCard label="Chamber Radius" value={(result.chamber_dims?.r * 1000)?.toFixed(1)} unit="mm" />
                <MetricCard label="Chamber Length" value={(result.chamber_dims?.l * 1000)?.toFixed(1)} unit="mm" />
                <MetricCard label="Wall Thickness" value={(result.chamber_dims?.t * 1000)?.toFixed(2)} unit="mm" sub="Inconel 718, SF=2.0" />
              </div>
            </section>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Altitude Performance                                         */}
      {activeTab === 'altitude' && (
        <div className="animate-in">
          <section className="card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0 }}>Altitude Isp Performance</h3>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  How delivered specific impulse and thrust coefficient vary with altitude (ambient pressure decreasing to vacuum)
                </p>
              </div>
              <div className="status-badge" style={{ whiteSpace: 'nowrap' }}>0 – 100 km</div>
            </div>
            <div style={{ background: isLight ? '#f8fafc' : '#000', borderRadius: '10px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
              {altData ? (
                <Plot data={altTraces} revision={plotRevision}
                  layout={getLayout(theme, { height: 380,
                    xaxis: ax(theme, 'Altitude [km]'),
                    yaxis: { ...ax(theme, altLabelMap[altY] || altY.toUpperCase()), side: 'left' },
                    legend: { orientation: 'h', y: -0.2, font: { size: 9 } },
                  })}
                  style={{ width: '100%' }} useResizeHandler config={{ responsive: true, displayModeBar: false }} />
              ) : <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading...</div>}
            </div>
          </section>

          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Altitude Analysis Settings</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Label style={{ margin: 0 }}>Parameter to Plot:</Label>
                <select value={altY} onChange={e => { setAltY(e.target.value); setPlotRevision(r => r+1) }} className="input-field" style={{ padding: '0.3rem', fontSize: '0.75rem', width: '140px' }}>
                  <option value="isp_s">Isp Delivered</option>
                  <option value="isp_vac">Isp Vacuum</option>
                  <option value="cf_delivered">Thrust Coeff (Cf)</option>
                  <option value="p_amb_pa">Ambient P</option>
                </select>
              </div>
            </div>
          </section>

          {altData && (
            <section className="card">
              <h3 style={{ marginBottom: '1rem' }}>Altitude Performance Table</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      {['Altitude [km]', 'Ambient P [kPa]', 'Isp Del. [s]', 'Isp Vac [s]', 'Cf Delivered', 'Regime'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {altData.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--surface-border)', background: d.regime?.includes('Sep') ? 'rgba(255,68,68,0.05)' : 'transparent' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{(d.altitude_m / 1000).toFixed(1)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{(d.p_amb_pa / 1000).toFixed(3)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>{d.isp_s?.toFixed(1)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{d.isp_vac?.toFixed(1)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{d.cf_delivered?.toFixed(4)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: d.regime?.includes('Sep') ? '#ff4444' : 'var(--text-secondary)' }}>{d.regime || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Nozzle Design (MoC)                                          */}
      {activeTab === 'nozzle' && (
        <div className="animate-in">
          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3>Method of Characteristics — Bell Nozzle Contour</h3>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Shockless supersonic expansion wave network with characteristic mesh overlay
                </p>
              </div>
              <div className="status-badge">SHOCKLESS DESIGN</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <Label>Design Exit Mach</Label>
                  <input type="number" step="0.1" min="1.5" max="6" value={mocParams.mach_exit}
                    onChange={e => setMocParams({...mocParams, mach_exit: parseFloat(e.target.value)})} className="input-field" />
                </div>
                <div>
                  <Label>Ratio of Specific Heats (γ)</Label>
                  <input type="number" step="0.01" min="1.1" max="1.67" value={mocParams.gamma}
                    onChange={e => setMocParams({...mocParams, gamma: parseFloat(e.target.value)})} className="input-field" />
                </div>
                <div>
                  <Label>Throat Radius [m]</Label>
                  <input type="number" step="0.01" min="0.001" max="2" value={mocParams.throat_radius}
                    onChange={e => setMocParams({...mocParams, throat_radius: parseFloat(e.target.value)})} className="input-field" />
                </div>
                <button className="button-primary" onClick={runMoc} style={{ marginTop: '0.5rem', width: '100%' }}>
                  ▶ Regenerate Contour
                </button>
                {mocData && (
                  <button className="button-primary" style={{ width: '100%', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                    onClick={() => {
                      const csv = mocData.x.map((x, i) => `${x},${mocData.y[i]}`).join('\n')
                      const blob = new Blob([`x,y\n${csv}`], { type: 'text/csv' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a'); a.href = url; a.download = 'nozzle_contour.csv'; a.click()
                    }}>
                    Export Nozzle CSV
                  </button>
                )}
              </div>

              <div style={{ background: isLight ? '#f8fafc' : '#000', borderRadius: '10px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
                {mocData ? (
                  <Plot data={mocTraces}
                    layout={getLayout(theme, { height: 400,
                      xaxis: { ...ax(theme, 'Axial Coordinate x [m]'), zeroline: true, zerolinecolor: isLight ? '#e2e8f0' : '#222' },
                      yaxis: { ...ax(theme, 'Radius r [m]'), scaleanchor: 'x', scaleratio: 1, zeroline: true, zerolinecolor: isLight ? '#e2e8f0' : '#222' },
                      showlegend: false,
                    })}
                    style={{ width: '100%' }} useResizeHandler config={{ responsive: true, displayModeBar: false }} />
                ) : <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Click Regenerate Contour</div>}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Tab: Fluid Properties                                             */}
      {activeTab === 'properties' && (
        <div className="animate-in">
          {result ? (
            <section className="card">
              <h3 style={{ marginBottom: '1.5rem' }}>Thermodynamic & Transport Properties</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      {['Property', 'Symbol', 'Chamber', 'Nozzle Exit', 'Unit'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.7rem 0.9rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { prop: 'Total Pressure',         sym: 'P',     ch: (params.pc/1e6).toFixed(3),        ex: (params.pe/1e6).toFixed(4), unit: 'MPa' },
                      { prop: 'Temperature',            sym: 'T',     ch: result.t_chamber?.toFixed(1),       ex: result.t_exit?.toFixed(1), unit: 'K' },
                      { prop: 'Density',               sym: 'ρ',     ch: result.rho_chamber?.toFixed(3),     ex: result.rho_exit?.toFixed(5), unit: 'kg/m³' },
                      { prop: 'Mean Molecular Weight',  sym: 'MW',    ch: result.mw_chamber?.toFixed(3),     ex: '—', unit: 'g/mol' },
                      { prop: 'Ratio of Specific Heats',sym: 'γ',    ch: result.gamma?.toFixed(4),           ex: '—', unit: '' },
                      { prop: 'Specific Heat Capacity', sym: 'Cp',   ch: result.cp_chamber?.toFixed(1),      ex: '—', unit: 'J/kg·K' },
                      { prop: 'Dynamic Viscosity',      sym: 'μ',     ch: result.visc_chamber?.toExponential(4), ex: result.visc_exit?.toExponential(4), unit: 'Pa·s' },
                      { prop: 'Thermal Conductivity',   sym: 'k',     ch: result.cond_chamber?.toFixed(4),   ex: result.cond_exit?.toFixed(4), unit: 'W/m·K' },
                      { prop: 'Prandtl Number',         sym: 'Pr',    ch: result.pr_chamber?.toFixed(4),     ex: '—', unit: '' },
                    ].map(r => (
                      <tr key={r.prop} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td style={{ padding: '0.65rem 0.9rem' }}>{r.prop}</td>
                        <td style={{ padding: '0.65rem 0.9rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{r.sym}</td>
                        <td style={{ padding: '0.65rem 0.9rem', fontFamily: 'monospace' }}>{r.ch}</td>
                        <td style={{ padding: '0.65rem 0.9rem', fontFamily: 'monospace' }}>{r.ex}</td>
                        <td style={{ padding: '0.65rem 0.9rem', color: 'var(--text-muted)' }}>{r.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Run an analysis to view fluid properties.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
