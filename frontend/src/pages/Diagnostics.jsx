import React, { useState, useEffect, useCallback } from 'react'
import { fetchData } from '../api'
import SliderControl from '../components/SliderControl'

export default function Diagnostics() {
  const [params, setParams] = useState({
    pt2: 101325.0,
    tt2: 288.15,
    pt3: 2026500.0,
    tt3: 731.35,
    pt4: 1945440.0,
    tt4: 1600.0,
    pt5: 291816.0,
    tt5: 1047.57,
    gamma_c: 1.4,
    gamma_t: 1.33,
  })

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const runDiagnostics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchData('/analyze/diagnostics', {
        method: 'POST',
        body: JSON.stringify(params),
      })
      setResult(data)
    } catch (e) {
      console.error(e)
      setError('Diagnostics solver returned an error. Ensure parameters are physically valid.')
    }
    setLoading(false)
  }, [params])

  // Run automatically when parameters change
  useEffect(() => {
    const t = setTimeout(runDiagnostics, 500)
    return () => clearTimeout(t)
  }, [params, runDiagnostics])

  const fmtPercent = (v) => (v != null ? `${(v * 100).toFixed(2)}%` : '-')

  return (
    <div className="space-y-16 animate-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="space-y-2">
          <h2 className="text-[14px] font-black tracking-[0.3em] text-white">REVERSE_ENGINE_DIAGNOSTICS</h2>
          <p className="mono text-[11px] text-white/30 uppercase tracking-widest">
            MODEL-BASED THERMODYNAMIC FAULT ISOLATION TERMINAL
          </p>
        </div>
        <div className="status-badge">
          SYS_MONITOR: {loading ? 'ANALYZING...' : result?.status || 'READY'}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-12">
        {/* Left Side: Sensor Telemetry Controls */}
        <section className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-surface-container-low border border-white/10 p-12 space-y-6">
            <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">COMPRESSOR_SENSORS</h2>
            <SliderControl
              label="Pt2 (Inlet P)"
              value={Math.round(params.pt2)}
              min={10000}
              max={200000}
              unit="Pa"
              step={1000}
              onChange={(v) => setParams({ ...params, pt2: v })}
            />
            <SliderControl
              label="Tt2 (Inlet T)"
              value={params.tt2.toFixed(1)}
              min={200}
              max={400}
              unit="K"
              step={0.5}
              onChange={(v) => setParams({ ...params, tt2: v })}
            />
            <SliderControl
              label="Pt3 (Outlet P)"
              value={Math.round(params.pt3)}
              min={100000}
              max={4000000}
              unit="Pa"
              step={10000}
              onChange={(v) => setParams({ ...params, pt3: v })}
            />
            <SliderControl
              label="Tt3 (Outlet T)"
              value={params.tt3.toFixed(1)}
              min={300}
              max={1000}
              unit="K"
              step={1}
              onChange={(v) => setParams({ ...params, tt3: v })}
            />
            <SliderControl
              label="gamma_c"
              value={params.gamma_c.toFixed(2)}
              min={1.1}
              max={1.6}
              unit=""
              step={0.01}
              onChange={(v) => setParams({ ...params, gamma_c: v })}
            />
          </div>

          <div className="bg-surface-container-low border border-white/10 p-12 space-y-6">
            <h2 className="text-[12px] font-black tracking-[0.3em] uppercase text-white mb-2">TURBINE_SENSORS</h2>
            <SliderControl
              label="Pt4 (Turbine Inlet P)"
              value={Math.round(params.pt4)}
              min={100000}
              max={4000000}
              unit="Pa"
              step={10000}
              onChange={(v) => setParams({ ...params, pt4: v })}
            />
            <SliderControl
              label="Tt4 (Turbine Inlet T)"
              value={params.tt4.toFixed(1)}
              min={800}
              max={2200}
              unit="K"
              step={5}
              onChange={(v) => setParams({ ...params, tt4: v })}
            />
            <SliderControl
              label="Pt5 (Turbine Exit P)"
              value={Math.round(params.pt5)}
              min={10000}
              max={1000000}
              unit="Pa"
              step={5000}
              onChange={(v) => setParams({ ...params, pt5: v })}
            />
            <SliderControl
              label="Tt5 (Turbine Exit T)"
              value={params.tt5.toFixed(1)}
              min={500}
              max={1500}
              unit="K"
              step={1}
              onChange={(v) => setParams({ ...params, tt5: v })}
            />
            <SliderControl
              label="gamma_t"
              value={params.gamma_t.toFixed(2)}
              min={1.1}
              max={1.6}
              unit=""
              step={0.01}
              onChange={(v) => setParams({ ...params, gamma_t: v })}
            />
          </div>
        </section>

        {/* Right Side: Diagnostics Analysis */}
        <section className="col-span-12 lg:col-span-8 space-y-8 flex flex-col justify-between">
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-surface-container-low border border-white/10 p-12 flex flex-col justify-between h-[180px] relative">
              <div className="panel-accent"></div>
              <div>
                <span className="text-[10px] font-mono text-white/30 tracking-widest block uppercase mb-3">COMPRESSOR_EFF</span>
                <span className="text-3xl font-black tracking-wider text-white mono">
                  {result ? fmtPercent(result.eta_c) : '-'}
                </span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[10px] font-mono text-white/40 uppercase">
                <span>ISENTROPIC_WORK</span>
                <span className={result?.eta_c < 0.84 ? 'warning-text font-bold' : 'text-white/60'}>
                  {result?.eta_c < 0.84 ? 'CRITICAL' : 'NOMINAL'}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low border border-white/10 p-12 flex flex-col justify-between h-[180px] relative">
              <div className="panel-accent"></div>
              <div>
                <span className="text-[10px] font-mono text-white/30 tracking-widest block uppercase mb-3">TURBINE_EFF</span>
                <span className="text-3xl font-black tracking-wider text-white mono">
                  {result ? fmtPercent(result.eta_t) : '-'}
                </span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[10px] font-mono text-white/40 uppercase">
                <span>EXPANSION_WORK</span>
                <span className={result?.eta_t < 0.86 ? 'warning-text font-bold' : 'text-white/60'}>
                  {result?.eta_t < 0.86 ? 'CRITICAL' : 'NOMINAL'}
                </span>
              </div>
            </div>

            <div className="bg-surface-container-low border border-white/10 p-12 flex flex-col justify-between h-[180px] relative">
              <div className="panel-accent"></div>
              <div>
                <span className="text-[10px] font-mono text-white/30 tracking-widest block uppercase mb-3">BURNER_DP_LOSS</span>
                <span className="text-3xl font-black tracking-wider text-white mono">
                  {result ? `${result.dp_b.toFixed(2)}%` : '-'}
                </span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between items-center text-[10px] font-mono text-white/40 uppercase">
                <span>COMBUSTOR_LOSS</span>
                <span className={result?.dp_b > 6.0 ? 'warning-text font-bold' : 'text-white/60'}>
                  {result?.dp_b > 6.0 ? 'CRITICAL' : 'NOMINAL'}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostics Status Report */}
          <div className="bg-surface-container-low border border-white/10 p-12 space-y-6">
            <h3 className="text-[13px] font-black tracking-[0.3em] text-white border-b border-white/10 pb-4">
              DIAGNOSTIC_ANALYSIS_REPORT
            </h3>
            {error ? (
              <div className="warning-panel p-8 warning-text font-mono text-[11px] uppercase tracking-widest leading-relaxed">
                {error}
              </div>
            ) : result ? (
              <div className="space-y-6 font-mono text-[12px] leading-relaxed">
                <div className="flex items-center gap-6">
                  <span className="text-white/30 uppercase tracking-widest">SYSTEM_STATUS:</span>
                  <span
                    className={`font-black tracking-[0.2em] px-6 py-2 border uppercase text-[11px] ${
                      result.status === 'NOMINAL'
                        ? 'border-white bg-white/15 text-white'
                        : 'warning-panel'
                    }`}
                  >
                    {result.status}
                  </span>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <span className="text-white/30 uppercase tracking-widest block mb-2">FAULT_DIAGNOSTIC_CODES:</span>
                  {result.alerts.length > 0 ? (
                    result.alerts.map((alt, i) => (
                      <div key={i} className="flex flex-col gap-2 p-6 warning-panel-soft">
                        <span className="font-bold tracking-widest text-[11px]">{alt}</span>
                        <p className="text-white/60 text-[11px] uppercase tracking-[0.05em]">{result.messages[i]}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 border border-white/10 bg-white/5 text-white/70">
                      <span className="font-bold tracking-widest text-[11px]">ALL_SYSTEMS_NOMINAL</span>
                      <p className="text-white/50 text-[11px] mt-2 uppercase tracking-[0.05em]">{result.messages[0]}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-white/20 font-mono text-[11px] uppercase tracking-widest">
                Loading physical diagnostic models...
              </div>
            )}
          </div>

          {/* Mathematical Trace Log */}
          <div className="space-y-4">
            <div className="flex items-center gap-6 border-b border-white/10 pb-4">
              <span className="material-symbols-outlined !text-[20px] text-white/40">history_edu</span>
              <h3 className="text-[13px] font-black tracking-[0.3em]">DIAGNOSTIC_SOLVER_TRACE</h3>
            </div>
            <div className="bg-surface-container-lowest border border-white/10 p-10 h-[220px] overflow-auto custom-scrollbar">
              <div className="space-y-4 font-mono text-[11px] text-white/40 uppercase tracking-[0.1em] leading-relaxed">
                {result?.math_trace?.length > 0 ? (
                  result.math_trace.map((t, i) => (
                    <div key={i} className="flex gap-4 items-start">
                      <span className="text-white/20">{(i + 1).toString().padStart(2, '0')}</span>
                      <span>{t}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-white/10 italic">Trace log empty - solver executing.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
