import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import cities from '../src/data/cities.json' with { type: 'json' }

const CACHE_DIR = path.resolve('scripts/.cache')
const PVGIS_BASE = 'https://re.jrc.ec.europa.eu/api/v5_3/seriescalc'

export function buildPvgisUrl({ lat, lon, startyear = 2005, endyear = 2023 }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    startyear: String(startyear),
    endyear: String(endyear),
    pvcalculation: '1',
    peakpower: '1',
    loss: '0',
    optimalangles: '1',
    mountingplace: 'free',
    outputformat: 'json',
    browser: '0',
  })
  return `${PVGIS_BASE}?${params}`
}

function cacheKey(city) {
  return `${city.iso3}-${city.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
}

async function fetchOne(city) {
  const cachePath = path.join(CACHE_DIR, cacheKey(city))
  if (fs.existsSync(cachePath)) {
    return { city, cached: true }
  }
  const url = buildPvgisUrl({ lat: city.lat, lon: city.lon })
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${city.iso3}/${city.city} → ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = await res.text()  // keep as text to preserve byte-for-byte
  fs.writeFileSync(cachePath, json)
  return { city, cached: false }
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  let done = 0, failed = 0
  const failures = []

  // Rate-limit: PVGIS allows 30 req/sec; we go slower (≈5 req/sec) to be polite.
  for (const city of cities) {
    try {
      const { cached } = await fetchOne(city)
      done++
      process.stdout.write(`\r[${done}/${cities.length}] ${city.iso3}/${city.city} ${cached ? '(cached)' : 'fetched'}          `)
      if (!cached) await new Promise(r => setTimeout(r, 200))
    } catch (e) {
      failed++
      failures.push({ city, error: e.message })
      process.stdout.write(`\n  FAIL ${city.iso3}/${city.city}: ${e.message}\n`)
    }
  }
  console.log(`\nDone. ${done} OK, ${failed} failed.`)
  if (failures.length) {
    fs.writeFileSync(
      path.join(CACHE_DIR, '_failures.json'),
      JSON.stringify(failures, null, 2),
    )
    console.log(`Failures logged to scripts/.cache/_failures.json`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1) })
}
