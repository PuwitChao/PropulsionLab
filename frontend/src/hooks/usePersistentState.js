/**
 * usePersistentState — drop-in replacement for useState that also
 * syncs to localStorage so work is preserved across page refreshes.
 *
 * Usage:
 *   const [state, setState] = usePersistentState('storageKey', initialValue)
 */
import { useState, useEffect, useCallback } from 'react'

function tryParse(value, fallback) {
  if (value === null || value === undefined) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function usePersistentState(key, initialValue) {
  const [state, setStateRaw] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return tryParse(saved, initialValue)
    } catch {
      return initialValue
    }
  })

  // Persist whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state))
    } catch (e) {
      console.warn(`usePersistentState: could not persist "${key}"`, e)
    }
  }, [key, state])

  const setState = useCallback((value) => {
    setStateRaw(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      return next
    })
  }, [])

  return [state, setState]
}

export default usePersistentState
