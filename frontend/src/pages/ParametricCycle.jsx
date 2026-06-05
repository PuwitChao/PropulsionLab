import React, { useState, useEffect, useCallback } from 'react'
import Plotly from 'plotly.js-dist-min'
import _createPlotlyComponent from 'react-plotly.js/factory'
const createPlotlyComponent = _createPlotlyComponent.default || _createPlotlyComponent
const Plot = createPlotlyComponent(Plotly)
import { fetchData } from '../api'
import StatPanel from '../components/StatPanel'
import SliderControl from '../components/SliderControl'
import { useSettings } from '../context/SettingsContext'
import usePersistentState from '../hooks/usePersistentState'

// ── Station Blueprint Diagram ─────────────────────────────────────────────────

function StationDiagram({ activeEngine }) {
  const { theme } = useSettings()
  const isLight = theme === 'light'
  
  // Base stroke styling
  const strokeColor = isLight ? '#0F172A' : '#FFFFFF'
  const gradStop = isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.08)'

  if (activeEngine === 'turbofan' || activeEngine === 'multispool_turbofan') {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-20 pt-32 animate-in">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2"></div>
        <svg className="w-full h-full relative z-10" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 400">
          <defs>
              <linearGradient id="blueprintGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor: gradStop, stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'rgba(255,255,255,0)', stopOpacity:1}} />
              </linearGradient>
          </defs>
          <g opacity="0.15">
              <line x1="120" y1="0" x2="120" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="280" y1="0" x2="280" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="420" y1="0" x2="420" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="560" y1="0" x2="560" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="720" y1="0" x2="720" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
          </g>
          {/* Outer Bypass Duct */}
          <path d="M 50 120 L 120 100 L 780 100 L 780 135 L 750 140 L 120 140 M 50 280 L 120 300 L 780 300 L 780 265 L 750 260 L 120 260" fill="url(#blueprintGrad)" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
          
          {/* Fan */}
          <path d="M 50 120 L 120 140 L 120 260 L 50 280 Z" fill="rgba(255,255,255,0.05)" stroke={strokeColor} strokeWidth="1.5" />
          <circle cx="85" cy="200" r="10" fill={strokeColor} />
          <text className="mono text-[10px] tracking-[0.2em] font-black" fill={strokeColor} textAnchor="middle" x="85" y="80">LP_FAN</text>
          
          {/* LPC Booster */}
          <path d="M 120 160 L 220 170 L 220 230 L 120 240 Z" fill="rgba(255,255,255,0.08)" stroke={strokeColor} strokeWidth="1" />
          <text className="mono text-[9px] tracking-[0.2em] font-bold" fill={strokeColor} textAnchor="middle" x="170" y="203">LPC_BOOSTER</text>

          {/* HPC Compressor */}
          <path d="M 220 170 L 360 180 L 360 220 L 220 230 Z" fill="rgba(255,255,255,0.12)" stroke={strokeColor} strokeWidth="1.5" />
          <text className="mono text-[10px] tracking-[0.2em] font-black" fill={strokeColor} textAnchor="middle" x="290" y="70">HP_COMP</text>
          
          {/* Core Shafts */}
          <line x1="85" y1="200" x2="660" y2="200" stroke={strokeColor} strokeWidth="3" />
          <line x1="290" y1="200" x2="510" y2="200" stroke={strokeColor} strokeWidth="6" opacity="0.5" />

          {/* Combustor */}
          <rect x="360" y="180" width="90" height="40" fill="rgba(255,255,255,0.15)" stroke={strokeColor} strokeWidth="1" />
          <text className="mono text-[10px] tracking-[0.2em] font-black" fill={strokeColor} textAnchor="middle" x="405" y="70">BURN_PRI</text>
          
          {/* HP Turbine */}
          <path d="M 450 180 L 510 175 L 510 225 L 450 220 Z" fill="rgba(255,255,255,0.1)" stroke={strokeColor} strokeWidth="1.5" />
          <text className="mono text-[10px] tracking-[0.2em] font-black" fill={strokeColor} textAnchor="middle" x="480" y="70">HPT</text>

          {/* LP Turbine */}
          <path d="M 510 175 L 590 165 L 590 235 L 510 225 Z" fill="rgba(255,255,255,0.1)" stroke={strokeColor} strokeWidth="1.5" />
          <text className="mono text-[10px] tracking-[0.2em] font-black" fill={strokeColor} textAnchor="middle" x="550" y="70">LPT</text>

          {/* Separate Nozzles */}
          <path d="M 590 180 L 750 190 L 750 210 L 590 220 Z" fill="url(#blueprintGrad)" stroke={strokeColor} strokeWidth="1" />
          <text className="mono text-[9px] font-bold" fill={strokeColor} textAnchor="middle" x="670" y="248">CORE_NOZ</text>
          
          <text className="mono text-[9px] font-bold" fill={strokeColor} textAnchor="middle" x="780" y="80">BYPASS_NOZ</text>
          
          <text className="mono text-[11px] uppercase tracking-widest font-bold" fill={strokeColor} fillOpacity="0.5" x="50" y="325">S_02</text>
          <text className="mono text-[11px] uppercase tracking-widest font-bold" fill={strokeColor} fillOpacity="0.5" x="750" y="325" textAnchor="end">S_09</text>
        </svg>
      </div>
    )
  }

  if (activeEngine === 'mixed_flow') {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-20 pt-32 animate-in">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2"></div>
        <svg className="w-full h-full relative z-10" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 400">
          <defs>
              <linearGradient id="blueprintGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor: gradStop, stopOpacity:1}} />
                  <stop offset="100%" style={{stopColor:'rgba(255,255,255,0)', stopOpacity:1}} />
              </linearGradient>
          </defs>
          <g opacity="0.15">
              <line x1="120" y1="0" x2="120" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="280" y1="0" x2="280" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="420" y1="0" x2="420" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="560" y1="0" x2="560" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="720" y1="0" x2="720" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
          </g>
          {/* Outer Bypass Duct merging in mixer */}
          <path d="M 50 120 L 120 100 L 590 100 L 680 160 M 50 280 L 120 300 L 590 300 L 680 240" fill="none" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="2 2" opacity="0.4" />
          
          {/* Fan */}
          <path d="M 50 120 L 120 140 L 120 260 L 50 280 Z" fill="rgba(255,255,255,0.05)" stroke={strokeColor} strokeWidth="1.5" />
          <circle cx="85" cy="200" r="10" fill={strokeColor} />
          <text className="mono text-[10px] tracking-[0.2em] font-black" fill={strokeColor} textAnchor="middle" x="85" y="80">LP_FAN</text>

          {/* LPC Booster */}
          <path d="M 120 160 L 220 170 L 220 230 L 120 240 Z" fill="rgba(255,255,255,0.08)" stroke={strokeColor} strokeWidth="1" />

          {/* HPC Compressor */}
          <path d="M 220 170 L 360 180 L 360 220 L 220 230 Z" fill="rgba(255,255,255,0.12)" stroke={strokeColor} strokeWidth="1.5" />
          <text className="mono text-[10px] tracking-[0.2em] font-black" fill={strokeColor} textAnchor="middle" x="290" y="70">HP_COMP</text>
          
          {/* Core Shafts */}
          <line x1="85" y1="200" x2="590" y2="200" stroke={strokeColor} strokeWidth="3" />
          <line x1="290" y1="200" x2="510" y2="200" stroke={strokeColor} strokeWidth="6" opacity="0.5" />

          {/* Combustor */}
          <rect x="360" y="180" width="90" height="40" fill="rgba(255,255,255,0.15)" stroke={strokeColor} strokeWidth="1" />
          <text className="mono text-[10px] tracking-[0.2em] font-black" fill={strokeColor} textAnchor="middle" x="405" y="70">BURN_PRI</text>
          
          {/* HP Turbine */}
          <path d="M 450 180 L 510 175 L 510 225 L 450 220 Z" fill="rgba(255,255,255,0.1)" stroke={strokeColor} strokeWidth="1.5" />

          {/* LP Turbine */}
          <path d="M 510 175 L 590 165 L 590 235 L 510 225 Z" fill="rgba(255,255,255,0.1)" stroke={strokeColor} strokeWidth="1.5" />

          {/* Mixer Confluence Zone */}
          <path d="M 590 165 L 680 160 L 680 240 L 590 235 Z" fill="rgba(255,255,255,0.18)" stroke={strokeColor} strokeWidth="1.5" />
          <text className="mono text-[9px] tracking-[0.2em] font-bold" fill={strokeColor} textAnchor="middle" x="635" y="203">MIXER_S05</text>

          {/* Afterburner / Nozzle */}
          <path d="M 680 160 L 800 160 L 950 185 L 950 215 L 800 240 L 680 240 Z" fill="url(#blueprintGrad)" stroke={strokeColor} strokeWidth="1" />
          <text className="mono text-[10px] tracking-[0.2em] font-black" fill={strokeColor} textAnchor="middle" x="815" y="70">NOZ_CONV_DIV</text>
          
          <text className="mono text-[11px] uppercase tracking-widest font-bold" fill={strokeColor} fillOpacity="0.5" x="50" y="325">S_02</text>
          <text className="mono text-[11px] uppercase tracking-widest font-bold" fill={strokeColor} fillOpacity="0.5" x="950" y="325" textAnchor="end">S_09</text>
        </svg>
      </div>
    )
  }

  // Fallback to classic single-spool turbojet for "turbojet" or sensitivity background
  return (
    <div className="relative w-full h-full flex items-center justify-center p-20 pt-32 animate-in">
       <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2"></div>
      <svg className="w-full h-full relative z-10" preserveAspectRatio="xMidYMid meet" viewBox="0 0 1000 400">
        <defs>
            <linearGradient id="blueprintGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: gradStop, stopOpacity:1}} />
                <stop offset="100%" style={{stopColor:'rgba(255,255,255,0)', stopOpacity:1}} />
            </linearGradient>
        </defs>
        <g opacity="0.15">
            <line x1="200" y1="0" x2="200" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="400" y1="0" x2="400" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="520" y1="0" x2="520" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
            <line x1="720" y1="0" x2="720" y2="400" stroke={strokeColor} strokeWidth="0.5" strokeDasharray="4 4" />
        </g>
        {/* Inlet */}
        <path d="M 50 160 L 200 150 L 200 250 L 50 240 Z" fill="url(#blueprintGrad)" stroke={strokeColor} strokeWidth="1" />
        <text className="mono text-[12px] uppercase tracking-widest font-bold" fill={strokeColor} fillOpacity="0.5" x="50" y="280">S_00</text>
        {/* Compressor */}
        <path d="M 200 150 L 400 175 L 400 225 L 200 250 Z" fill="rgba(255,255,255,0.1)" stroke={strokeColor} strokeWidth="1.5" />
        <text className="mono text-[12px] tracking-[0.3em] font-black" fill={strokeColor} textAnchor="middle" x="300" y="130">COMP_AXIAL</text>
        <rect x="300" y="145" width="1" height="110" fill={strokeColor} opacity="0.2" />
        {/* Combustor */}
        <rect x="400" y="175" width="120" height="50" fill="rgba(255,255,255,0.15)" stroke={strokeColor} strokeWidth="1" />
        <text className="mono text-[12px] tracking-[0.3em] font-black" fill={strokeColor} textAnchor="middle" x="460" y="130">BURN_PRI</text>
        <circle cx="460" cy="200" r="15" fill="none" stroke={strokeColor} strokeWidth="0.5" opacity="0.3" />
        {/* Turbine */}
        <path d="M 520 175 L 720 150 L 720 250 L 520 225 Z" fill="rgba(255,255,255,0.1)" stroke={strokeColor} strokeWidth="1.5" />
        <text className="mono text-[12px] tracking-[0.3em] font-black" fill={strokeColor} textAnchor="middle" x="620" y="130">TURB_CORE</text>
        {/* Nozzle */}
        <path d="M 720 150 L 950 185 L 950 215 L 720 250 Z" fill="url(#blueprintGrad)" stroke={strokeColor} strokeWidth="1" />
        <text className="mono text-[12px] tracking-[0.3em] font-black" fill={strokeColor} textAnchor="middle" x="835" y="130">NOZ_EXIT</text>
        <text className="mono text-[12px] uppercase tracking-widest font-bold" fill={strokeColor} fillOpacity="0.5" x="950" y="280" textAnchor="end">S_09</text>
      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ParametricCycle() {
  const { theme } = useSettings()
  const isLight = theme === 'light'
  const [activeEngine, setActiveEngine] = useState('turbojet')
  const [p, setP] = usePersistentState('cycle_params', {
    alt: 10000, mach: 0.8, prc: 25, tit: 1650,
    bpr: 6.0, fpr: 1.6, lpc_pr: 3.0,
    eta_c: 0.88, eta_t: 0.92, burner_dp_frac: 0.04,
    inlet_recovery: 0.98, phi_inlet: 0.0, eta_install_nozzle: 1.0,
    ab_enabled: false, ab_temp: 2000
  })
  const exportScenario = () => {
    const blob = new Blob([JSON.stringify({ engine: activeEngine, params: p }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'cycle_scenario.json'; a.click()
  }
  const importScenario = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => { try { const d = JSON.parse(evt.target.result); if (d.params) setP(prev => ({ ...prev, ...d.params })) } catch { /* invalid JSON */ } }
    reader.readAsText(file); e.target.value = ''
  }
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sensParams, setSensParams] = useState({
    sweep_type: 't4', alt: 10000, mach: 0.8, prc: 25, tit: 1600,
    sweep_min: 1000, sweep_max: 2200, steps: 30
  })
  const [sensData, setSensData] = useState(null)
  const [sensLoading, setSensLoading] = useState(false)

  const runSensitivity = useCallback(async () => {
    setSensLoading(true)
    setSensData(null)
    try {
      const data = await fetchData('/analyze/cycle/sensitivity', {
        method: 'POST',
        body: JSON.stringify(sensParams)
      })
      setSensData(data)
    } catch (e) {
      console.error('Sensitivity sweep error:', e)
    }
    setSensLoading(false)
  }, [sensParams])

  useEffect(() => {
    if (activeEngine === 'sensitivity') {
      const t = setTimeout(runSensitivity, 700)
      return () => clearTimeout(t)
    }
  }, [sensParams, activeEngine, runSensitivity])

  const runAnalysis = useCallback(async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      let endpoint = '/analyze/cycle'
      let body = p
      if (activeEngine === 'multispool_turbofan') {
        endpoint = '/analyze/cycle/multispool'
        body = {
          alt: p.alt,
          mach: p.mach,
          opr: p.prc,
          bpr: p.bpr,
          fpr: p.fpr,
          lpc_pr: p.lpc_pr ?? 3.0,
          tit: p.tit
        }
      } else if (activeEngine === 'turbofan' || activeEngine === 'mixed_flow') {
        endpoint = '/analyze/cycle/turbofan'
        body = { ...p, opr: p.prc, mixed_exhaust: activeEngine === 'mixed_flow' }
      }
      const data = await fetchData(endpoint, { method: 'POST', body: JSON.stringify(body) })
      setResult(data)
    } catch (e) {
      console.error(e)
      setError('Solver kernel returned an error. Check backend connection and input parameters.')
    }
    setLoading(false)
  }, [p, activeEngine])

  // Clear results when switching engine type, then re-run (debounced)
  useEffect(() => {
    if (activeEngine === 'sensitivity') return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResult(null)
    setError(null)
    const t = setTimeout(runAnalysis, 700)
    return () => clearTimeout(t)
  }, [p, activeEngine, runAnalysis])

  // Build station display rows - returns empty array cleanly when no result
  const getStationData = () => {
    if (!result || !result.stations) return []
    const mapping = {
        'turbojet': [
            { id: '00', ref: 'Freestream', k: 0 },
            { id: '02', ref: 'Inlet Exit', k: 2 },
            { id: '03', ref: 'Compressor Exit', k: 3 },
            { id: '04', ref: 'Combustor Exit', k: 4 },
            { id: '05', ref: 'Turbine Exit', k: 5 },
            { id: '07', ref: 'Augmentor Exit', k: 7 },
        ],
        'turbofan': [
            { id: '00', ref: 'Freestream', k: 0 },
            { id: '02', ref: 'Fan Inlet', k: 2 },
            { id: '21', ref: 'Fan Bypass Exit', k: 21 },
            { id: '25', ref: 'LPC / Booster Exit', k: 25 },
            { id: '03', ref: 'HPC Exit', k: 3 },
            { id: '04', ref: 'Combustor Exit', k: 4 },
            { id: '45', ref: 'HPT Exit', k: 45 },
            { id: '05', ref: 'LPT Exit', k: 5 },
        ],
        'mixed_flow': [
            { id: '00', ref: 'Freestream', k: 0 },
            { id: '02', ref: 'Fan Inlet', k: 2 },
            { id: '21', ref: 'Fan / Bypass Exit', k: 21 },
            { id: '25', ref: 'LPC / Booster Exit', k: 25 },
            { id: '03', ref: 'HPC Exit', k: 3 },
            { id: '04', ref: 'Combustor Exit', k: 4 },
            { id: '45', ref: 'HPT Exit', k: 45 },
            { id: '05', ref: 'LPT / Mixer Inlet', k: 5 },
        ],
        'multispool_turbofan': [
            { id: '00', ref: 'Freestream', k: 0 },
            { id: '02', ref: 'Fan Inlet', k: 2 },
            { id: '21', ref: 'Fan / Bypass Exit', k: 21 },
            { id: '25', ref: 'LPC / Booster Exit', k: 25 },
            { id: '03', ref: 'HPC Exit', k: 3 },
            { id: '04', ref: 'Combustor Exit', k: 4 },
            { id: '45', ref: 'HPT Exit', k: 45 },
            { id: '05', ref: 'LPT Exit', k: 5 },
        ],
    }
    const set = mapping[activeEngine] || mapping['turbojet']
    return set.map(s => {
        const d = result.stations[s.k]
        if (!d) return { id: s.id, ref: s.ref, tt: null, pt: null, v: null, m: null }
        return {
            id: s.id,
            ref: s.ref,
            tt: d.tt,
            pt: d.pt,
            v: d.v ?? 0,
            m: d.m ?? 0
        }
    })
  }

  const stations = getStationData()
  const fmt = v => v != null ? v.toFixed(1) : '-'
  const fmtP = v => v != null ? v.toLocaleString() : '-'
  const fmtM = v => v != null ? v.toFixed(3) : '-'

  return (
    <div className="space-y-16 animate-in pb-20">
      {/* Platform Controls */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex gap-12 items-center">
            {['turbojet', 'turbofan', 'mixed_flow', 'multispool_turbofan', 'sensitivity'].map(mode => (
                <button
                    key={mode} onClick={() => setActiveEngine(mode)}
                    className={`text-[12px] tracking-[0.3em] uppercase transition-all pb-3 ${activeEngine === mode ? 'text-white border-b border-white font-black' : 'text-white/30 font-bold hover:text-white'}`}
                >
                    {mode === 'sensitivity' ? '⚡ SENSITIVITY' : mode === 'multispool_turbofan' ? '⚡ MULTI-SPOOL' : mode.replace('_', ' ').toUpperCase()}
                </button>
            ))}
        </div>
        <div className="status-badge">
          KERN_ID: {activeEngine.toUpperCase()} // {loading || sensLoading ? 'EXECUTING...' : error ? 'ERROR' : 'READY'}
        </div>
      </div>

      {/* ── Main Engine View ── */}
      {activeEngine !== 'sensitivity' && (
      <div className="grid grid-cols-12 gap-12">
        {/* Left Col: Params */}
        <section className="col-span-12 lg:col-span-3 space-y-4">
             <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                  <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">ENVIRONMENT</h2>
                  <SliderControl label="Flight Altitude" value={Math.round(p.alt)} min={0} max={15000} unit="m" step={100} onChange={v => setP({...p, alt: v})} />
                  <SliderControl label="Mach Number" value={p.mach.toFixed(2)} min={0} max={2.5} unit="M" step={0.01} onChange={v => setP({...p, mach: v})} />
             </div>

             <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                  <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">CYCLE_SPEC</h2>
                  <SliderControl label="Core PR" value={Math.round(p.prc)} min={2} max={60} unit="" step={1} onChange={v => setP({...p, prc: v})} />
                  <SliderControl label="Turbine Inlet T" value={Math.round(p.tit)} min={1000} max={2500} unit="K" step={10} onChange={v => setP({...p, tit: v})} />
             </div>

             {(activeEngine === 'turbofan' || activeEngine === 'mixed_flow' || activeEngine === 'multispool_turbofan') && (
               <div className="bg-surface-container-low border border-white/10 p-12 space-y-4 animate-in">
                    <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">
                      {activeEngine === 'multispool_turbofan' ? 'DUAL_SPOOL_SPEC' : 'TURBOFAN_SPEC'}
                    </h2>
                    <SliderControl label="Bypass Ratio" value={p.bpr.toFixed(1)} min={0.5} max={15.0} unit="" step={0.1} onChange={v => setP({...p, bpr: v})} />
                    <SliderControl label="Fan Pressure Ratio" value={p.fpr.toFixed(2)} min={1.1} max={3.0} unit="" step={0.05} onChange={v => setP({...p, fpr: v})} />
                    {activeEngine === 'multispool_turbofan' && (
                      <SliderControl label="LPC / Booster PR" value={(p.lpc_pr ?? 3.0).toFixed(2)} min={1.0} max={6.0} unit="" step={0.05} onChange={v => setP({...p, lpc_pr: v})} />
                    )}
               </div>
             )}

             <div className="bg-surface-container-low border border-white/10 p-12 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white">AUGMENTATION</h2>
                    <input
                        type="checkbox" checked={p.ab_enabled}
                        onChange={e => setP({...p, ab_enabled: e.target.checked})}
                        className="w-5 h-5 accent-white cursor-pointer"
                    />
                  </div>
                  <SliderControl
                       label="Afterburner T" value={Math.round(p.ab_temp)} min={1000} max={2500} unit="K" step={10}
                       disabled={!p.ab_enabled} onChange={v => setP({...p, ab_temp: v})}
                  />
             </div>

             <button
                onClick={runAnalysis}
                disabled={loading}
                className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4 disabled:opacity-60"
            >
                <span className="material-symbols-outlined !text-[20px]">{loading ? 'sync' : 'rebase_edit'}</span>
                {loading ? 'COMPUTING...' : 'SOLVE_GAS_TURBINE_CYCLE'}
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

        {/* Right: Visualization */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
            <div className="h-[600px] bg-surface-container-lowest border border-white/10 relative overflow-hidden group">
                <div className="panel-accent"></div>

                {/* Overlay Performance Panel */}
                <div className="absolute top-12 left-12 right-12 flex justify-between items-start z-30">
                    <div className="space-y-3">
                        <h2 className="text-[14px] font-black tracking-[0.3em] text-white">STATION_THERMO_BLUEPRINT</h2>
                        <p className="mono text-[11px] text-white/30 uppercase tracking-widest underline decoration-white/20">
                          SYSTEM_ID: {activeEngine.toUpperCase()}_EXPLORER
                        </p>
                    </div>
                    <div className="flex gap-16">
                        <StatPanel
                          label="SPECIFIC THRUST"
                          value={result ? (result.spec_thrust ?? 0).toFixed(1) : '-'}
                          unit="Ns/kg"
                          sub="NET_AIR_FORCE"
                        />
                        <StatPanel
                          label="THERMAL EFF."
                          value={result?.eta_thermal != null ? (result.eta_thermal * 100).toFixed(1) : '-'}
                          unit="%"
                          sub="CYCLE_TOTAL"
                        />
                        <StatPanel
                          label="SFC"
                          value={result?.tsfc != null ? (result.tsfc * 1e6).toFixed(2) : '-'}
                          unit="mg/Ns"
                          sub="FUEL_EFFICIENCY"
                        />
                    </div>
                </div>

                {/* Loading overlay */}
                {loading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                        <div className="text-white/30 uppercase tracking-[0.5em] text-[13px] font-black animate-pulse">
                            EXECUTING_CYCLE_SOLVER...
                        </div>
                    </div>
                )}

                {/* Error state */}
                {error && !loading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center">
                        <div className="warning-panel px-16 py-10 text-center space-y-4 max-w-md">
                            <span className="material-symbols-outlined warning-text !text-[28px]">error_outline</span>
                            <p className="mono text-[11px] warning-text uppercase tracking-widest leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                <div className="absolute bottom-12 left-12 right-12 h-[200px] z-20">
                    {result && (
                        <Plot
                            data={[
                                {
                                    x: stations.map(s => s.id),
                                    y: stations.map(s => s.tt),
                                    name: 'T_tot (Temperature)',
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    line: { color: isLight ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)', width: 2 },
                                    marker: { size: 7, color: isLight ? '#0f172a' : '#fff' },
                                    yaxis: 'y1'
                                },
                                {
                                    x: stations.map(s => s.id),
                                    y: stations.map(s => s.pt),
                                    name: 'P_tot (Pressure)',
                                    type: 'scatter',
                                    mode: 'lines+markers',
                                    line: { color: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.35)', width: 2, dash: 'dot' },
                                    marker: { size: 5, color: isLight ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)' },
                                    yaxis: 'y2'
                                }
                            ]}
                            layout={{
                                plot_bgcolor: 'transparent',
                                paper_bgcolor: 'transparent',
                                autosize: true,
                                margin: { t: 15, b: 35, l: 60, r: 60 },
                                showlegend: true,
                                legend: { font: { family: 'JetBrains Mono', size: 9, color: isLight ? '#0f172a' : 'white' }, x: 0.02, y: 0.98, bgcolor: 'transparent' },
                                xaxis: {
                                    gridcolor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                                    tickfont: { family: 'JetBrains Mono', size: 9, color: isLight ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)' },
                                    showline: false
                                },
                                yaxis: {
                                    title: { text: 'Total Temp [K]', font: { family: 'JetBrains Mono', size: 9, color: isLight ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.5)' } },
                                    gridcolor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
                                    tickfont: { family: 'JetBrains Mono', size: 9, color: isLight ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)' },
                                    side: 'left'
                                },
                                yaxis2: {
                                    title: { text: 'Total Pres [Pa]', font: { family: 'JetBrains Mono', size: 9, color: isLight ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.3)' } },
                                    overlaying: 'y',
                                    side: 'right',
                                    tickfont: { family: 'JetBrains Mono', size: 9, color: isLight ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.3)' },
                                    showgrid: false
                                }
                            }}
                            className="w-full h-full"
                            config={{ displayModeBar: false, responsive: true }}
                        />
                    )}
                </div>

                <StationDiagram activeEngine={activeEngine} />
            </div>

            {/* Station Table + Solver Log */}
            <div className="grid grid-cols-12 gap-12">
                <div className="col-span-12 lg:col-span-8 flex flex-col space-y-8">
                    <div className="flex items-center justify-between border-b border-white/10 pb-6">
                        <div className="flex items-center gap-6">
                            <span className="material-symbols-outlined !text-[22px] text-white/40">layers</span>
                            <h3 className="text-[13px] font-black tracking-[0.3em]">STATION_PROPERTY_MATRIX</h3>
                        </div>
                    </div>
                    <div className="bg-surface-container-low border border-white/10 overflow-hidden">
                        <table className="w-full text-left mono text-[12px]">
                            <thead>
                                <tr className="bg-white/5 text-white/40 font-bold tracking-[0.1em] border-b border-white/10 uppercase">
                                    <th className="px-10 py-5">Station // Ref</th>
                                    <th className="px-10 py-5 border-l border-white/10 text-white/70">T_Tot [K]</th>
                                    <th className="px-10 py-5 border-l border-white/10 text-white/70">P_Tot [Pa]</th>
                                    <th className="px-10 py-5 border-l border-white/10 text-white">Mach</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {stations.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-10 py-8 text-center text-white/20 mono text-[11px] uppercase tracking-widest">
                                            {loading ? 'Computing station properties...' : 'Run solver to populate station data'}
                                        </td>
                                    </tr>
                                ) : stations.map((s, i) => (
                                    <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                        <td className="px-10 py-5 font-black text-white border-l-[3px] border-transparent group-hover:border-white">
                                          {s.id} // {s.ref}
                                        </td>
                                        <td className="px-10 py-5 border-l border-white/10 text-white/50 group-hover:text-white/90">{fmt(s.tt)}</td>
                                        <td className="px-10 py-5 border-l border-white/10 text-white/50 group-hover:text-white/90">{fmtP(s.pt)}</td>
                                        <td className="px-10 py-5 border-l border-white/10 text-white font-black">{fmtM(s.m)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <div className="flex items-center gap-6 border-b border-white/10 pb-6">
                        <span className="material-symbols-outlined !text-[22px] text-white/40">history_edu</span>
                        <h3 className="text-[13px] font-black tracking-[0.3em]">SOLVER_LOG</h3>
                    </div>
                    <div className="bg-surface-container-lowest border border-white/10 p-10 h-[300px] overflow-auto scrollbar-hide">
                        <div className="space-y-4 mono text-[11px] text-white/40 uppercase tracking-[0.1em] leading-relaxed">
                            {result?.math_trace?.length > 0
                                ? result.math_trace.map((t, i) => <p key={i}>{t}</p>)
                                : <p className="text-white/10 italic">Log empty - run solver to populate.</p>
                            }
                        </div>
                    </div>
                </div>
            </div>
        </section>
      </div>
      )}

      {/* ── Sensitivity Mode ── */}
      {activeEngine === 'sensitivity' && (
        <div className="grid grid-cols-12 gap-12 animate-in">
          <section className="col-span-12 lg:col-span-3 space-y-4">
            <div className="bg-surface-container-low border border-white/10 p-12 space-y-8">
              <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">SWEEP_CONFIG</h2>
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">Sweep Parameter</label>
                <div className="flex flex-col gap-2">
                  {[['t4', 'TIT - Turbine Inlet Temp'], ['alt', 'Altitude'], ['opr', 'Overall Pressure Ratio']].map(([val, lab]) => (
                    <button
                      key={val}
                      onClick={() => setSensParams(s => ({...s, sweep_type: val,
                        sweep_min: val==='t4' ? 800 : val==='alt' ? 0 : 5,
                        sweep_max: val==='t4' ? 2200 : val==='alt' ? 15000 : 60
                      }))}
                      className={`text-left py-4 px-8 border text-[11px] mono tracking-widest uppercase transition-all ${
                        sensParams.sweep_type === val
                          ? 'border-white bg-white/10 text-white font-black'
                          : 'border-white/10 text-white/40 hover:border-white/30'
                      }`}
                    >{lab}</button>
                  ))}
                </div>
              </div>
              <SliderControl label="Fixed: Alt" value={Math.round(sensParams.alt)} min={0} max={15000} unit="m" step={500} onChange={v => setSensParams(s => ({...s, alt: v}))} />
              <SliderControl label="Fixed: Mach" value={sensParams.mach.toFixed(2)} min={0} max={2.5} unit="M" step={0.01} onChange={v => setSensParams(s => ({...s, mach: v}))} />
              <SliderControl label="Fixed: OPR" value={Math.round(sensParams.prc)} min={2} max={60} step={1} onChange={v => setSensParams(s => ({...s, prc: v}))} />
              <SliderControl label="Fixed: TIT" value={Math.round(sensParams.tit)} min={1000} max={2500} unit="K" step={10} onChange={v => setSensParams(s => ({...s, tit: v}))} />
            </div>
            <button
              onClick={runSensitivity}
              disabled={sensLoading}
              className="w-full bg-white text-black py-5 font-black text-[13px] tracking-[0.3em] uppercase hover:bg-white/90 transition-all font-headline flex items-center justify-center gap-4 disabled:opacity-60"
            >
              <span className="material-symbols-outlined !text-[20px]">{sensLoading ? 'sync' : 'stacked_line_chart'}</span>
              {sensLoading ? 'COMPUTING...' : 'RUN_SWEEP'}
            </button>
          </section>

          <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">
            <div className="h-[650px] bg-surface-container-lowest border border-white/10 relative overflow-hidden group">
              <div className="panel-accent"></div>
              <div className="absolute top-12 left-12 z-20 space-y-3 pointer-events-none">
                <h2 className="text-[14px] font-black tracking-[0.3em] text-white">PARAMETRIC_SENSITIVITY_CURVE</h2>
                <p className="mono text-[11px] text-white/30 uppercase tracking-widest">
                  {sensData ? `SWEEP: ${sensData.sweep_label} // POINTS: ${sensData.data?.length}` : 'Awaiting Sweep Execution...'}
                </p>
              </div>
              <div className="w-full h-full pt-16">
                {sensLoading && (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-white/20 uppercase tracking-[0.5em] text-[13px] font-black animate-pulse">
                            Computing_Sensitivity_Sweep...
                        </div>
                    </div>
                )}
                {!sensLoading && sensData && sensData.data?.length > 0 && (
                  <Plot
                    data={[
                      {
                        x: sensData.data.map(d => d.sweep_value),
                        y: sensData.data.map(d => d.spec_thrust),
                        name: 'SPEC_THRUST',
                        type: 'scatter', mode: 'lines+markers',
                        line: { color: isLight ? '#0f172a' : '#ffffff', width: 2 },
                        marker: { size: 6, color: isLight ? '#0f172a' : '#fff' },
                        yaxis: 'y1',
                        hovertemplate: `${sensData.sweep_label}: %{x}<br>Spec Thrust: %{y:.2f} Ns/kg<extra></extra>`
                      },
                      {
                        x: sensData.data.map(d => d.sweep_value),
                        y: sensData.data.map(d => d.tsfc * 1e6),
                        name: 'TSFC [mg/Ns]',
                        type: 'scatter', mode: 'lines+markers',
                        line: { color: isLight ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.35)', width: 2, dash: 'dot' },
                        marker: { size: 5, color: isLight ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.4)' },
                        yaxis: 'y2',
                        hovertemplate: `${sensData.sweep_label}: %{x}<br>TSFC: %{y:.3f} mg/Ns<extra></extra>`
                      },
                      {
                        x: sensData.data.map(d => d.sweep_value),
                        y: sensData.data.map(d => (d.eta_thermal ?? 0) * 100),
                        name: 'eta_THERMAL [%]',
                        type: 'scatter', mode: 'lines',
                        line: { color: isLight ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.15)', width: 1.5, dash: 'longdash' },
                        yaxis: 'y1',
                        hovertemplate: `${sensData.sweep_label}: %{x}<br>eta_th: %{y:.1f}%<extra></extra>`
                      }
                    ]}
                    layout={{
                      plot_bgcolor: 'transparent',
                      paper_bgcolor: 'transparent',
                      autosize: true,
                      margin: { t: 60, b: 60, l: 70, r: 70 },
                      showlegend: true,
                      legend: { font: { family: 'JetBrains Mono', size: 10, color: isLight ? '#0f172a' : 'white' }, x: 0.02, y: 0.98, bgcolor: 'transparent' },
                      xaxis: {
                        title: { text: sensData.sweep_label, font: { family: 'JetBrains Mono', size: 11, color: isLight ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.4)' } },
                        gridcolor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
                        tickfont: { family: 'JetBrains Mono', size: 10, color: isLight ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.3)' },
                      },
                      yaxis: {
                        title: { text: 'Spec Thrust / eta_th [Ns/kg | %]', font: { family: 'JetBrains Mono', size: 11, color: isLight ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.4)' } },
                        gridcolor: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)',
                        tickfont: { family: 'JetBrains Mono', size: 10, color: isLight ? 'rgba(15,23,42,0.4)' : 'rgba(255,255,255,0.3)' },
                        side: 'left'
                      },
                      yaxis2: {
                        title: { text: 'TSFC [mg/Ns]', font: { family: 'JetBrains Mono', size: 11, color: isLight ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.2)' } },
                        overlaying: 'y', side: 'right',
                        tickfont: { family: 'JetBrains Mono', size: 10, color: isLight ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.2)' },
                        showgrid: false
                      },
                      font: { family: 'Inter', color: isLight ? '#0f172a' : '#fff' }
                    }}
                    className="w-full h-full"
                    config={{ displayModeBar: false, responsive: true }}
                  />
                )}
                {!sensLoading && (!sensData || sensData.data?.length === 0) && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-white/10 uppercase tracking-[0.5em] text-[14px] font-black">
                      Select_Parameters_And_Run_Sweep
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
