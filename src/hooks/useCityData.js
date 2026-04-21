import { useState, useEffect } from 'react'
import { loadCityData } from '../data/loader.js'

/**
 * Async-loads a city's PVGIS data by slug. Returns { data, loading, error }.
 * Safe to swap slugs; stale responses are discarded.
 */
export function useCityData(slug) {
  const [state, setState] = useState({ data: null, loading: true, error: null })

  useEffect(() => {
    if (!slug) {
      setState({ data: null, loading: false, error: null })
      return
    }
    let cancelled = false
    setState(s => ({ ...s, loading: true, error: null }))
    loadCityData(slug).then(
      data => { if (!cancelled) setState({ data, loading: false, error: null }) },
      err  => { if (!cancelled) setState({ data: null, loading: false, error: err }) },
    )
    return () => { cancelled = true }
  }, [slug])

  return state
}
