import React, { useState, useEffect } from 'react'
import API_BASE_URL from './api'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px]">
          <div className="border border-red-500/30 bg-red-950/20 p-16 max-w-xl">
            <p className="mono text-[12px] text-red-400 uppercase tracking-widest font-black mb-6">RENDER_ERROR</p>
            <p className="mono text-[11px] text-red-400/60 break-all">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-10 mono text-[11px] text-white/40 hover:text-white uppercase tracking-widest transition-colors"
            >RESET_NODE</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import MissionAnalysis from './pages/MissionAnalysis'
import ParametricCycle from './pages/ParametricCycle'
import RocketAnalysis from './pages/RocketAnalysis'
import PerformanceMap from './pages/PerformanceMap'
import Settings from './pages/Settings'

// ── Nav items ────────────────────────────────────────────────────────────────
const navItems = [
  { id: 'dashboard', label: 'Mainframe', icon: 'grid_view', category: '_ROOT' },
  { id: 'on-design', label: 'Cycle_Solver', icon: 'cyclone', category: 'THERMODYNAMICS' },
  { id: 'off-design', label: 'Map_Matching', icon: 'schema', category: 'THERMODYNAMICS' },
  { id: 'rocket', label: 'Chamber_CEA', icon: 'rocket', category: 'PROPULSION' },
  { id: 'mission', label: 'Size_Synth', icon: 'analytics', category: 'OPERATIONS' },
  { id: 'settings', label: 'Environment', icon: 'settings', category: 'SYSTEM' },
]

