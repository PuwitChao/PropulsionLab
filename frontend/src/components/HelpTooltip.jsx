import React, { useState, useRef, useEffect, useId } from 'react'
import glossary from '../data/glossary'

/**
 * Inline accessible help tooltip for propulsion engineering terms.
 * Supports click, keyboard focus, Escape key dismiss, and screen reader announcements.
 */
export default function HelpTooltip({ term, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const tooltipId = useId()

  const key = term?.toLowerCase()
  const entry = glossary[key]

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const keyHandler = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  if (!entry) {
    return children ? <>{children}</> : null
  }

  return (
    <span className="relative inline-flex items-center gap-1" ref={ref}>
      {children}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget)) setOpen(false)
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-white/30 text-white/60 hover:text-white hover:border-white/80 transition-all text-[9px] font-black leading-none shrink-0 cursor-pointer"
        aria-label={`Help definition for ${entry.term}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
      >
        ?
      </button>
      {open && (
        <div 
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 bg-surface-container-high border border-white/30 p-8 shadow-xl text-left animate-in fade-in-0 zoom-in-95"
        >
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-white mb-3">
            {entry.term}
            {entry.unit && (
              <span className="ml-2 text-white/60 normal-case tracking-normal font-normal">
                [{entry.unit}]
              </span>
            )}
          </p>
          <p className="text-[11px] mono text-white/80 leading-relaxed">
            {entry.definition}
          </p>
        </div>
      )}
    </span>
  )
}
