#!/usr/bin/env node
// Fetch global annual GHI from NASA POWER climatology at 1° resolution.
// The API maxes out at 10°×10° per request, so we iterate across 18×36 = 648
// tiles. Each tile is cached to .cache/ghi/ so re-running is cheap; only
// missing tiles are re-fetched. Output: .cache/ghi-grid.json — a dense
// 360×180 array of annual kWh/m²/day values (rows north→south, cols west→east),
// with null for missing cells (mostly antarctic / polar holes).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = path.join(__dirname, '.cache', 'ghi')
const OUT_FILE  = path.join(__dirname, '.cache', 'ghi-grid.json')

fs.mkdirSync(CACHE_DIR, { recursive: true })

const TILE = 10 // degrees per fetch (NASA POWER regional max)
const SLEEP_MS = 250 // gentle throttle between requests

const tiles = []
for (let lat = -90; lat < 90; lat += TILE) {
  for (let lon = -180; lon < 180; lon += TILE) {
    tiles.push({ lat, lon })
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function fetchTile({ lat, lon }) {
  const key = `lat${lat}_lon${lon}.json`
  const cacheFile = path.join(CACHE_DIR, key)
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
  }
  const url = new URL('https://power.larc.nasa.gov/api/temporal/climatology/regional')
  url.searchParams.set('parameters', 'ALLSKY_SFC_SW_DWN')
  url.searchParams.set('community', 'RE')
  url.searchParams.set('longitude-min', String(lon))
  url.searchParams.set('longitude-max', String(lon + TILE))
  url.searchParams.set('latitude-min', String(lat))
  url.searchParams.set('latitude-max', String(lat + TILE))
  url.searchParams.set('format', 'JSON')

  let lastErr
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const j = await r.json()
      fs.writeFileSync(cacheFile, JSON.stringify(j))
      return j
    } catch (e) {
      lastErr = e
      await sleep(1000 * (attempt + 1))
    }
  }
  throw lastErr
}

// Grid: 180 rows (lat from +89.5 to -89.5), 360 cols (lon from -179.5 to +179.5).
const rows = 180
const cols = 360
const grid = Array.from({ length: rows }, () => Array(cols).fill(null))

const total = tiles.length
let done = 0
for (const t of tiles) {
  try {
    const j = await fetchTile(t)
    for (const f of (j.features || [])) {
      const [lon, lat] = f.geometry.coordinates
      const ann = f.properties?.parameter?.ALLSKY_SFC_SW_DWN?.ANN
      if (ann == null || ann === -999 || !Number.isFinite(ann)) continue
      // API returns cells at half-integer centers, e.g. -9.5, 0.5, ...
      // Map to row/col of our 360x180 grid.
      const col = Math.round(lon + 179.5) // 0 .. 359
      const row = Math.round(89.5 - lat)  // 0 .. 179
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        grid[row][col] = ann
      }
    }
  } catch (e) {
    console.error(`  FAIL tile lat=${t.lat} lon=${t.lon}:`, e.message)
  }
  done++
  if (done % 20 === 0 || done === total) {
    process.stdout.write(`\r  ${done}/${total} tiles…`)
  }
  await sleep(SLEEP_MS)
}
process.stdout.write('\n')

// Stats
let filled = 0
let sum = 0, min = Infinity, max = -Infinity
for (const row of grid) for (const v of row) {
  if (v == null) continue
  filled++
  sum += v
  if (v < min) min = v
  if (v > max) max = v
}
console.log(`  filled ${filled}/${rows * cols} cells (${(filled / (rows * cols) * 100).toFixed(1)}%)`)
console.log(`  range: ${min.toFixed(2)} … ${max.toFixed(2)} kWh/m²/day  (mean ${(sum / filled).toFixed(2)})`)

fs.writeFileSync(OUT_FILE, JSON.stringify({
  rows, cols,
  rowLatDeg: 1, // each row is 1°
  colLonDeg: 1,
  topLat: 89.5,
  leftLon: -179.5,
  units: 'kWh/m^2/day',
  source: 'NASA POWER climatology (ALLSKY_SFC_SW_DWN, annual)',
  grid,
}))
console.log(`  wrote ${OUT_FILE}`)
