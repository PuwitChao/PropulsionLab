import React, { useState, useEffect } from 'react'
import API_BASE_URL from './api'
import './index.css'
import MissionAnalysis from './pages/MissionAnalysis'
import ParametricCycle from './pages/ParametricCycle'
import RocketAnalysis from './pages/RocketAnalysis'
import PerformanceMap from './pages/PerformanceMap'
import Settings from './pages/Settings'

// ── Nav items ────────────────────────────────────────────────────────────────
const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'System overview and performance metrics',
  },
  {
    id: 'on-design',
    label: 'Gas Turbine: On-Design',
    description: 'Turbojet and turbofan cycle analysis',
    category: 'GAS TURBINE',
  },
  {
    id: 'off-design',
    label: 'Gas Turbine: Off-Design',
    description: 'Compressor matching and throttle sweep',
    category: 'GAS TURBINE',
  },
  {
    id: 'mission',
    label: 'Mission Analysis',
    description: 'Constraint synthesis and range modeling',
    category: 'AIRCRAFT',
  },
  {
    id: 'rocket',
    label: 'Rocket Propulsion',
    description: 'Chemical equilibrium and sizing',
    category: 'ROCKET',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'User preferences & interface control',
    category: 'SYSTEM',
  },
]

// ── Dashboard content ────────────────────────────────────────────────────────
const MODULE_FEATURES = [
  {
    tab:   'on-design',
    title: 'Gas Turbine Cycle Analysis',
    body:  'Thermodynamic cycle solver for turbojet and separate-exhaust turbofan architectures. Supports on-design parametric sweeps with polytropic efficiency modeling and station-by-station property accounting.',
    tags:  ['Turbojet', 'Turbofan', 'Efficiency Audit', 'T-s Path'],
  },
  {
    tab:   'off-design',
    title: 'Off-Design Mapping',
    body:  'Component matching algorithm using parametric compressor and turbine maps. Enables throttle sweep analysis, engine deck generation, and surge margin evaluation across the operating envelope.',
    tags:  ['Compressor Map', 'Surge Boundary', 'Throttle Sweep', 'Engine Deck'],
  },
  {
    tab:   'rocket',
    title: 'Rocket Propulsion Analysis',
    body:  'Predictive modeling for chemical propulsion systems including equilibrium composition, Bartz heat transfer distribution, altitude performance, and Method of Characteristics nozzle contouring.',
    tags:  ['Equilibrium', 'Heat Flux', 'Engine Sizing', 'MoC Nozzle'],
  },
  {
    tab:   'mission',
    title: 'Mission Constraint Synthesis',
    body:  'Multi-point constraint analysis evaluating thrust-to-weight and wing-loading requirements for aircraft mission profiles including takeoff, climb, cruise, and sustained maneuvers.',
    tags:  ['T/W Constraints', 'W/S Sizing', 'Mission Profile', 'Design Point'],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [activeTab,      setActiveTab]      = useState('dashboard')
  const [backendStatus,  setBackendStatus]  = useState('CHECKING')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/health`)
        const data = await res.json()
        setBackendStatus(data.status === 'healthy' ? 'ONLINE' : 'ERROR')
      } catch {
        setBackendStatus('OFFLINE')
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const online = backendStatus === 'ONLINE'

  const groups = {}
  navItems.forEach(item => {
    const g = item.category || '_top'
    if (!groups[g]) groups[g] = []
    groups[g].push(item)
  })

  const renderContent = () => {
    switch (activeTab) {
      case 'on-design':  return <ParametricCycle />
      case 'off-design': return <PerformanceMap />
      case 'mission':    return <MissionAnalysis />
      case 'rocket':     return <RocketAnalysis />
      case 'settings':   return <Settings />
      default:           return <Dashboard status={backendStatus} onNavigate={setActiveTab} />
    }
  }

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: 'var(--bg-color)' }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="sidebar" style={{ width: sidebarCollapsed ? '56px' : undefined }}>
        <div>
          <div className="logo" style={{ marginBottom: '3rem', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
            {!sidebarCollapsed && 'PROPULSION_LAB'}
            {sidebarCollapsed && 'PL'}
          </div>

          <nav className="nav-links">
            {Object.entries(groups).map(([groupKey, items]) => (
              <div key={groupKey}>
                {groupKey !== '_top' && !sidebarCollapsed && (
                  <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.15em',
                    textTransform: 'uppercase', padding: '1.25rem 1rem 0.5rem', borderTop: '1px solid var(--surface-border)', marginTop: '0.5rem' }}>
                    {groupKey}
                  </div>
                )}
                {items.map(item => (
                  <div
                    key={item.id}
                    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    title={sidebarCollapsed ? item.label : ''}>
                    {!sidebarCollapsed && <span>{item.label}</span>}
                    {sidebarCollapsed && <span>{item.label.charAt(0)}</span>}
                  </div>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--surface-border)', paddingTop: '1.5rem' }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-muted)',
              fontFamily: 'var(--font-family)', fontSize: '0.65rem', cursor: 'pointer', textAlign: 'left',
              padding: '0.5rem 0', marginBottom: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {sidebarCollapsed ? 'Expand' : 'Collapse View'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%',
              background: online ? '#4ade80' : '#f87171' }} />
            {!sidebarCollapsed && (
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                API {backendStatus}
              </span>
            )}
          </div>

          {!sidebarCollapsed && (
            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Resources</div>
              <a href="/DOCUMENTATION.md" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '0.72rem', color: 'var(--accent-color)', textDecoration: 'none', marginBottom: '0.4rem', fontWeight: 600 }}>Documentation Guide</a>
              <a href="/ARCHITECTURE_WIKI.md" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '0.72rem', color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 600 }}>Technical Wiki</a>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

function Dashboard({ status, onNavigate }) {
  const online = status === 'ONLINE'

  return (
    <div className="animate-in">
      <header style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2.2rem', margin: 0, letterSpacing: '-0.02em' }}>Propulsion Analysis Suite</h1>
          <div className="status-badge" style={{ fontSize: '0.65rem', background: 'transparent', borderColor: 'var(--surface-border)' }}>
            STATUS: {online ? 'READY' : 'CONNECTION_ERROR'}
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '750px', lineHeight: 1.7 }}>
          A computationally rigorous engineering environment for aerospace propulsion systems. 
          Integrating thermodynamic cycle analysis, chemical equilibrium combustion modeling, 
          and mission-level constraint synthesis within a unified SI framework.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {MODULE_FEATURES.map(card => (
          <div
            key={card.tab}
            className="card"
            style={{ cursor: 'pointer', padding: '1.75rem' }}
            onClick={() => onNavigate(card.tab)}>
            <div style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-primary)', letterSpacing: '0.05em' }}>{card.title}</h3>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem', minHeight: '3.2rem' }}>
              {card.body}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {card.tags.map(t => (
                <span key={t} style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
                  padding: '0.3rem 0.6rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', borderRadius: '2px', color: 'var(--text-muted)' }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          <div>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Technical Scope & Methodology</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>System Modeling</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Cycle analysis is performed using component-based thermodynamic states. Polytropic efficiencies are utilized to account for aerodynamic losses.
                </p>
              </div>
              <div>
                <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Equilibrium Chemisty</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Rocket performance is derived from minimized Gibbs free energy solvers, integrating species distribution and shifting Isp estimations.
                </p>
              </div>
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--surface-border)', paddingLeft: '3rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Project Resources</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Access deep technical documentation and the architectural roadmap for the Propulsion Analysis Suite.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="/DOCUMENTATION.md" target="_blank" rel="noopener noreferrer" className="button-primary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.6rem 1.25rem' }}>
                View User Guide
              </a>
              <a href="/ARCHITECTURE_WIKI.md" target="_blank" rel="noopener noreferrer" className="button-primary" style={{ textDecoration: 'none', fontSize: '0.75rem', padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}>
                System Wiki
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
