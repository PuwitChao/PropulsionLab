import { useState, useEffect, lazy, Suspense } from 'react'
import API_BASE_URL, { fetchData } from './api'
import './index.css'
import ErrorBoundary from './components/ErrorBoundary'

// Page bundles are loaded on demand. The analysis pages each pull in Plotly
// (~4.9 MB), so route-level code splitting keeps it out of the initial shell
// and only fetches it when a chart page is actually opened.
const MissionAnalysis = lazy(() => import('./pages/MissionAnalysis'))
const ParametricCycle = lazy(() => import('./pages/ParametricCycle'))
const RocketAnalysis = lazy(() => import('./pages/RocketAnalysis'))
const PerformanceMap = lazy(() => import('./pages/PerformanceMap'))
const Settings = lazy(() => import('./pages/Settings'))
const Diagnostics = lazy(() => import('./pages/Diagnostics'))

// ── Nav items ────────────────────────────────────────────────────────────────
const navItems = [
  { id: 'dashboard', label: 'Mainframe', icon: 'grid_view', category: '_ROOT' },
  { id: 'on-design', label: 'Cycle_Solver', icon: 'cyclone', category: 'THERMODYNAMICS' },
  { id: 'off-design', label: 'Map_Matching', icon: 'schema', category: 'THERMODYNAMICS' },
  { id: 'rocket', label: 'Chamber_CEA', icon: 'rocket', category: 'PROPULSION' },
  { id: 'mission', label: 'Size_Synth', icon: 'analytics', category: 'OPERATIONS' },
  { id: 'diagnostics', label: 'Fault_Isolation', icon: 'biotech', category: 'PROPULSION' },
  { id: 'settings', label: 'Environment', icon: 'settings', category: 'SYSTEM' },
]

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [backendStatus, setBackendStatus] = useState('CHECKING')
  const [sessionDuration, setSessionDuration] = useState('00:00:00')
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour12: false }))

  // Record session start in sessionStorage on first load (lazy useState init runs once)
  const [sessionStart] = useState(() => {
    const stored = sessionStorage.getItem('session_start')
    if (!stored) {
      const now = Date.now().toString()
      sessionStorage.setItem('session_start', now)
      return parseInt(now)
    }
    return parseInt(stored)
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-GB', { hour12: false }))
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000)
      const h = String(Math.floor(elapsed / 3600)).padStart(2, '0')
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
      const s = String(elapsed % 60).padStart(2, '0')
      setSessionDuration(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(timer)
  }, [sessionStart])

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const data = await fetchData('/health')
        setBackendStatus(data.status === 'healthy' ? 'STABLE' : 'DEGRADED')
      } catch {
        setBackendStatus('OFFLINE')
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const renderPage = () => {
    switch (activeTab) {
      case 'on-design': return <ParametricCycle />
      case 'off-design': return <PerformanceMap />
      case 'mission': return <MissionAnalysis />
      case 'rocket': return <RocketAnalysis />
      case 'settings': return <Settings />
      case 'diagnostics': return <Diagnostics />
      default: return <Dashboard status={backendStatus} onNavigate={setActiveTab} />
    }
  }

  const renderContent = () => (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-xs uppercase tracking-widest opacity-60">
        Loading module...
      </div>
    }>
      {renderPage()}
    </Suspense>
  )

  return (
    <div className="app-shell flex w-full min-h-screen bg-surface selection:bg-white selection:text-black">
      {/* ── Mobile Sidebar Overlay ── */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden animate-in fade-in"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <nav className={`app-sidebar fixed top-0 bottom-0 h-full w-[280px] z-50 flex flex-col pt-12 bg-surface border-r border-white/10 transition-all duration-300 ${
        mobileSidebarOpen ? 'left-0' : '-left-[280px] lg:left-0'
      }`}>
        <div className="px-12 mb-16">
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 bg-accent-cyan"></div>
             <h1 className="text-[15px] font-black tracking-[0.4em] text-white font-headline">PROPULSION</h1>
          </div>
          <p className="text-[10px] tracking-[0.3em] text-white/30 mt-4 font-mono border-l border-white/20 pl-4">PROPULSION_SYS_V2.2.0</p>
        </div>
        
        <div className="app-sidebar-nav flex flex-col flex-grow px-6 space-y-1 overflow-y-auto custom-scrollbar">
          {['_ROOT', 'THERMODYNAMICS', 'PROPULSION', 'OPERATIONS', 'SYSTEM'].map(cat => (
            <div key={cat} className="app-sidebar-section mb-6">
                <span className="text-[9px] font-bold text-white/25 tracking-[0.4em] px-6 mb-3 block uppercase font-mono">{cat === '_ROOT' ? '' : cat}</span>
                {navItems.filter(i => i.category === cat).map(item => (
                    <button
                        key={item.id}
                        id={`nav-${item.id}`}
                        onClick={() => { setActiveTab(item.id); setMobileSidebarOpen(false); }}
                        className={`w-full flex items-center gap-5 px-6 py-[13px] transition-all duration-200 group relative font-headline ${
                            activeTab === item.id
                            ? 'nav-item-active'
                            : 'text-white/45 hover:text-white/80 hover:bg-white/[0.025]'
                        }`}
                        aria-current={activeTab === item.id ? 'page' : undefined}
                        >
                        {/* Left accent bar */}
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] transition-all duration-200 ${
                            activeTab === item.id
                            ? 'h-7 bg-accent-cyan opacity-90'
                            : 'h-0 bg-accent-cyan opacity-0 group-hover:h-4 group-hover:opacity-40'
                        }`} />
                        <span className={`material-symbols-outlined !text-[18px] transition-all duration-200 ${
                            activeTab === item.id ? 'opacity-90' : 'opacity-45 group-hover:opacity-75'
                        }`}>{item.icon}</span>
                        <span className={`uppercase tracking-[0.18em] text-[10.5px] transition-all duration-200 ${
                            activeTab === item.id ? 'font-bold opacity-100' : 'font-semibold opacity-80'
                        }`}>{item.label}</span>
                    </button>
                ))}
            </div>
          ))}
        </div>

        <div className="px-10 py-8 border-t border-white/[0.07] shrink-0">
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/25">Session</span>
                <span className="font-mono text-[11px] text-white/60 tabular-nums">{sessionDuration}</span>
             </div>
          </div>
        </div>
      </nav>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="app-header fixed top-0 right-0 left-0 lg:left-[280px] h-20 z-40 flex items-center justify-between px-6 lg:px-12 bg-surface/80 backdrop-blur-2xl border-b border-white/[0.07]" style={{boxShadow: '0 1px 0 rgba(255,255,255,0.04)'}}>
        <div className="flex items-center gap-4 lg:gap-12">
          <button
            onClick={() => setMobileSidebarOpen(o => !o)}
            className="lg:hidden flex items-center justify-center w-9 h-9 text-white border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            <span className="material-symbols-outlined !text-[18px]">{mobileSidebarOpen ? 'close' : 'menu'}</span>
          </button>
          <div className="flex items-center gap-4 lg:gap-6">
            <span className="hidden sm:inline w-5 h-[1px] bg-white/20"></span>
            <span className="uppercase tracking-[0.35em] text-[11px] font-bold text-white/80 font-headline">
              {activeTab === 'dashboard' ? 'MAIN_TERMINAL' : `${activeTab.replace('-', '_').toUpperCase()}_NODE`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-5 lg:gap-10">
          <div className="flex gap-5 lg:gap-10 items-center">
             <div className="hidden sm:flex flex-col items-end gap-1">
                <span className="text-[9px] font-mono tracking-[0.3em] text-white/25 uppercase">System_Time</span>
                <span className="text-[11px] font-mono text-white/60 tabular-nums">{time}</span>
             </div>
             <div className="hidden sm:block h-7 w-[1px] bg-white/[0.07]"></div>
             <div className="flex flex-col items-end lg:pr-4 gap-1">
               <span className="text-[9px] font-mono tracking-[0.3em] text-white/25 uppercase">Status</span>
               <div className="flex items-center gap-2">
                 <div className={`w-[6px] h-[6px] transition-all ${backendStatus === 'STABLE' ? 'bg-accent-cyan/80 status-dot-online' : backendStatus === 'CHECKING' ? 'bg-white/30 animate-pulse' : 'warning-marker animate-pulse'}`}></div>
                 <span className={`text-[10px] font-mono tracking-[0.25em] uppercase ${backendStatus === 'OFFLINE' ? 'warning-text' : backendStatus === 'STABLE' ? 'text-accent-cyan/80' : 'text-white/65'}`}>{backendStatus}</span>
               </div>
             </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <main className="app-main ml-0 lg:ml-[280px] mt-20 p-6 lg:p-16 w-full lg:w-[calc(100%-280px)] h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide grid-bg">
        <div className="max-w-[1400px] mx-auto">
            <ErrorBoundary key={activeTab}>
                {renderContent()}
            </ErrorBoundary>
        </div>
      </main>

      {/* ── Footer Status ───────────────────────────────────────────── */}
      <footer className="app-footer fixed bottom-0 right-0 left-0 lg:left-[280px] h-10 bg-surface/80 backdrop-blur border-t border-white/[0.06] flex items-center px-6 lg:px-12 justify-between z-40">
        <div className="flex gap-6 lg:gap-16 items-center">
            <div className="flex gap-2 lg:gap-3 items-center">
                <span className="text-[9px] font-mono text-white/18 uppercase tracking-[0.3em]">KERNEL</span>
                <span className="font-mono text-[10px] text-white/35">CANTERA_V3.0.x</span>
            </div>
            <div className="hidden md:flex gap-3 items-center">
                <span className="text-[9px] font-mono text-white/18 uppercase tracking-[0.3em]">BUILD</span>
                <span className="font-mono text-[10px] text-white/35 uppercase">PROPULSION_SUITE_V2.2.0</span>
            </div>
        </div>
        <div className="flex gap-4 lg:gap-8 items-center">
            <span className="font-mono text-[10px] text-white/18 tracking-[0.15em] tabular-nums">{time} // LOCAL</span>
            <div className="flex gap-[5px]">
                <div className={`w-[5px] h-[5px] ${backendStatus === 'STABLE' ? 'bg-white/50' : 'warning-marker opacity-50'}`}></div>
                <div className="w-[5px] h-[5px] bg-white/15"></div>
                <div className="w-[5px] h-[5px] bg-white/05"></div>
            </div>
        </div>
      </footer>
    </div>
  )
}