// ─────────────────────────────────────────────────────────────────────────────
function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [backendStatus, setBackendStatus] = useState('CHECKING')
  const [sessionDuration, setSessionDuration] = useState('00:00:00')
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-GB', { hour12: false }))

  // Record session start in sessionStorage on first load
  const sessionStart = React.useRef(() => {
    const stored = sessionStorage.getItem('session_start')
    if (!stored) {
      const now = Date.now().toString()
      sessionStorage.setItem('session_start', now)
      return parseInt(now)
    }
    return parseInt(stored)
  })()

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
        const res = await fetch(`${API_BASE_URL}/health`)
        const data = await res.json()
        setBackendStatus(data.status === 'healthy' ? 'STABLE' : 'DEGRADED')
      } catch {
        setBackendStatus('OFFLINE')
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'on-design': return <ParametricCycle />
      case 'off-design': return <PerformanceMap />
      case 'mission': return <MissionAnalysis />
      case 'rocket': return <RocketAnalysis />
      case 'settings': return <Settings />
      default: return <Dashboard status={backendStatus} onNavigate={setActiveTab} />
    }
  }

  return (
    <div className="flex w-full min-h-screen bg-surface selection:bg-white selection:text-black">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <nav className="fixed left-0 top-0 h-full w-[280px] z-50 flex flex-col pt-12 bg-surface border-r border-white/10">
        <div className="px-12 mb-16">
          <div className="flex items-center gap-4">
             <div className="w-2 h-2 bg-white"></div>
             <h1 className="text-[15px] font-black tracking-[0.4em] text-white font-headline">PROPULSION</h1>
          </div>
          <p className="text-[10px] tracking-[0.3em] text-white/30 mt-4 font-mono border-l border-white/20 pl-4">PROPULSION_SYS_V2.2.0</p>
        </div>
        
        <div className="flex flex-col flex-grow px-6 space-y-2">
          {['_ROOT', 'THERMODYNAMICS', 'PROPULSION', 'OPERATIONS', 'SYSTEM'].map(cat => (
            <div key={cat} className="mb-8">
                <span className="text-[10px] font-bold text-white/20 tracking-[0.3em] px-6 mb-4 block uppercase">{cat}</span>
                {navItems.filter(i => i.category === cat).map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-6 px-6 py-4 transition-all group relative ${
                            activeTab === item.id 
                            ? 'text-white' 
                            : 'text-white/40 hover:text-white'
                        }`}
                        >
                        {activeTab === item.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-white"></div>}
                        <span className={`material-symbols-outlined !text-[20px] ${activeTab === item.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>{item.icon}</span>
                        <span className="uppercase tracking-[0.2em] text-[11px] font-bold font-headline">{item.label}</span>
                    </button>
                ))}
            </div>
          ))}
        </div>

        <div className="px-12 py-10 border-t border-white/10">
          <div className="space-y-5">
             <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/20">Session</span>
                <span className="font-mono text-[11px] text-white/60">{sessionDuration}</span>
             </div>
          </div>
        </div>
      </nav>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 right-0 left-[280px] h-20 z-40 flex items-center justify-between px-12 bg-surface/90 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-14">
          <span className="uppercase tracking-[0.4em] text-[12px] font-black text-white font-headline flex items-center gap-6">
            <span className="w-6 h-[1px] bg-white opacity-30"></span>
            {activeTab === 'dashboard' ? 'MAIN_TERMINAL_INTERFACE' : `${activeTab.replace('-', '_').toUpperCase()}_NODE`}
          </span>
        </div>
        
        <div className="flex items-center gap-12">
          <div className="flex gap-14 items-center">
             <div className="flex flex-col items-end">
                <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">System_Time</span>
                <span className="text-[12px] font-mono text-white mt-1">{time}</span>
             </div>
             <div className="h-8 w-[1px] bg-white/10"></div>
             <div className="flex flex-col items-end pr-6">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">Status</span>
               <div className="flex items-center gap-3 mt-1">
                 <div className={`w-2 h-2 transition-all ${backendStatus === 'STABLE' ? 'bg-white' : backendStatus === 'CHECKING' ? 'bg-white/40 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                 <span className={`text-[11px] font-mono tracking-widest uppercase ${backendStatus === 'OFFLINE' ? 'text-red-400' : 'text-white'}`}>{backendStatus}</span>
               </div>
             </div>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <main className="ml-[280px] mt-20 p-16 w-[calc(100%-280px)] h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide grid-bg">
        <div className="max-w-[1400px] mx-auto">
            <ErrorBoundary key={activeTab}>
              {renderContent()}
            </ErrorBoundary>
        </div>
      </main>

      {/* ── Footer Status ─────────────────────────────────────────────── */}
      <footer className="fixed bottom-0 right-0 left-[280px] h-12 bg-surface border-t border-white/10 flex items-center px-12 justify-between z-40">
        <div className="flex gap-20 items-center">
            <div className="flex gap-4 items-center">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">KERNEL</span>
                <span className="mono text-[11px] text-white/60 font-medium">CANTERA_V3.0.x</span>
            </div>
            <div className="flex gap-4 items-center">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">BUILD</span>
                <span className="mono text-[11px] text-white/60 font-medium uppercase tracking-[0.1em]">PROPULSION_SUITE_V2.2.0</span>
            </div>
        </div>
        <div className="flex gap-12 items-center">
            <span className="mono text-[11px] text-white/20 tracking-[0.2em]">{time} // LOCAL</span>
            <div className="flex gap-1.5">
                <div className={`w-1.5 h-1.5 ${backendStatus === 'STABLE' ? 'bg-white opacity-60' : 'bg-red-500 opacity-60'}`}></div>
                <div className="w-1.5 h-1.5 bg-white opacity-20"></div>
                <div className="w-1.5 h-1.5 bg-white opacity-5"></div>
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
    { id: 'mission', title: 'SIZE_SYNTHESIS', specs: 'CONSTRAINT // MISSION', code: 'MOD_04', desc: 'Multi-point aircraft sizing and constraint visualization.' }
  ]

  return (
    <div className="space-y-20 animate-in">
      <section className="bg-surface-container-low border border-white/10 p-20 relative overflow-hidden group">
        <div className="panel-accent"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-8 mb-12">
            <div className="w-4 h-4 bg-white"></div>
            <h2 className="text-4xl font-black tracking-[0.4em] text-white leading-none">PROPULSION_LAB</h2>
          </div>
          <p className="text-white/50 font-mono text-[13px] leading-relaxed max-w-4xl uppercase tracking-[0.15em]">
            A COMPUTATIONALLY RIGOROUS ENGINEERING ENVIRONMENT FOR AEROSPACE PROPULSION SYSTEMS. 
            INTEGRATING THERMODYNAMIC CYCLE ANALYSIS, CHEMICAL EQUILIBRIUM COMBUSTION MODELING, 
            AND MISSION-LEVEL CONSTRAINT SYNTHESIS WITHIN A UNIFIED SI FRAMEWORK.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-12">
        {features.map((f) => (
          <div 
            key={f.id}
            onClick={() => onNavigate(f.id)}
            className="group bg-surface-container-low border border-white/10 hover:border-white/30 hover:bg-surface-container-high transition-all p-16 cursor-pointer flex flex-col justify-between h-[360px] relative"
          >
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-14">
                 <div>
                    <span className="text-[11px] font-mono text-white/30 tracking-widest mb-2 block">{f.code}</span>
                    <h3 className="text-[16px] font-black tracking-[0.4em] text-white">{f.title}</h3>
                 </div>
                 <span className="material-symbols-outlined text-white/10 group-hover:text-white transition-all !text-[24px]">north_east</span>
              </div>
              <p className="text-white/40 font-mono text-[12px] leading-[1.8] uppercase tracking-[0.1em] mb-12 group-hover:text-white/60 transition-colors">
                {f.desc}
              </p>
            </div>
            <div className="pt-10 border-t border-white/10 flex justify-between items-center relative z-10">
               <span className="text-[11px] font-mono text-white/50 uppercase tracking-widest font-bold group-hover:text-white transition-colors">{f.specs}</span>
               <div className="w-3 h-3 border border-white/30 group-hover:bg-white group-hover:border-white transition-all"></div>
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
                    <a href="https://github.com/PuwitChao/PropulsionLab/blob/main/DOCUMENTATION.md" target="_blank" rel="noreferrer" className="text-[12px] font-mono text-white/60 hover:text-white transition-all flex items-center gap-3">
                        <div className="w-1.5 h-1.5 bg-white/20"></div> USER_GUIDE.MD
                    </a>
                    <a href="https://github.com/PuwitChao/PropulsionLab/blob/main/ARCHITECTURE_WIKI.md" target="_blank" rel="noreferrer" className="text-[12px] font-mono text-white/60 hover:text-white transition-all flex items-center gap-3">
                         <div className="w-1.5 h-1.5 bg-white/20"></div> ARCHITECTURE_WIKI.MD
                    </a>
                </div>
            </div>
            <div className="space-y-8 border-l border-white/10 pl-20">
                <h4 className="text-[11px] font-black text-white/20 tracking-[0.3em] mb-6">BACKEND</h4>
                <div className="flex flex-col gap-2">
                    <span className={`text-[12px] font-mono uppercase tracking-widest ${status === 'STABLE' ? 'text-white/60' : 'text-red-400'}`}>
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
