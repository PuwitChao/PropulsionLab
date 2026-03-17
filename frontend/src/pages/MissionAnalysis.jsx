import React, { useState, useEffect } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'
import { useSettings } from '../context/SettingsContext'
import { getLayout, ax } from '../utils/chartUtils'

const MissionAnalysis = () => {
  const { theme } = useSettings();
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showMethodology, setShowMethodology] = useState(false)
  const [data, setData] = useState(null)
  const [prevData, setPrevData] = useState(null)
  const [constraints, setConstraints] = useState([
    { type: 'level', label: 'Cruise (M0.8 @ 10km)', alt: 10000, mach: 0.8 },
    { type: 'ps', label: 'Ps=50 (M0.9 @ 5km)', alt: 5000, mach: 0.9, ps: 50 },
    { type: 'turn', label: '3G Turn (M0.7 @ 3km)', alt: 3000, mach: 0.7, n: 3 },
    { type: 'takeoff', label: 'Takeoff (1200m)', sto: 1200, cl_max: 2.0 },
    { type: 'ceiling', label: 'Service Ceiling (15km)', alt: 15000, mach: 0.8 }
  ])
  const [comparisonMode, setComparisonMode] = useState(false)
  const [aircraftData, setAircraftData] = useState({
    k: 0.1,
    cd0: 0.02,
    cl_max: 2.0
  })

  const saveToComparison = () => {
    setPrevData(data)
    setComparisonMode(true)
  }

  // Debounced auto-solve
  useEffect(() => {
    const timer = setTimeout(() => {
      runAnalysis()
    }, 800)
    return () => clearTimeout(timer)
  }, [aircraftData, constraints])

  const runAnalysis = async () => {
    setLoading(true)
    setProgress(30)
    try {
      const result = await fetchData('/analyze/mission', {
        method: 'POST',
        body: JSON.stringify({
          aircraft_data: aircraftData,
          constraints: constraints,
          ws_min: 1000,
          ws_max: 8000,
          ws_steps: 80
        })
      })
      setProgress(100)
      setData(result)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 400)
    }
  }

  const isLight = theme === 'light';
  const colors = isLight ? ['#0f172a', '#475569', '#64748b', '#94a3b8', '#cbd5e1'] : ['#ffffff', '#888888', '#cccccc', '#444444', '#aaaaaa'];

  const plotData = []
  if (data && data.series) {
    data.series.forEach((s, idx) => {
      plotData.push({
        x: data.ws || [],
        y: s.values || [],
        name: s.label || 'Unnamed',
        type: 'scatter',
        mode: 'lines',
        line: { width: 2, color: colors[idx % colors.length] }
      })
    })
    
    if (comparisonMode && prevData && prevData.series) {
      prevData.series.forEach((s, idx) => {
        plotData.push({
          x: prevData.ws || [],
          y: s.values || [],
          name: `Baseline: ${s.label}`,
          type: 'scatter',
          mode: 'lines',
          line: { width: 1.5, color: colors[idx % colors.length], dash: 'dot' },
          opacity: 0.3
        })
      })
    }
  }

  return (
    <div className="animate-in">
      {loading && (
        <div className="loading-overlay">
          <div className="loading-text">Mission Architecture Optimizer</div>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
          <p style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem', letterSpacing: '0.1em' }}>
            CONSTRUCTING OPTIMUM DESIGN CORNER...
          </p>
        </div>
      )}

      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem', fontSize: '1.8rem' }}>Mission Matching & Constraint Analysis</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Aircraft sizing & multi-point performance constraint mapping</p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="button-primary" style={{ background: comparisonMode ? 'var(--surface-hover)' : 'var(--accent-color)', color: comparisonMode ? 'var(--text-primary)' : 'var(--btn-text)' }} onClick={saveToComparison}>
              {comparisonMode ? 'Update Baseline' : 'Set Baseline'}
            </button>
            <button className="button-primary" style={{ background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }} onClick={() => setComparisonMode(!comparisonMode)}>
              {comparisonMode ? 'Disable Comparison' : 'Compare Mode'}
            </button>
          </div>
        </div>
      </header>

      {showMethodology && (
        <section className="card animate-in" style={{ borderLeft: '4px solid var(--accent-color)' }}>
          <h3 style={{ borderBottom: '1px solid var(--surface-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
            Sizing Methodology
          </h3>
          <div className="grid">
            <div className="calculation-card">
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '0.9rem', letterSpacing: '0.1em' }}>THE MASTER CONSTRAINT EQUATION</h4>
              <p>For any mission segment, the required Thrust-to-Weight (T/W) is solved as a function of Wing Loading (W/S):</p>
              <div className="equation">T/W = β/α * [ (q·CD₀)/(β·W/S) + (k·β·n²)/(q·W/S) + G/V ]</div>
              <p style={{ fontSize: '0.85rem' }}>The corner of the resulting feasible region defines the minimum weight aircraft that meets all specific mission requirements (Cruise, Turn, Takeoff).</p>
            </div>
          </div>
        </section>
      )}

      {data && (
        <section className="card animate-in" style={{ borderTop: '4px solid var(--accent-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
            <h3>Constraint Trace: Design Sensitivity</h3>
            <div className="status-badge">PARAMETRIC VERIFICATION</div>
          </div>
          <div className="grid">
            <div className="calculation-card">
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '0.8rem', letterSpacing: '0.1em' }}>SAMPLE POINT (W/S = 5000 N/m²)</h4>
              <p>For a baseline Wing Loading, the required T/W is calculated across all segments:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                {(data?.series || []).slice(0, 3).map((s, idx) => (
                  <div key={idx} style={{ padding: '1rem', background: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>{s.label}</div>
                    <div className="equation" style={{ fontSize: '1rem', margin: 0 }}>{'T/W = ' + (s.values[Math.floor(s.values.length/2)]?.toFixed(3) || '—')}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="calculation-card">
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '0.8rem', letterSpacing: '0.1em' }}>AERODYNAMIC DRAG BREAKDOWN</h4>
              <p>The total drag polar is computed as:</p>
              <div className="equation">CD = CD₀ + k · CL²</div>
              <p style={{ marginTop: '1rem' }}>With current inputs:</p>
              <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem' }}>
                <li>Parasite CD₀: {aircraftData.cd0}</li>
                <li>Induced k: {aircraftData.k}</li>
                <li>CL_max: {aircraftData.cl_max}</li>
              </ul>
            </div>
            
            <div className="calculation-card">
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '0.8rem', letterSpacing: '0.05em' }}>CLIMB & ACCELERATION (Ps)</h4>
              <p>For combat/climb constraints, Specific Excess Power (Ps) adds a potential energy term:</p>
              <div className="equation">Ps = V [ T/W - D/W ]</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>This shifts the T/W boundary upward to ensure energy gain capability.</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid">
         <section className="card" style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3>Master Requirement Constraint Diagram</h3>
            <div className="status-badge">OPTIMUM DESIGN CORNER</div>
          </div>
          <div style={{ background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--surface-border)', padding: '0.25rem' }}>
            {data ? (
              <Plot
                data={[
                  ...plotData,
                  {
                    x: [data.optimum?.ws],
                    y: [data.optimum?.tw],
                    name: 'Optimum Design Corner',
                    mode: 'markers',
                    marker: { color: 'var(--accent-color)', size: 12, symbol: 'cross', line: { color: 'var(--bg-color)', width: 2 } },
                    type: 'scatter'
                  }
                ]}
                layout={getLayout(theme, {
                  xaxis: ax(theme, 'Wing Loading (W/S) [N/m²]'),
                  yaxis: { ...ax(theme, 'Thrust-to-Weight (T/W)'), range: [0, 1.2] },
                  margin: { l: 52, r: 20, t: 24, b: 52 },
                  legend: { orientation: 'h', y: -0.2, font: { size: 8 } },
                  hovermode: 'closest',
                  height: 450,
                })}
                style={{ width: '100%' }}
                useResizeHandler={true}
                config={{ responsive: true, displayModeBar: false }}
              />
            ) : (
              <div style={{ height: '450px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', letterSpacing: '0.1em', fontSize: '0.8rem' }}>
                <div className="pulsate">SYNTHESIZING DESIGN BOUNDARIES...</div>
              </div>
            )}
          </div>
        </section>

        <section className="card" style={{ gridColumn: 'span 1' }}>
          <h3>Design Corner Logic</h3>
          {data?.optimum ? (
            <div className="metric-container" style={{ marginTop: '2rem' }}>
              <div className="metric-card">
                 <div className="metric-label">Min. Thrust/Weight</div>
                 <div className="metric-value">{data.optimum.tw.toFixed(3)}</div>
                 {comparisonMode && prevData?.optimum && (
                   <div style={{ fontSize: '0.8rem', color: data.optimum.tw < prevData.optimum.tw ? '#4ade80' : '#f87171' }}>
                     {data.optimum.tw < prevData.optimum.tw ? '↑ Efficiency' : '↓ Loss'}
                   </div>
                 )}
              </div>
              <div className="metric-card" style={{ borderLeftColor: 'var(--surface-border)' }}>
                 <div className="metric-label">Opt. Wing Loading</div>
                 <div className="metric-value">{data.optimum.ws?.toFixed(0)} <span className="metric-unit">Pa</span></div>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                The corner point represents the most efficient (minimum weight) aircraft configuration that satisfies all mission constraints simultaneously.
              </p>
            </div>
          ) : <p>Generating solution...</p>}
        </section>

        <section className="card">
          <h3>Aircraft Configuration</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: '2rem' }}>Modify aerodynamic coefficients for the baseline airframe</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>
                Induced Drag Coefficient (k)
              </label>
              <input 
                type="number" 
                value={aircraftData.k} 
                onChange={e => setAircraftData({...aircraftData, k: parseFloat(e.target.value)})}
                className="input-field"
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>
                Zero-Lift Drag (CD0)
              </label>
              <input 
                type="number" 
                value={aircraftData.cd0} 
                onChange={e => setAircraftData({...aircraftData, cd0: parseFloat(e.target.value)})}
                className="input-field"
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.1em' }}>
                Clean CL_max
              </label>
              <input 
                type="number" 
                value={aircraftData.cl_max} 
                onChange={e => setAircraftData({...aircraftData, cl_max: parseFloat(e.target.value)})}
                className="input-field"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default MissionAnalysis