function Dashboard({ status, onNavigate }) {
  const features = [
    { id: 'on-design', title: 'CYCLE_SOLVER', specs: 'TURBOJET // TURBOFAN', code: 'MOD_01', desc: 'On-design parametric cycle decomposition with station-based property analysis.' },
    { id: 'off-design', title: 'MAP_MATCHING', specs: 'THROTTLE // SURGE', code: 'MOD_02', desc: 'Non-linear component matching across the entire operating envelope.' },
    { id: 'rocket', title: 'CHAMBER_CEA', specs: 'ROCKET // MOC', code: 'MOD_03', desc: 'Propellant synthesis and method of characteristics nozzle contouring.' },
    { id: 'mission', title: 'SIZE_SYNTHESIS', specs: 'CONSTRAINT // MISSION', code: 'MOD_04', desc: 'Multi-point aircraft sizing and constraint visualization.' },
    { id: 'diagnostics', title: 'FAULT_ISOLATION', specs: 'SENSORS // DIAGNOSTICS', code: 'MOD_05', desc: 'Model-based thermodynamic engine fault diagnostics and sensor isolation.' }
  ]

  return (
    <div className="space-y-16 animate-in">
      {/* Hero Banner */}
      <section className="bg-surface-container-low border border-white/[0.07] p-14 lg:p-20 relative overflow-hidden" style={{boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)'}}>
        <div className="panel-accent"></div>
        {/* Single subtle ambient glow - controlled, not scattered */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[200px] bg-white/[0.018] blur-[80px] pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-3">
            <span className="font-mono text-[9px] tracking-[0.5em] text-white/25 uppercase">PROPULSION_SUITE_V2.2.0</span>
          </div>
          <div className="flex items-start gap-6 mb-10">
            <div className="w-1 h-12 bg-white/40 mt-1 shrink-0"></div>
            <h1 className="text-3xl lg:text-5xl font-black tracking-[0.25em] text-white leading-none">PROPULSION_LAB</h1>
          </div>
          <p className="text-white/40 font-body text-[13px] leading-relaxed max-w-3xl tracking-[0.04em] normal-case">
            A computationally rigorous engineering environment for aerospace propulsion systems.
            Integrating thermodynamic cycle analysis, chemical equilibrium combustion modeling,
            and mission-level constraint synthesis within a unified SI framework.
          </p>
        </div>
      </section>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.id}
            id={`feature-${f.id}`}
            onClick={() => onNavigate(f.id)}
            className="group bg-surface-container-low border border-white/[0.07] hover:border-accent-cyan/20 hover:bg-surface-container transition-all duration-300 p-12 cursor-pointer flex flex-col justify-between h-[320px] relative overflow-hidden"
            style={{transition: 'border-color 0.25s ease, background-color 0.25s ease, box-shadow 0.25s ease'}}
          >
            {/* Corner accent top-left */}
            <div className="absolute top-0 left-0 w-8 h-[1px] bg-white/20 group-hover:w-16 group-hover:bg-accent-cyan/60 transition-all duration-300"></div>
            <div className="absolute top-0 left-0 w-[1px] h-8 bg-white/20 group-hover:h-16 group-hover:bg-accent-cyan/60 transition-all duration-300"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                 <div>
                    <span className="text-[9px] font-mono text-white/20 tracking-[0.4em] mb-3 block">{f.code}</span>
                    <h3 className="text-[13px] font-bold tracking-[0.35em] text-white/90 group-hover:text-accent-cyan transition-colors duration-200">{f.title}</h3>
                 </div>
                 <span className="material-symbols-outlined text-white/12 group-hover:text-accent-cyan/65 transition-all duration-300 !text-[20px] group-hover:translate-x-[2px] group-hover:translate-y-[-2px]">north_east</span>
              </div>
              <p className="text-white/35 font-body text-[12px] leading-[1.75] tracking-[0.02em] normal-case mb-8 group-hover:text-white/55 transition-colors duration-200">
                {f.desc}
              </p>
            </div>
            <div className="pt-6 border-t border-white/[0.07] group-hover:border-accent-cyan/15 flex justify-between items-center relative z-10 transition-all duration-200">
               <span className="text-[10px] font-mono text-white/35 uppercase tracking-[0.2em] group-hover:text-white/60 transition-colors duration-200">{f.specs}</span>
               <div className="w-[10px] h-[10px] border border-white/20 group-hover:bg-accent-cyan/80 group-hover:border-accent-cyan transition-all duration-200"></div>
            </div>
          </div>
        ))}
      </div>
      
      <section className="border border-white/10 p-16 bg-surface-container-lowest relative">
         <div className="flex items-center justify-between mb-16 border-b border-white/10 pb-10">
            <div className="flex items-center gap-8">
                <span className="material-symbols-outlined !text-[24px] text-white/60">database</span>
                <h3 className="text-[14px] font-black tracking-[0.4em]">SYSTEM_RESOURCES</h3>
            </div>
            <span className="text-[11px] mono text-white/20">ROOT // NODE_01</span>
         </div>
         <div className="grid grid-cols-3 gap-20">
            <div className="space-y-8">
                <h4 className="text-[11px] font-black text-white/20 tracking-[0.3em] mb-6">DOCUMENTATION</h4>
                <div className="flex flex-col gap-4">
                    <a href="https://github.com/PuwitChao/PropulsionLab/blob/main/docs/DOCUMENTATION.md" target="_blank" rel="noreferrer" className="text-[12px] font-mono text-white/60 hover:text-white transition-all flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-white/20"></div> USER_GUIDE.MD
                    </a>
                    <a href="https://github.com/PuwitChao/PropulsionLab/blob/main/docs/ARCHITECTURE_WIKI.md" target="_blank" rel="noreferrer" className="text-[12px] font-mono text-white/60 hover:text-white transition-all flex items-center gap-3">
                         <div className="w-1.5 h-1.5 bg-white/20"></div> ARCHITECTURE_WIKI.MD
                    </a>
                </div>
            </div>
            <div className="space-y-8 border-l border-white/10 pl-20">
                <h4 className="text-[11px] font-black text-white/20 tracking-[0.3em] mb-6">BACKEND</h4>
                <div className="flex flex-col gap-2">
                    <span className={`text-[12px] font-mono uppercase tracking-widest ${status === 'STABLE' ? 'text-white/60' : 'warning-text'}`}>
                      {status === 'STABLE' ? 'API_KERNEL_ONLINE' : status === 'CHECKING' ? 'STATUS_CHECKING...' : 'API_OFFLINE'}
                    </span>
                    <span className="text-[12px] font-mono text-white/60 uppercase tracking-widest">LOCAL_COMPUTE_ONLY</span>
                    <span className="text-[11px] font-mono text-white/30 mt-4 uppercase tracking-widest">REST_API_V2.2.0</span>
                </div>
            </div>
         </div>
      </section>
    </div>
  )
}

export default App
