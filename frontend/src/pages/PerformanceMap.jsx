import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'
import { useSettings } from '../context/SettingsContext'
import { getLayout, ax } from '../utils/chartUtils'

// ── Colour palette ──────────────────────────────────────────────────────────
const SPEED_COLORS = [
  '#555', '#666', '#777', '#888', '#999', '#aaa', '#bbb', '#ccc', '#ddd', '#fff'
]

function Label({ children, style }) {
  return (
    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem', ...style }}>
      {children}
    </label>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
export default function PerformanceMap() {
  const { theme } = useSettings();
  const isLight = theme === 'light';
  const mainColor = isLight ? '#0f172a' : '#fff';
  const speedColors = isLight 
    ? ['#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'] 
    : ['#555', '#666', '#777', '#888', '#999', '#aaa', '#bbb', '#ccc', '#ddd', '#fff'];
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [mapData,  setMapData]  = useState(null)
  const [throttleData, setThrottleData] = useState(null)
  const [activeView, setActiveView]   = useState('compressor')
  const [mapY1, setMapY1] = useState('tsfc')
  const [mapY2, setMapY2] = useState('pr')
  const [plotRevision, setPlotRevision] = useState(0)
  // 'compressor' | 'throttle'

  // Design point parameters (used to anchor both analyses)
  const [dpParams, setDpParams] = useState({
    alt:  0,
    mach: 0.0,
    prc:  20,
    tit:  1500,
  })

  const [mapConfig, setMapConfig] = useState({
    n_speed_lines: 7,
    n_flow_points: 25,
  })

  // ── Operating point overlay ──────────────────────────────────────────────
  const [opPoint, setOpPoint] = useState(null)   // { flow, pr }  user dragged point

  const fetchMap = useCallback(async () => {
    setLoading(true); setProgress(20)
    try {
      const data = await fetchData('/analyze/offdesign/map', {
        method: 'POST',
        body: JSON.stringify({ ...dpParams, ...mapConfig }),
      })
      setMapData(data)
      setProgress(100)
    } catch (e) {
      console.error('Map fetch failed:', e)
    } finally {
      setTimeout(() => { setLoading(false); setProgress(0) }, 400)
    }
  }, [dpParams, mapConfig])

  const fetchThrottle = useCallback(async () => {
    setLoading(true); setProgress(30)
    try {
      const data = await fetchData('/analyze/offdesign/throttle', {
        method: 'POST',
        body: JSON.stringify({ ...dpParams, n_points: 22 }),
      })
      setThrottleData(data)
      setProgress(100)
    } catch (e) {
      console.error('Throttle fetch failed:', e)
    } finally {
      setTimeout(() => { setLoading(false); setProgress(0) }, 400)
    }
  }, [dpParams])

  useEffect(() => { fetchMap(); fetchThrottle() }, [])

  const handleRun = () => { fetchMap(); fetchThrottle() }

  // ── Build Plotly traces for compressor map ───────────────────────────────
  const buildMapTraces = () => {
    if (!mapData) return []
    const traces = []

    // Speed lines
    mapData.speed_lines.forEach((sl, idx) => {
      traces.push({
        x: sl.flow,
        y: sl.pr,
        mode: 'lines',
        name: sl.label,
        line: { color: speedColors[idx % speedColors.length], width: 1.5 },
        hovertemplate: `<b>${sl.label}</b><br>Wc_norm: %{x:.3f}<br>PR: %{y:.2f}<extra></extra>`,
      })
    })

    // Surge line
    if (mapData.surge_line) {
      traces.push({
        x: mapData.surge_line.flow,
        y: mapData.surge_line.pr,
        mode: 'lines',
        name: 'Surge Line',
        line: { color: '#ff4444', width: 2, dash: 'dash' },
      })
    }

    return traces
  }

  // ── Throttle plot traces ─────────────────────────────────────────────────
  const buildThrottleTraces = (yKey, yName) => {
    if (!throttleData) return []
    return [{
      x:    throttleData.map(d => d.throttle_pct),
      y:    throttleData.map(d => d[yKey]),
      mode: 'lines+markers',
      name: yName,
      line: { color: mainColor, width: 2 },
      marker: { size: 5, color: mainColor },
      hovertemplate: `Throttle: %{x:.1f}%<br>${yName}: %{y:.2f}<extra></extra>`,
    }]
  }

  // ── Efficiency contour (eta on speed lines) ──────────────────────────────
  const buildEtaContour = () => {
    if (!mapData) return []
    const traces = []
    mapData.speed_lines.forEach((sl, idx) => {
      traces.push({
        x: sl.flow,
        y: sl.pr,
        z: sl.eta,
        type: 'scatter',
        mode: 'lines',
        name: sl.label,
        line: {
          color: sl.eta ? sl.eta.map(e => `hsl(${e * 120},80%,55%)`) : '#fff',
          width: 3,
          colorscale: 'Viridis',
        },
        customdata: sl.eta,
        hovertemplate: `<b>${sl.label}</b><br>Wc: %{x:.3f}<br>PR: %{y:.2f}<br>η_isen: %{customdata:.3f}<extra></extra>`,
      })
    })
    return traces
  }

  const InputRow = ({ label, field, type = 'number', step = 1, min, max }) => (
    <div>
      <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem',
        fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
        {label}
      </label>
      <input
        type={type}
        step={step}
        min={min}
        max={max}
        value={dpParams[field]}
        onChange={e => setDpParams({ ...dpParams, [field]: parseFloat(e.target.value) })}
        className="input-field"
        style={{ padding: '0.6rem 0.75rem', fontSize: '0.9rem' }}
      />
    </div>
  )

  const MetricBox = ({ label, value, unit, sub }) => (
    <div className="metric-card" style={{ padding: '0.8rem 1rem' }}>
      <div className="metric-label" style={{ fontSize: '0.7rem' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginTop: '0.3rem' }}>
        {value} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  )

  const plotStyle = { width: '100%' }
  const plotConfig = { responsive: true, displayModeBar: false }

  return (
    <div className="animate-in">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-text">Off-Design Solver</div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
            ITERATING COMPONENT MAPS...
          </p>
        </div>
      )}

      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>Off-Design Performance Analysis</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Compressor performance map, operating line, throttle sweep & surge margin analysis
          </p>
          <div className="status-badge">PARAMETRIC MAP MODEL</div>
        </div>
      </header>

      {/* ── Control Panel ─────────────────────────────────────────────── */}
      <section className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Design-Point Reference Parameters</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.25rem' }}>
          <InputRow label="Altitude [m]"              field="alt"  step={500}  min={0}   max={20000} />
          <InputRow label="Flight Mach Number"        field="mach" step={0.05} min={0}   max={1.5} />
          <InputRow label="Design OPR (πc)"           field="prc"  step={1}    min={2}   max={60} />
          <InputRow label="Design TIT [K]"            field="tit"  step={50}   min={600} max={2500} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Speed Lines:
            </label>
            <input type="number" min={4} max={12} value={mapConfig.n_speed_lines}
              onChange={e => setMapConfig({ ...mapConfig, n_speed_lines: parseInt(e.target.value) })}
              className="input-field" style={{ width: '70px', padding: '0.4rem 0.6rem' }} />
          </div>
          <button className="button-primary" onClick={handleRun}
            style={{ marginLeft: 'auto', padding: '0.7rem 2rem', fontSize: '0.9rem' }}>
            ▶ Run Off-Design Analysis
          </button>
        </div>
      </section>

      {/* ── View Toggle ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { id: 'compressor', label: 'Compressor Map' },
          { id: 'eta',        label: 'Efficiency Contours' },
          { id: 'throttle',   label: 'Throttle Performance' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            style={{
              padding: '0.5rem 1.25rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              fontFamily: 'var(--font-family)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: activeView === v.id ? 'var(--accent-color)' : 'transparent',
              color: activeView === v.id ? 'var(--bg-color)' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: activeView === v.id ? 'var(--accent-color)' : 'var(--surface-border)',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* ── Compressor Map ───────────────────────────────────────────── */}
      {activeView === 'compressor' && (
        <section className="card animate-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ marginBottom: '0.3rem' }}>Compressor Performance Map</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Pressure ratio vs. corrected mass flow normalised to design-point values.
                Dashed red line = surge boundary.
              </p>
            </div>
            <div className="status-badge">CORRECTED FLOW MAP</div>
          </div>
                <div style={{ background: isLight ? '#f8fafc' : '#000', borderRadius: '10px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
            {mapData ? (
              <Plot
                data={buildMapTraces()}
                layout={getLayout(theme, { 
                  xaxis: { title: 'Corrected Mass Flow (normalised)' },
                  yaxis: { title: 'Total Pressure Ratio' },
                  height: 450 
                })}
                style={plotStyle}
                useResizeHandler
                config={plotConfig}
              />
            ) : (
              <div style={{ height: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Click "Run Off-Design Analysis" to generate the compressor map.
              </div>
            )}
          </div>

          {/* Explanation card */}
          <div className="calculation-card" style={{ marginTop: '1.5rem' }}>
            <h4 style={{ color: 'var(--text-primary)', fontSize: '0.8rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
              MAP INTERPRETATION
            </h4>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              Each speed line represents constant <em>corrected</em> speed N/√θ. Points leftward of the surge
              line represent unstable operation with potential compressor stall or surge. The operating line
              (not shown) traces the locus of matched engine operating points from idle to maximum power.
              Surge margin SM = (PR_surge − PR_op) / PR_op is a critical design constraint.
            </p>
          </div>
        </section>
      )}

      {/* ── Efficiency Contours ──────────────────────────────────────── */}
      {activeView === 'eta' && (
        <section className="card animate-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3>Isentropic Efficiency Contours</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Peak efficiency locus and speed-line efficiency profile across the operating range.
              </p>
            </div>
          </div>
          <div style={{ background: isLight ? '#f8fafc' : '#000', borderRadius: '10px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
            {mapData ? (
              <Plot
                data={buildEtaContour()}
                layout={getLayout(theme, {
                  xaxis: { title: 'Corrected Mass Flow (normalised)' },
                  yaxis: { title: 'Total Pressure Ratio' },
                  height: 400,
                  coloraxis: { colorscale: 'Viridis', showscale: true },
                })}
                style={plotStyle}
                useResizeHandler
                config={plotConfig}
              />
            ) : (
              <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                Awaiting data...
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Throttle Sweep ───────────────────────────────────────────── */}
      {activeView === 'throttle' && (
        <div className="animate-in">
          {/* Summary metrics */}
          {throttleData && throttleData.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <MetricBox label="Max Spec. Thrust" value={Math.max(...throttleData.map(d => d.spec_thrust)).toFixed(1)} unit="N·s/kg" sub="At 100% throttle" />
              <MetricBox label="Idle Spec. Thrust" value={Math.min(...throttleData.filter(d => d.spec_thrust > 0).map(d => d.spec_thrust)).toFixed(1)} unit="N·s/kg" sub="At ~55% throttle" />
              <MetricBox label="Min TSFC" value={(Math.min(...throttleData.map(d => d.tsfc || 999))).toFixed(3)} unit="mg/N·s" sub="Cruise optimum" />
              <MetricBox label="Surge Points" value={throttleData.filter(d => d.surge).length} unit="" sub="Points near surge boundary" />
            </div>
          )}

          <section className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem' }}>Throttle Sweep Performance Curve</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Label style={{ margin: 0 }}>Y1:</Label>
                  <select value={mapY1} onChange={e => { setMapY1(e.target.value); setPlotRevision(r => r + 1) }} className="input-field" style={{ padding: '0.3rem', fontSize: '0.72rem', width: '130px' }}>
                    <option value="tsfc">TSFC (mg/N·s)</option>
                    <option value="spec_thrust">Specific Thrust</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Label style={{ margin: 0 }}>Y2:</Label>
                  <select value={mapY2} onChange={e => { setMapY2(e.target.value); setPlotRevision(r => r + 1) }} className="input-field" style={{ padding: '0.3rem', fontSize: '0.72rem', width: '130px' }}>
                    <option value="pr">Pressure Ratio</option>
                    <option value="eta_thermal">η_thermal</option>
                    <option value="eta_overall">η_overall</option>
                    <option value="tt4">TIT (Temperature)</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ background: isLight ? '#f8fafc' : '#000', borderRadius: '8px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
              {throttleData ? (
                <Plot
                  revision={plotRevision}
                  data={[
                    { x: throttleData.map(d => d.throttle_pct), y: throttleData.map(d => d[mapY1]), name: `${mapY1.toUpperCase()}`, yaxis: 'y1', type: 'scatter', line: { color: mainColor, width: 2.5 } },
                    { x: throttleData.map(d => d.throttle_pct), y: throttleData.map(d => d[mapY2] * (mapY2 === 'pr' ? 1 : (mapY2 === 'tt4' ? 1 : 100))), name: `${mapY2.toUpperCase()}${mapY2.includes('eta') ? ' (%)' : ''}`, yaxis: 'y2', type: 'scatter', line: { color: isLight ? '#475467' : '#888', dash: 'dash' } },
                  ]}
                  layout={getLayout(theme, { 
                    xaxis: ax(theme, 'Throttle Position (%)'),
                    yaxis: ax(theme, `${mapY1.toUpperCase()} Value`),
                    yaxis2: { overlaying: 'y', side: 'right', showgrid: false },
                    height: 400,
                    legend: { orientation: 'h', y: -0.2 }
                  })}
                  style={plotStyle} useResizeHandler config={plotConfig}
                />
              ) : <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Generate performance deck to view plots</div>}
            </div>
          </section>

          {/* Tabular data */}
          {throttleData && (
            <section className="card" style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3>Engine Performance Deck</h3>
                <button
                  className="button-primary"
                  style={{ fontSize: '0.8rem', padding: '0.5rem 1.2rem', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
                  onClick={() => {
                    const headers = 'Throttle%,PR,TIT(K),Spec.Thrust(N·s/kg),TSFC(mg/N·s),η_c,η_t,η_thermal,η_overall,Surge'
                    const rows = throttleData.map(d =>
                      `${d.throttle_pct},${d.pr},${d.tt4},${d.spec_thrust},${d.tsfc},${d.eta_c},${d.eta_t},${d.eta_thermal},${d.eta_overall},${d.surge}`
                    ).join('\n')
                    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a'); a.href = url; a.download = 'engine_deck.csv'; a.click()
                  }}
                >
                  Export Engine Deck CSV
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      {['Throttle', 'PR', 'TIT [K]', 'Sp. Thrust [N·s/kg]', 'TSFC [mg/N·s]', 'η_isen_c', 'η_isen_t', 'η_thermal', 'η_overall', 'Surge Risk'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.68rem' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {throttleData.map((d, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--surface-border)', background: d.surge ? 'rgba(255,68,68,0.1)' : 'transparent' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 700 }}>{d.throttle_pct}%</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{d.pr?.toFixed(2)}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{d.tt4?.toFixed(0)}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{d.spec_thrust?.toFixed(1)}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{d.tsfc?.toFixed(3)}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{d.eta_c?.toFixed(3)}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{d.eta_t?.toFixed(3)}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{d.eta_thermal?.toFixed(3)}</td>
                        <td style={{ padding: '0.5rem 0.75rem' }}>{d.eta_overall?.toFixed(3)}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: d.surge ? '#ff4444' : '#555' }}>
                          {d.surge ? 'SURGE_LIMIT' : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
