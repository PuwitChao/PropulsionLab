import React, { useState, useRef, useEffect } from 'react'
import glossary from '../data/glossary'

/**
 * Inline help tooltip for propulsion engineering terms.
 *
 * Usage:
 *   <HelpTooltip term="surge margin">SURGE MARGIN</HelpTooltip>
 *   <HelpTooltip term="bpr" />   ← renders "?" icon only
 *
 * The `term` prop is matched case-insensitively against glossary.js keys.
 */
export default function HelpTooltip({ term, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const key = term?.toLowerCase()
  const entry = glossary[key]

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!entry) {
    return children ? <>{children}</> : null
  }

  return (
    <span className="relative inline-flex items-center gap-1" ref={ref}>
      {children}
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-white/20 text-white/30 hover:text-white hover:border-white/60 transition-all text-[8px] font-black leading-none shrink-0"
        title={`What is ${entry.term}?`}
        aria-label={`Help: ${entry.term}`}
      >
        ?
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-surface-container-high border border-white/20 p-8 shadow-xl text-left animate-in fade-in-0 zoom-in-95">
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white mb-3">
            {entry.term}
            {entry.unit && (
              <span className="ml-2 text-white/40 normal-case tracking-normal font-normal">
                [{entry.unit}]
              </span>
            )}
          </p>
          <p className="text-[11px] mono text-white/60 leading-relaxed">
            {entry.definition}
          </p>
        </div>
      )}
    </span>
  )
}
