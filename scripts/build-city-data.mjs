import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import cities from '../src/data/cities.json' with { type: 'json' }

const CACHE_DIR = path.resolve('scripts/.cache')
const OUT_DIR = path.resolve('src/data/pvgis')
const SCALE = 0.1  // 1 int16 unit = 0.1 W/kWp; max ≈ 3276 W (plenty of headroom)

/**
 * Extract hourly P values + metadata from a raw PVGIS seriescalc response.
 * Returns { hourly: number[], hoursPerYear: number[], startYear, endYear, lat, lon, elevation }.
 */
export function extractHourlyFromPvgis(raw) {
  if (!raw?.outputs?.hourly || !Array.isArray(raw.outputs.hourly)) {
    throw new Error('Invalid PVGIS response: missing outputs.hourly array')
  }
  if (!raw?.inputs?.meteo_data) {
    throw new Error('Invalid PVGIS response: missing inputs.meteo_data')
  }
  if (!raw?.inputs?.location) {
    throw new Error('Invalid PVGIS response: missing inputs.location')
  }
  const hourly = raw.outputs.hourly.map(h => h.P)
  const hoursPerYear = []
  let prevYear = null
  let count = 0
  for (const h of raw.outputs.hourly) {
    const y = parseInt(h.time.slice(0, 4), 10)
    if (prevYear === null) prevYear = y
    if (y !== prevYear) {
      if (y < prevYear) {
        throw new Error(`Non-monotonic year in PVGIS hourly series: ${y} after ${prevYear}`)
      }
      hoursPerYear.push(count)
      count = 0
      prevYear = y
    }
    count++
  }
  hoursPerYear.push(count)

  return {
    startYear: raw.inputs.meteo_data.year_min,
    endYear: raw.inputs.meteo_data.year_max,
    lat: raw.inputs.location.latitude,
    lon: raw.inputs.location.longitude,
    elevation: raw.inputs.location.elevation,
    hourly,
    hoursPerYear,
  }
}

/** Encode float array → Int16Array (clamped non-negative). */
export function encodeToInt16(values, scale) {
  const out = new Int16Array(values.length)
  let overflowCount = 0
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    const clamped = v < 0 ? 0 : v
    let scaled = Math.round(clamped / scale)
    if (scaled > 32767) {
      overflowCount++
      scaled = 32767
    }
    out[i] = scaled
  }
  if (overflowCount > 0) {
    console.warn(`encodeToInt16: ${overflowCount} value(s) exceeded Int16 max (scale=${scale}); clamped to 32767`)
  }
  return out
}

/** Decode Int16Array → Float32Array. */
export function decodeFromInt16(encoded, scale) {
  const out = new Float32Array(encoded.length)
  for (let i = 0; i < encoded.length; i++) out[i] = encoded[i] * scale
  return out
}

function outputFilename(city) {
  const slug = city.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${city.iso3}-${slug}.json`
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  let done = 0, skipped = 0

  for (const city of cities) {
    const cacheFile = path.join(CACHE_DIR, outputFilename(city))
    if (!fs.existsSync(cacheFile)) {
      skipped++
      continue
    }
    const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    const meta = extractHourlyFromPvgis(raw)
    const encoded = encodeToInt16(meta.hourly, SCALE)

    const out = {
      name: city.city,
      country: city.iso3,
      lat: meta.lat, lon: meta.lon, elevation: meta.elevation,
      startYear: meta.startYear, endYear: meta.endYear,
      hoursPerYear: meta.hoursPerYear,
      scale: SCALE,
      hourly: Array.from(encoded),  // JSON-serialisable
    }

    const outPath = path.join(OUT_DIR, outputFilename(city))
    fs.writeFileSync(outPath, JSON.stringify(out))
    done++
  }

  console.log(`Preprocessed ${done} cities (${skipped} skipped — no cache).`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1) })
}
