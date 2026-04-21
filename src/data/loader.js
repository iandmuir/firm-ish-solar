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

/**
 * Fetch a gzipped JSON resource and parse it. Uses DecompressionStream
 * (Node 18+, Chrome 80+, Firefox 113+, Safari 16.4+).
 */
async function fetchGzippedJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`)
  // Some dev servers (e.g. Vite) set Content-Encoding: gzip on .gz files, in
  // which case the browser has already decompressed the body. Static hosts
  // (GitHub Pages) serve .gz as opaque bytes, so we decompress manually.
  if (res.headers.get('content-encoding') === 'gzip') {
    return res.json()
  }
  const decompressed = res.body.pipeThrough(new DecompressionStream('gzip'))
  return new Response(decompressed).json()
}

/** Lazy-load a city's data by slug (e.g. 'KEN-nairobi'). Cached in-memory. */
export function loadCityData(slug) {
  if (cache.has(slug)) return cache.get(slug)
  const promise = (async () => {
    const base = import.meta.env?.BASE_URL ?? '/'
    const baseNormalized = base.endsWith('/') ? base : `${base}/`
    const raw = await fetchGzippedJson(`${baseNormalized}data/pvgis/${slug}.json.gz`)
    return decodeCityData(raw)
  })()
  cache.set(slug, promise)
  return promise
}

/** Test helper — resets in-memory cache. */
export function __resetLoaderCache() {
  cache.clear()
}
