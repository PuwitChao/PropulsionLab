import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'
import { useSettings } from '../context/SettingsContext'
import { getLayout, ax } from '../utils/chartUtils'

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit, delta, sub, warn }) {
  return (
    <div className="metric-card" style={{ borderLeftColor: warn ? '#ff4444' : undefined }}>
      <div className="metric-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.25rem' }}>
        <div className="metric-value">{value} <span className="metric-unit">{unit}</span></div>
        {delta !== undefined && (
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: delta >= 0 ? '#4ade80' : '#f87171' }}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(2)}
          </span>
        )}
      </div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{sub}</div>}
    </div>
  )
}

function SliderInput({ label, min, max, step, value, onChange, unit }) {
  return (
    <div>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{value} {unit}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent-color)', background: 'var(--surface-border)' }} />
    </div>
  )
}

function NumberInput({ label, value, onChange, step = 1, min, max }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem',
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
        {label}
      </label>
      <input type="number" step={step} min={min} max={max} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="input-field" />
    </div>
  )
}

function Label({ children, style }) {
  return (
    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', ...style }}>
      {children}
    </label>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Turbojet tab
// ─────────────────────────────────────────────────────────────────────────────
function TurbojetTab() {
  const { theme } = useSettings();
  const isLight = theme === 'light';
  const mainColor = isLight ? '#0f172a' : '#fff';
  const [result,     setResult]     = useState(null)
  const [prevResult, setPrevResult] = useState(null)
  const [compMode,   setCompMode]   = useState(false)
  const [sweep,      setSweep]      = useState(null)
  const [prevSweep,  setPrevSweep]  = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [activeStation, setActiveStation] = useState(null)
  const [y1, setY1] = useState('spec_thrust')
  const [y2, setY2] = useState('tsfc')
  const [plotRevision, setPlotRevision] = useState(0)

  const sweepLabelMap = {
    spec_thrust: 'Spec. Thrust [N·s/kg]',
    v9: 'Exit Velocity (V9) [m/s]',
    f: 'Fuel-Air Ratio (f)',
    tsfc: 'TSFC [mg/N·s]',
    eta_thermal: 'Thermal Eff. (η_th)',
    eta_overall: 'Overall Eff. (η_o)',
  }

  const [p, setP] = useState({
    alt: 10000, mach: 0.8, prc: 22, tit: 1600,
    eta_c: 0.88, eta_t: 0.92, eta_ab: 0.95,
    ab_enabled: false, ab_temp: 2000,
    inlet_recovery: 0.98, burner_eta: 0.99,
    burner_dp_frac: 0.04, nozzle_dp_frac: 0.02,
  })

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    try {
      const [data, swData] = await Promise.all([
        fetchData('/analyze/cycle', { method: 'POST', body: JSON.stringify(p) }),
        fetchData('/analyze/cycle/sweep', { method: 'POST', body: JSON.stringify({ alt: p.alt, mach: p.mach, tit: p.tit }) }),
      ])
      setResult(data)
      setSweep(swData)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [p])

  useEffect(() => {
    const t = setTimeout(runAnalysis, 700)
    return () => clearTimeout(t)
  }, [p])

  useEffect(() => { runAnalysis() }, [])

  const tsTraces = result ? (() => {
    const main = {
      x: [0, 2, 3, 4, 5].map(s => result.stations?.[s]?.s ?? 0),
      y: [0, 2, 3, 4, 5].map(s => result.stations?.[s]?.tt ?? 0),
      mode: 'lines+markers+text',
      text: ['S0', 'S2', 'S3', 'S4', 'S5'],
      textposition: 'top center',
      line: { color: mainColor, width: 2.5 },
      marker: { color: mainColor, size: 8 },
      name: 'Current Cycle',
      type: 'scatter',
      hovertemplate: 'Station %{text}<br>Tt: %{y:.1f} K<br>s: %{x:.2f}<extra></extra>',
    }
    const traces = [main]
    if (compMode && prevResult) {
      traces.push({
        x: [0, 2, 3, 4, 5].map(s => prevResult.stations?.[s]?.s ?? 0),
        y: [0, 2, 3, 4, 5].map(s => prevResult.stations?.[s]?.tt ?? 0),
        mode: 'lines',
        line: { color: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)', dash: 'dot', width: 2 },
        name: 'Baseline',
        type: 'scatter',
        hoverinfo: 'skip'
      })
    }
    return traces;
  })() : []

  const sweepTraces = sweep ? (() => {
    const traces = [
      { x: sweep.map(d => d.prc), y: sweep.map(d => d[y1]), name: `${y1.toUpperCase()} (Cur)`, yaxis: 'y1', type: 'scatter', line: { color: mainColor, width: 2 } },
      { x: sweep.map(d => d.prc), y: sweep.map(d => d[y2] * (y2 === 'tsfc' ? 1e6 : 100)),  name: `${y2.toUpperCase()}${y2 === 'tsfc' ? ' [mg/Ns]' : ' [%]'}`, yaxis: 'y2', type: 'scatter', line: { color: isLight ? '#475569' : '#888', dash: 'dash' } },
    ]
    if (compMode && prevSweep) {
      traces.push({ x: prevSweep.map(d => d.prc), y: prevSweep.map(d => d[y1]), name: `${y1.toUpperCase()} (Base)`, yaxis: 'y1', type: 'scatter', line: { color: isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.25)', dash: 'dot' } })
    }
    return traces;
  })() : []

  const stationRows = result ? [
    { stn: 0,  desc: 'Ambient',           tt: result.stations?.[0]?.tt,  pt: result.stations?.[0]?.pt },
    { stn: 2,  desc: 'Inlet Exit',        tt: result.stations?.[2]?.tt,  pt: result.stations?.[2]?.pt },
    { stn: 3,  desc: 'Compressor Exit',   tt: result.stations?.[3]?.tt,  pt: result.stations?.[3]?.pt },
    { stn: 4,  desc: 'Turbine Inlet',     tt: result.stations?.[4]?.tt,  pt: result.stations?.[4]?.pt },
    { stn: 5,  desc: 'Turbine Exit',      tt: result.stations?.[5]?.tt,  pt: result.stations?.[5]?.pt },
    { stn: 7,  desc: 'Nozzle Entry',      tt: result.stations?.[7]?.tt,  pt: result.stations?.[7]?.pt },
  ] : []

  return (
    <div>
      {loading && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-color)', animation: 'progressPulse 1s infinite', borderRadius: '2px', zIndex: 100 }} />}
      <div className="grid">
        {/* ── Control Panel ─────────────────────────────── */}
        <section className="card">
          <h3>Flight Conditions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
            <NumberInput label="Altitude [m]"           value={p.alt}  onChange={v => setP({...p, alt: v})}  step={500} min={0} max={20000} />
            <NumberInput label="Flight Mach Number"      value={p.mach} onChange={v => setP({...p, mach: v})} step={0.05} min={0} max={3.5} />
            <NumberInput label="Overall Pressure Ratio (πc)" value={p.prc}  onChange={v => setP({...p, prc: v})}  step={1} min={2} max={60} />
            <NumberInput label="Turbine Inlet Temperature [K]" value={p.tit}  onChange={v => setP({...p, tit: v})}  step={25} min={600} max={2500} />
          </div>
        </section>

        <section className="card">
          <h3>Component Efficiencies</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '1rem' }}>
            <SliderInput label="Compressor Polytropic (ηpc)" min={0.75} max={0.97} step={0.01} value={p.eta_c} onChange={v => setP({...p, eta_c: v})} unit="" />
            <SliderInput label="Turbine Polytropic (ηpt)"    min={0.75} max={0.97} step={0.01} value={p.eta_t} onChange={v => setP({...p, eta_t: v})} unit="" />
            <SliderInput label="Inlet Recovery (π_d)"        min={0.85} max={1.00} step={0.01} value={p.inlet_recovery} onChange={v => setP({...p, inlet_recovery: v})} unit="" />
            <SliderInput label="Combustor Pressure Drop"     min={0.01} max={0.10} step={0.01} value={p.burner_dp_frac} onChange={v => setP({...p, burner_dp_frac: v})} unit="" />

            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Afterburner</label>
                <button
                  onClick={() => setP({...p, ab_enabled: !p.ab_enabled})}
                  style={{ padding: '0.35rem 1rem', fontFamily: 'var(--font-family)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
                    background: p.ab_enabled ? 'var(--accent-color)' : 'transparent', color: p.ab_enabled ? 'var(--bg-color)' : 'var(--text-primary)',
                    border: '1px solid', borderColor: p.ab_enabled ? 'var(--accent-color)' : 'var(--surface-border)', borderRadius: '4px', cursor: 'pointer' }}>
                  {p.ab_enabled ? 'ON' : 'OFF'}
                </button>
              </div>
              {p.ab_enabled && (
                <div style={{ marginTop: '1rem' }}>
                  <NumberInput label="AB Exit Temperature [K]" value={p.ab_temp} onChange={v => setP({...p, ab_temp: v})} step={50} min={1200} max={2500} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Performance Metrics ───────────────────────── */}
        {result && (
          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Design-Point Performance</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="status-badge">TURBOJET</div>
                <button className="button-primary" style={{ fontSize: '0.78rem', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                  onClick={() => { setPrevResult(result); setPrevSweep(sweep); setCompMode(true) }}>
                  {compMode ? 'Update Baseline' : 'Set Baseline'}
                </button>
              </div>
            </div>
            <div className="metric-container">
              <MetricCard label="Specific Thrust" value={result.spec_thrust?.toFixed(1)} unit="N·s/kg"
                delta={compMode && prevResult ? result.spec_thrust - prevResult.spec_thrust : undefined} />
              <MetricCard label="TSFC" value={(result.tsfc * 1e6)?.toFixed(3)} unit="mg/N·s"
                delta={compMode && prevResult ? (result.tsfc - prevResult.tsfc) * 1e6 : undefined} />
              <MetricCard label="Thermal Efficiency" value={(result.eta_thermal * 100)?.toFixed(1)} unit="%" sub="η_th = (ΔKE) / Q_in" />
              <MetricCard label="Propulsive Efficiency" value={(result.eta_propulsive * 100)?.toFixed(1)} unit="%" sub="η_p = F·V₀ / ΔKE (Froude)" />
              <MetricCard label="Overall Efficiency" value={(result.eta_overall * 100)?.toFixed(1)} unit="%" sub="η_o = η_th × η_p" />
              <MetricCard label="Isentropic Eff. (Comp.)" value={result.eta_isen_c?.toFixed(4)} unit="" sub="Derived from polytropic η" />
              <MetricCard label="Isentropic Eff. (Turb.)" value={result.eta_isen_t?.toFixed(4)} unit="" sub="Derived from work matching" />
              <MetricCard label="Fuel-Air Ratio (f)" value={result.f?.toFixed(5)} unit="" sub={p.ab_enabled ? `f_ab = ${result.f_ab?.toFixed(5)}` : ''} />
            </div>
          </section>
        )}

        {/* ── Calculation Trace ─────────────────────────── */}
        {result && (
          <section className="card animate-in" style={{ gridColumn: '1 / -1', borderTop: '3px solid var(--accent-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Station-by-Station Audit Trace</h3>
              <div className="status-badge">VERIFIED BALANCE</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>S0→S2 | RAM RECOVERY</h4>
                <div className="equation">Tt₂ = T₀·(1 + {((1.4-1)/2).toFixed(2)}·M₀²) = {result.stations?.[2]?.tt?.toFixed(1)} K</div>
                <div className="equation">Pt₂ = Pt₀ · π_inlet = {(result.stations?.[2]?.pt/1e3)?.toFixed(2)} kPa</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>S2→S3 | COMPRESSION</h4>
                <div className="equation">Tt₃_ideal = Tt₂ · πc^[(γ-1)/γ] = {result.tt3_ideal?.toFixed(1)} K</div>
                <div className="equation">Tt₃ = Tt₂ + (Tt₃_ideal − Tt₂) / η_isen_c = {result.tt3?.toFixed(1)} K</div>
                <div className="equation">Wc = Cp·(Tt₃ − Tt₂) = {result.w_comp?.toFixed(0)} J/kg</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>S3→S4 | COMBUSTION</h4>
                <div className="equation">f = Cp·(Tt₄ − Tt₃) / (η_b · h_f − Cp·Tt₄) = {result.f?.toFixed(5)}</div>
                <div className="equation">Pt₄ = Pt₃ · (1 − ΔP_b) = {(result.stations?.[4]?.pt/1e3)?.toFixed(1)} kPa</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>S4→S5 | EXPANSION (TURBINE)</h4>
                <div className="equation">Wt = Cp·Tt₄·(1+f) = {result.w_turb?.toFixed(0)} J/kg → Wt = Wc (shaft balance)</div>
                <div className="equation">Tt₅ = {result.tt5?.toFixed(1)} K &nbsp;|&nbsp; Pt₅ = {(result.pt5/1e3)?.toFixed(1)} kPa</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>S5→S9 | NOZZLE THRUST</h4>
                <div className="equation">V₉ = {result.v9?.toFixed(1)} m/s &nbsp;|&nbsp; V₀ = {result.v0?.toFixed(1)} m/s &nbsp;|&nbsp; M₉ = {result.m9?.toFixed(3)}</div>
                <div className="equation">F/ṁ = (1+f)V₉ − V₀ = {result.spec_thrust?.toFixed(1)} N·s/kg</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>OVERALL EFFICIENCY CHAIN</h4>
                <div className="equation">η_th = {(result.eta_thermal * 100)?.toFixed(2)}% → η_p = {(result.eta_propulsive * 100)?.toFixed(2)}%</div>
                <div className="equation">η_o = η_th × η_p = {(result.eta_overall * 100)?.toFixed(2)}%</div>
              </div>
            </div>
          </section>
        )}

        {/* ── Station Table ─────────────────────────────── */}
        {result && (
          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Station Properties</h3>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      {['Stn', 'Description', 'Tt [K]', 'Pt [kPa]'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.6rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stationRows.map(r => (
                      <tr key={r.stn} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td style={{ padding: '0.5rem 0.6rem', fontWeight: 800, fontFamily: 'monospace' }}>{r.stn}</td>
                        <td style={{ padding: '0.5rem 0.6rem', color: 'var(--text-secondary)' }}>{r.desc}</td>
                        <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'monospace' }}>{r.tt?.toFixed(1) ?? '—'}</td>
                        <td style={{ padding: '0.5rem 0.6rem', fontFamily: 'monospace' }}>{r.pt ? (r.pt / 1e3).toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>T–s Diagram</h3>
                <div style={{ background: isLight ? '#f8fafc' : '#000', borderRadius: '8px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
                  <Plot data={tsTraces}
                    layout={getLayout(theme, { height: 260, xaxis: ax(theme, 'Relative Entropy (s)'), yaxis: ax(theme, 'Total Temperature Tt [K]'), showlegend: compMode })}
                    style={{ width: '100%' }} useResizeHandler config={{ responsive: true, displayModeBar: false }} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Sweep Plot ────────────────────────────────── */}
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Overall Pressure Ratio Sweep</h3>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Label style={{ margin: 0 }}>Y1:</Label>
                <select value={y1} onChange={e => { setY1(e.target.value); setPlotRevision(r => r + 1) }} className="input-field" style={{ padding: '0.3rem', fontSize: '0.72rem', width: '120px' }}>
                  <option value="spec_thrust">Specific Thrust</option>
                  <option value="v9">Exit Velocity (V9)</option>
                  <option value="f">Fuel-Air Ratio (f)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Label style={{ margin: 0 }}>Y2:</Label>
                <select value={y2} onChange={e => { setY2(e.target.value); setPlotRevision(r => r + 1) }} className="input-field" style={{ padding: '0.3rem', fontSize: '0.72rem', width: '120px' }}>
                  <option value="tsfc">TSFC</option>
                  <option value="eta_thermal">Thermal Eff.</option>
                  <option value="eta_overall">Overall Eff.</option>
                </select>
              </div>
              <div className="status-badge" style={{ whiteSpace: 'nowrap' }}>SENSITIVITY ANALYSIS</div>
            </div>
          </div>
          <div style={{ background: isLight ? '#f8fafc' : '#000', borderRadius: '8px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
            {sweep ? (
              <Plot data={sweepTraces} revision={plotRevision}
                layout={getLayout(theme, { height: 320,
                  xaxis: ax(theme, 'Overall Pressure Ratio (πc)'),
                  yaxis:  { ...ax(theme, sweepLabelMap[y1]), side: 'left' },
                  yaxis2: { ...ax(theme, sweepLabelMap[y2]), overlaying: 'y', side: 'right', showgrid: false },
                  legend: { orientation: 'h', y: -0.28, font: { size: 9 } },
                })}
                style={{ width: '100%' }} useResizeHandler config={{ responsive: true, displayModeBar: false }} />
            ) : <div style={{ height: '320px' }} />}
          </div>
        </section>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Turbofan tab
// ─────────────────────────────────────────────────────────────────────────────
const SPEED_COLORS = [
  '#555', '#666', '#777', '#888', '#999', '#aaa', '#bbb', '#ccc', '#ddd', '#fff'
]

function TurbofanTab() {
  const { theme } = useSettings();
  const isLight = theme === 'light';
  const mainColor = isLight ? '#0f172a' : '#fff';
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)

  const [p, setP] = useState({
    alt: 10668, mach: 0.85, bpr: 5.0, fpr: 1.65, opr: 28, tit: 1550,
    eta_fan: 0.90, eta_c: 0.87, eta_t: 0.91,
    ab_enabled: false, ab_temp: 2000,
    inlet_recovery: 0.98, burner_eta: 0.99, burner_dp_frac: 0.04,
  })

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchData('/analyze/cycle/turbofan', { method: 'POST', body: JSON.stringify(p) })
      setResult(data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [p])

  useEffect(() => { const t = setTimeout(runAnalysis, 700); return () => clearTimeout(t) }, [p])
  useEffect(() => { runAnalysis() }, [])

  const stStations = result ? [0, 2, 21, 3, 4, 45, 5, 7, 19].map(s => ({
    stn: s, tt: result.stations?.[s]?.tt, pt: result.stations?.[s]?.pt,
  })) : []

  const stationLabels = { 0: 'Ambient', 2: 'Inlet Exit', 21: 'Fan Exit (Brd)', 3: 'HPC Exit',
    4: 'TIT', 45: 'HPT Exit', 5: 'LPT Exit', 7: 'Nozzle Entry', 19: 'Bypass Exit' }

  const tsData = result ? [{
    x: [0, 2, 21, 3, 4, 45, 5, 7].map(s => result.stations?.[s]?.s ?? 0),
    y: [0, 2, 21, 3, 4, 45, 5, 7].map(s => result.stations?.[s]?.tt ?? 0),
    mode: 'lines+markers+text',
    text: ['0', '2', '21', '3', '4', '45', '5', '7'],
    textposition: 'top center',
    line: { color: mainColor, width: 2 },
    marker: { color: mainColor, size: 8 },
    type: 'scatter',
    hovertemplate: 'Station %{text}<br>Tt: %{y:.1f} K<br>s: %{x:.2f}<extra></extra>',
  }] : []

  return (
    <div>
      {loading && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--accent-color)', animation: 'progressPulse 1s infinite', borderRadius: '2px', zIndex: 100 }} />}
      <div className="grid">
        {/* Config */}
        <section className="card">
          <h3>Turbofan Configuration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
            <NumberInput label="Altitude [m]"    value={p.alt}  onChange={v => setP({...p, alt: v})}  step={500} min={0} max={20000} />
            <NumberInput label="Flight Mach"     value={p.mach} onChange={v => setP({...p, mach: v})} step={0.05} min={0} max={1.5} />
            <NumberInput label="Bypass Ratio (BPR)" value={p.bpr}  onChange={v => setP({...p, bpr: v})}  step={0.5} min={0.5} max={15} />
            <NumberInput label="Fan Pressure Ratio (FPR)" value={p.fpr}  onChange={v => setP({...p, fpr: v})} step={0.05} min={1.1} max={3.0} />
            <NumberInput label="Overall Pressure Ratio (OPR)" value={p.opr}  onChange={v => setP({...p, opr: v})}  step={1} min={5} max={60} />
            <NumberInput label="Turbine Inlet Temperature [K]" value={p.tit}  onChange={v => setP({...p, tit: v})}  step={25} min={600} max={2500} />
          </div>
        </section>

        <section className="card">
          <h3>Component Efficiencies</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', marginTop: '1rem' }}>
            <SliderInput label="Fan Polytropic (ηp_fan)"    min={0.78} max={0.97} step={0.01} value={p.eta_fan} onChange={v => setP({...p, eta_fan: v})} unit="" />
            <SliderInput label="HPC Polytropic (ηp_c)"      min={0.78} max={0.97} step={0.01} value={p.eta_c}   onChange={v => setP({...p, eta_c: v})}   unit="" />
            <SliderInput label="Turbine Polytropic (ηp_t)"  min={0.78} max={0.97} step={0.01} value={p.eta_t}   onChange={v => setP({...p, eta_t: v})}   unit="" />
            <SliderInput label="Inlet Recovery (π_inlet)"   min={0.88} max={1.00} step={0.01} value={p.inlet_recovery} onChange={v => setP({...p, inlet_recovery: v})} unit="" />
            <SliderInput label="Combustor ΔP Fraction"      min={0.01} max={0.10} step={0.005} value={p.burner_dp_frac} onChange={v => setP({...p, burner_dp_frac: v})} unit="" />
          </div>
        </section>

        {/* Performance */}
        {result && (
          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Design-Point Performance</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="status-badge">TURBOFAN · BPR {p.bpr}</div>
              </div>
            </div>
            <div className="metric-container">
              <MetricCard label="Net Specific Thrust" value={result.spec_thrust?.toFixed(1)} unit="N·s/kg" sub="Per kg/s total airflow" />
              <MetricCard label="TSFC" value={(result.tsfc * 1e6)?.toFixed(3)} unit="mg/N·s" />
              <MetricCard label="Thermal Efficiency" value={(result.eta_thermal * 100)?.toFixed(1)} unit="%" />
              <MetricCard label="Propulsive Efficiency" value={(result.eta_propulsive * 100)?.toFixed(1)} unit="%" />
              <MetricCard label="Overall Efficiency" value={(result.eta_overall * 100)?.toFixed(1)} unit="%" />
              <MetricCard label="Core Exit Velocity (V9)" value={result.v9?.toFixed(1)} unit="m/s" />
              <MetricCard label="Bypass Exit Velocity (V19)" value={result.v19?.toFixed(1)} unit="m/s" sub="Lower → better prop. efficiency" />
              <MetricCard label="Bypass Thrust Fraction" value={(result.bpr_thrust_frac * 100)?.toFixed(1)} unit="%" sub="% of total thrust from bypass stream" />
              <MetricCard label="Fan Isen. Efficiency" value={result.eta_isen_fan?.toFixed(4)} unit="" />
              <MetricCard label="HPC Isen. Efficiency" value={result.eta_isen_c?.toFixed(4)} unit="" />
              <MetricCard label="Fuel-Air Ratio (f)" value={result.f?.toFixed(5)} unit="" />
              <MetricCard label="HPT Exit Temp (Tt₄₅)" value={result.tt45?.toFixed(1)} unit="K" />
            </div>
          </section>
        )}

        {/* Calculation trace */}
        {result && (
          <section className="card animate-in" style={{ gridColumn: '1 / -1', borderTop: '3px solid var(--accent-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>Turbofan Calculation Trace</h3>
              <div className="status-badge">DUAL-SPOOL | SEPARATE EXHAUST</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>FAN (S2→S21)</h4>
                <div className="equation">FPR = {p.fpr} → Tt₂₁ = {result.stations?.[21]?.tt?.toFixed(1)} K</div>
                <div className="equation">W_fan/kg_total = Cp·(Tt₂₁ − Tt₂)</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>HPC (S21→S3)</h4>
                <div className="equation">HPC_PR = OPR / FPR = {(p.opr / p.fpr).toFixed(2)}</div>
                <div className="equation">Tt₃ = {result.tt3?.toFixed(1)} K &nbsp;|&nbsp; Pt₃ = {(result.stations?.[3]?.pt/1e3)?.toFixed(1)} kPa</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>HPT WORK MATCH (S4→S45)</h4>
                <div className="equation">W_HPT = Cp_hot · (Tt₄ − Tt₄₅)(1+f) = W_HPC/kg_core</div>
                <div className="equation">Tt₄₅ = {result.tt45?.toFixed(1)} K</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>LPT WORK MATCH (S45→S5)</h4>
                <div className="equation">W_LPT = Cp_hot · (Tt₄₅ − Tt₅)(1+f) = W_fan · (1+BPR)</div>
                <div className="equation">Tt₅ = {result.tt5?.toFixed(1)} K &nbsp;|&nbsp; Pt₅ = {(result.pt5/1e3)?.toFixed(1)} kPa</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>BYPASS NOZZLE (S21→S19)</h4>
                <div className="equation">V₁₉ = {result.v19?.toFixed(1)} m/s &nbsp;|&nbsp; M₁₉ = {result.m19?.toFixed(3)}</div>
                <div className="equation">Bypass jet is cool & slow → high η_prop</div>
              </div>
              <div className="calculation-card">
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.78rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>NET THRUST (BOTH STREAMS)</h4>
                <div className="equation">(1+f)V₉ + BPR·V₁₉ − (1+BPR)V₀ = {(result.spec_thrust * (1+p.bpr))?.toFixed(1)} N·s/kg_core</div>
                <div className="equation">F_net / kg_total = {result.spec_thrust?.toFixed(1)} N·s/kg</div>
              </div>
            </div>
          </section>
        )}

        {/* Station table & Diagram */}
        {result && (
          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) 1.2fr', gap: '2rem' }}>
              <div style={{ overflowX: 'auto' }}>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Station Flow Properties</h3>
                <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      {['Stn', 'Description', 'Tt [K]', 'Pt [kPa]'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stStations.map(r => r.tt !== undefined && (
                      <tr key={r.stn} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 800, fontFamily: 'monospace' }}>{r.stn}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>{stationLabels[r.stn] || '—'}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{r.tt?.toFixed(1)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>{r.pt ? (r.pt / 1e3).toFixed(2) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Turbofan T–s Path</h3>
                <div style={{ background: isLight ? '#f8fafc' : '#000', borderRadius: '8px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
                  <Plot data={tsData}
                    layout={getLayout(theme, { height: 280, xaxis: ax(theme, 'Relative Entropy (s)'), yaxis: ax(theme, 'Total Temperature Tt [K]'), showlegend: false })}
                    style={{ width: '100%' }} useResizeHandler config={{ responsive: true, displayModeBar: false }} />
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main exported page (tab router)
// ─────────────────────────────────────────────────────────────────────────────
export default function ParametricCycle() {
  const [activeEngine, setActiveEngine] = useState('turbojet')

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Gas Turbine Cycle Analysis Suite</h1>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          On-design thermodynamic cycle analysis for turbojet and turbofan engines with full efficiency audit
        </p>
      </header>

      {/* Engine type selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0', alignItems: 'flex-end' }}>
        {[
          { id: 'turbojet', label: 'Turbojet / Single-Spool' },
          { id: 'turbofan', label: 'Turbofan / Dual-Spool' },
        ].map(e => (
          <button
            key={e.id}
            onClick={() => setActiveEngine(e.id)}
            style={{
              padding: '0.65rem 1.5rem',
              fontFamily: 'var(--font-family)',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'transparent',
              color: activeEngine === e.id ? '#fff' : 'var(--text-muted)',
              border: 'none',
              borderBottom: activeEngine === e.id ? '2px solid var(--accent-color)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '-1px',
            }}>
            {e.label}
          </button>
        ))}
      </div>

      {activeEngine === 'turbojet' && <TurbojetTab />}
      {activeEngine === 'turbofan' && <TurbofanTab />}
    </div>
  )
}
