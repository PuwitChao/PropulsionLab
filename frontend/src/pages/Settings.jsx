import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { API_BASE_URL } from '../api';

function SidebarParameter({ label, value, unit, min, max, onChange, step }) {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-baseline mb-4 px-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 font-headline">{label}</label>
                <span className="mono text-[12px] text-white font-bold">{value} {unit}</span>
            </div>
            <input
                className="w-full"
                type="range"
                min={min}
                max={max}
                step={step || (max-min)/100}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
            />
        </div>
    )
}

export default function Settings() {
  const { textSize, setTextSize, theme, setTheme } = useSettings();
  const [versionInfo, setVersionInfo] = useState({ version: '...', cantera: '...' })
  const [apiStatus, setApiStatus] = useState('CHECKING')
  const [sessionTime, setSessionTime] = useState('00:00:00')

  useEffect(() => {
    // Fetch version info from backend
    fetch(`${API_BASE_URL}/version`)
      .then(r => r.json())
      .then(d => setVersionInfo({
          version: d.version || '2.2.0',
          cantera: d.cantera_version || '3.0.x'
      }))
      .catch(() => setVersionInfo({ version: 'Unavailable', cantera: 'Unavailable' }))

    // Check health
    fetch(`${API_BASE_URL}/health`)
      .then(r => r.json())
      .then(d => setApiStatus(d.status === 'healthy' ? 'HEALTHY' : 'DEGRADED'))
      .catch(() => setApiStatus('OFFLINE'))

    // Live session clock
    const start = parseInt(sessionStorage.getItem('session_start') || Date.now())
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      const h = String(Math.floor(elapsed / 3600)).padStart(2, '0')
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')
      const s = String(elapsed % 60).padStart(2, '0')
      setSessionTime(`${h}:${m}:${s}`)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  const statusColor = apiStatus === 'HEALTHY' ? 'text-white' : apiStatus === 'OFFLINE' ? 'text-red-400' : 'text-white/50'

  return (
    <div className="space-y-16 animate-in max-w-5xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="flex items-center gap-8">
                <span className="w-2 h-2 bg-white"></span>
                <h1 className="text-[13px] font-black tracking-[0.4em] uppercase text-white font-headline">SYSTEM_ENVIRONMENT_CONFIG</h1>
            </div>
            <div className="status-badge">LOCAL_STORAGE_PERSISTENCE</div>
        </div>

        <div className="grid grid-cols-12 gap-12">
            {/* Visual Preferences */}
            <section className="col-span-12 lg:col-span-8 space-y-12">
                <div className="bg-surface-container-low border border-white/10 p-14 space-y-16">
                    <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white/40 mb-6 flex items-center pr-4">
                        <span className="w-6 h-[1px] bg-white/20 mr-4"></span>
                        WORKSPACE_DISPLAY_MODES
                    </h2>

                    <div className="grid grid-cols-2 gap-12">
                         <div className="space-y-8">
                            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30 block mb-6">Luminance Profile</label>
                            <div className="flex gap-6">
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex-1 py-5 px-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all font-mono border ${theme === 'dark' ? 'bg-white text-black border-white' : 'bg-transparent text-white/30 border-white/10 hover:border-white/30'}`}
                                >
                                    MONO_DARK
                                </button>
                                <button
                                    onClick={() => setTheme('light')}
                                    title="Light theme coming in a future sprint"
                                    className={`flex-1 py-5 px-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all font-mono border opacity-30 cursor-not-allowed border-white/10 text-white/20`}
                                    disabled
                                >
                                    MONO_LIGHT
                                    <span className="block text-[9px] tracking-normal normal-case font-normal mt-1 opacity-60">Not yet implemented</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <SidebarParameter
                                label="TEXT_SCALING" value={Math.round(textSize * 100)} unit="%"
                                min={0.8} max={1.5} step={0.05}
                                onChange={v => setTextSize(v)}
                            />
                            <p className="text-[10px] mono text-white/20 uppercase leading-relaxed pt-4 italic">
                                Current scale: {textSize.toFixed(2)}x — applied to root font-size.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-surface-container-low border border-white/10 p-14 space-y-12">
                     <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white/40 mb-10 flex items-center pr-4">
                        <span className="w-6 h-[1px] bg-white/20 mr-4"></span>
                        DATA_RETENTION_POLICY
                    </h2>
                    <div className="flex gap-12 items-start">
                        <div className="flex-1 space-y-6">
                            <p className="text-[12px] text-white/50 leading-relaxed uppercase mono">
                                Analysis parameters and display settings are cached in browser localStorage. Clearing will restore all defaults.
                            </p>
                        </div>
                        <button
                            onClick={() => { localStorage.clear(); window.location.reload(); }}
                            className="bg-transparent border border-white/10 px-10 py-4 text-[11px] font-black tracking-[0.2em] uppercase text-white/40 hover:text-white hover:border-white transition-all whitespace-nowrap"
                        >
                            Flush_Local_Cache
                        </button>
                    </div>
                </div>

                <div className="bg-surface-container-low border border-white/10 p-14 space-y-10">
                     <div className="flex justify-between items-center mb-10">
                        <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white/40 flex items-center pr-4">
                            <span className="w-6 h-[1px] bg-white/20 mr-4"></span>
                            SYSTEM_DIAGNOSTICS
                        </h2>
                        <span className={`mono text-[10px] px-4 py-1 border ${apiStatus === 'HEALTHY' ? 'text-white/60 bg-white/5 border-white/10' : 'text-red-400 bg-red-950/20 border-red-500/20'}`}>
                          {apiStatus === 'HEALTHY' ? 'LIVE_TELEMETRY' : apiStatus}
                        </span>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { label: 'KERNEL',    val: apiStatus === 'HEALTHY' ? 'ACTIVE' : 'OFFLINE', sub: 'CANTERA_CORE' },
                            { label: 'CEA_ENG',   val: apiStatus === 'HEALTHY' ? 'NOMINAL' : 'OFFLINE', sub: 'ROCKET_SOLVER' },
                            { label: 'OPT_NODE',  val: apiStatus === 'HEALTHY' ? 'ACTIVE' : 'OFFLINE',  sub: 'MISSION_SYNTH' },
                            { label: 'API_STAT',  val: apiStatus,  sub: 'REST_V2.2' }
                        ].map((d, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-6 space-y-3 group hover:border-white/30 transition-all">
                                <p className="mono text-[10px] text-white/30 tracking-widest">{d.label}</p>
                                <p className={`text-[12px] font-black ${d.val === 'OFFLINE' ? 'text-red-400' : 'text-white'}`}>{d.val}</p>
                                <p className="mono text-[9px] text-white/20 tracking-tighter truncate">{d.sub}</p>
                            </div>
                        ))}
                     </div>
                </div>
            </section>

            {/* Info Side Column */}
            <section className="col-span-12 lg:col-span-4 space-y-8">
                <div className="bg-surface-container-high p-12 flex flex-col gap-y-10 relative">
                    <div className="panel-accent"></div>
                    <div className="flex items-center gap-x-6 pb-8 border-b border-white/10">
                        <span className="material-symbols-outlined !text-[24px] text-white/80">terminal</span>
                        <h2 className="text-[13px] font-black tracking-[0.4em] uppercase text-white font-headline">Session Info</h2>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-3">
                            <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Session Mode</p>
                            <p className="text-[12px] text-white mono bg-white/5 px-6 py-4 border border-white/10">LOCAL_SESSION_ONLY</p>
                        </div>
                        <p className="text-[12px] text-white/40 leading-relaxed uppercase mono border-l-2 border-white/20 pl-6 italic">
                            All computation runs on your local backend. No data is transmitted externally.
                        </p>
                    </div>
                </div>

                 <div className="p-12 border border-white/10 bg-surface-container-low">
                      <p className="text-[11px] font-black tracking-[0.3em] uppercase text-white/30 mb-8 font-headline">VERSION_INFO</p>
                      <div className="space-y-4 mono text-[12px] text-white/40 uppercase tracking-widest">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                             <span>Build</span>
                             <span className={statusColor}>{versionInfo.version}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                             <span>Kernel</span>
                             <span className="text-white">CANTERA {versionInfo.cantera}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                             <span>Backend</span>
                             <span className={`${apiStatus === 'HEALTHY' ? 'text-white' : 'text-red-400'}`}>{apiStatus}</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                             <span>Session</span>
                             <span className="text-white">{sessionTime}</span>
                        </div>
                     </div>
                 </div>
            </section>
        </div>
    </div>
  );
}
