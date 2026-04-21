/**
 * Runtime loader for per-city PVGIS data. Lazy-fetches, decodes int16 → Float32,
 * and caches in module-level state. Safe to call repeatedly.
 */

const cache = new Map()

/** Decode a raw city JSON record into runtime form with Float32Array + yearOffsets. */
export function decodeCityData(raw) {
  const { scale, hourly, hoursPerYear } = raw
  const decoded = new Float32Array(hourly.length)
  for (let i = 0; i < hourly.length; i++) decoded[i] = hourly[i] * scale

  const yearOffsets = [0]
  let running = 0
  for (const h of hoursPerYear) {
    running += h
    yearOffsets.push(running)
  }

  return {
    name: raw.name,
    country: raw.country,
    lat: raw.lat, lon: raw.lon, elevation: raw.elevation,
    startYear: raw.startYear, endYear: raw.endYear,
    hoursPerYear,
    yearOffsets,
    hourly: decoded,
  }
}

/** Lazy-load a city's data by slug (e.g. 'KEN-nairobi'). Cached in-memory. */
export function loadCityData(slug) {
  if (cache.has(slug)) return cache.get(slug)
  const promise = (async () => {
    const res = await fetch(`/data/pvgis/${slug}.json`)
    if (!res.ok) throw new Error(`Failed to load ${slug}: ${res.status}`)
    const raw = await res.json()
    return decodeCityData(raw)
  })()
  cache.set(slug, promise)
  return promise
}

/** Test helper — resets in-memory cache. */
export function __resetLoaderCache() {
  cache.clear()
}
