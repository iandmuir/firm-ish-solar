import { useState, useEffect } from 'react'
import { calculateV2 } from '../engine/calculate-v2.js'

/**
 * Runs calculateV2 whenever inputs or cityData change. `calculating` is true
 * between input change and next result landing. Errors are captured to `error`.
 * Note: engine is synchronous but ~600ms; running it inside useEffect lets
 * React paint the loading state first.
 */
export function useCalculateV2(inputs, cityData) {
  const [state, setState] = useState({ results: null, calculating: false, error: null })

  useEffect(() => {
    if (!cityData) {
      setState({ results: null, calculating: false, error: null })
      return
    }
    setState(s => ({ ...s, calculating: true, error: null }))
    // Defer to next tick so React paints "calculating" first.
    const id = setTimeout(() => {
      try {
        const r = calculateV2({ ...inputs, cityData })
        setState({ results: r, calculating: false, error: null })
      } catch (e) {
        console.error('calculateV2 error:', e)
        setState({ results: null, calculating: false, error: e })
      }
    }, 0)
    return () => clearTimeout(id)
  }, [inputs, cityData])

  return state
}
