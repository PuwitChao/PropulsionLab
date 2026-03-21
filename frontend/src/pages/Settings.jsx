import React from 'react';
import { useSettings } from '../context/SettingsContext';

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
                                    className={`flex-1 py-5 px-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all font-mono border ${theme === 'light' ? 'bg-white text-black border-white' : 'bg-transparent text-white/30 border-white/10 hover:border-white/30'}`}
                                >
                                    MONO_LIGHT
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
                                Current font scale: {textSize.toFixed(2)}x // Adjusted for high-density displays.
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
                                System analysis parameters are cached in local browser state. Multi-device sync is pending.
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
                        <span className="mono text-[10px] text-green-500 bg-green-500/10 px-4 py-1 border border-green-500/20">LIVE_TELEMETRY</span>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { label: 'KERNEL', val: 'ACTIVE', sub: 'CANTERA_V3' },
                            { label: 'CEA_ENG', val: 'NOMINAL', sub: 'ROCKET_CORE' },
                            { label: 'OPT_NODE', val: 'WAITING', sub: 'CONSTRAINT_SYNTH' },
                            { label: 'API_STAT', val: 'HEALTHY', sub: 'REST_V2.0' }
                        ].map((d, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-6 space-y-3 group hover:border-white/30 transition-all">
                                <p className="mono text-[10px] text-white/30 tracking-widest">{d.label}</p>
                                <p className="text-[12px] font-black text-white">{d.val}</p>
                                <p className="mono text-[9px] text-white/20 tracking-tighter truncate">{d.sub}</p>
                            </div>
                        ))}
                     </div>
                </div>
            </section>

            {/* Account/Security Side Column */}
            <section className="col-span-12 lg:col-span-4 space-y-8">
                <div className="bg-surface-container-high p-12 flex flex-col gap-y-10 relative">
                    <div className="panel-accent"></div>
                    <div className="flex items-center gap-x-6 pb-8 border-b border-white/10">
                        <span className="material-symbols-outlined !text-[24px] text-white/80">shield</span>
                        <h2 className="text-[13px] font-black tracking-[0.4em] uppercase text-white font-headline">Secure Identity</h2>
                    </div>
                    
                    <div className="space-y-8">
                        <div className="space-y-3">
                            <p className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] leading-relaxed">System Access Token</p>
                            <p className="text-[12px] text-white mono bg-white/5 px-6 py-4 border border-white/10 truncate">MOCK_ACCESS_TOKEN_0422</p>
                        </div>
                        <p className="text-[12px] text-white/40 leading-relaxed uppercase mono border-l-2 border-white/40 pl-6 italic">
                            Cloud synchronization is restricted to registered researchers.
                        </p>
                        <button className="w-full bg-white text-black py-5 font-black text-[11px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline">
                             AUTHENTICATE_SESSION
                        </button>
                    </div>
                </div>

                <div className="p-12 border border-white/10 bg-surface-container-low">
                     <p className="text-[11px] font-black tracking-[0.3em] uppercase text-white/30 mb-8 font-headline">VERSION_INFO</p>
                     <div className="space-y-4 mono text-[12px] text-white/40 uppercase tracking-widest">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                             <span>Stable Build</span>
                             <span className="text-white">2.1.4-BETA</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                             <span>Kernel</span>
                             <span className="text-white">CANTERA 3.0.0</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                             <span>Uptime</span>
                             <span className="text-white">04:22:12</span>
                        </div>
                     </div>
                </div>
            </section>
        </div>
    </div>
  );
}
