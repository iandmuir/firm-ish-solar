// One-off: refetch PVGIS data for near-equator cities whose cached response
// came back degraded (PVGIS optimal-angle solver errors out near lat 0).
// Bypasses the raw-JSON cache and writes straight through to the compressed
// output file. Run once, then delete this script.
//
// Usage: node scripts/refetch-equatorial.mjs
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import cities from '../src/data/cities.json' with { type: 'json' }
import { buildPvgisUrl } from './fetch-pvgis.mjs'
import { extractHourlyFromPvgis, encodeToInt16 } from './build-city-data.mjs'

const CACHE_DIR = path.resolve('scripts/.cache')
const OUT_DIR = path.resolve('public/data/pvgis')
const SCALE = 0.1

// Scan existing output files and flag anything with annual yield < 900 kWh/kWp
// AND |lat| < 20° — these are the PVGIS optimal-angle failures. (High-lat
// cities with low yield are legitimately low, not broken.)
function findAffected() {
  const affected = []
  for (const city of cities) {
    const slug = `${city.iso3}-${city.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    const gz = path.join(OUT_DIR, `${slug}.json.gz`)
    if (!fs.existsSync(gz)) continue
    const d = JSON.parse(zlib.gunzipSync(fs.readFileSync(gz)).toString())
    let sum = 0
    for (const v of d.hourly) sum += v
    const years = d.hourly.length / 8760
    const annual = (sum * d.scale) / (1000 * years)
    if (annual < 900 && Math.abs(city.lat) < 20) {
      affected.push({ city, slug, annual: annual.toFixed(0) })
    }
  }
  return affected
}

async function refetchAndRebuild(city, slug) {
  // Skip the raw cache — fetch fresh with latitude-based tilt fallback.
  const angle = Math.round(Math.abs(city.lat))
  const url = buildPvgisUrl({ lat: city.lat, lon: city.lon, angle })
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${slug} → ${res.status}: ${(await res.text()).slice(0, 200)}`)
  }
  const raw = await res.json()

  // Also overwrite the cache file so future runs of build-city-data are consistent.
  fs.writeFileSync(path.join(CACHE_DIR, `${slug}.json`), JSON.stringify(raw))

  const meta = extractHourlyFromPvgis(raw)
  const encoded = encodeToInt16(meta.hourly, SCALE)
  const out = {
    name: city.city,
    country: city.iso3,
    lat: meta.lat, lon: meta.lon, elevation: meta.elevation,
    startYear: meta.startYear, endYear: meta.endYear,
    hoursPerYear: meta.hoursPerYear,
    scale: SCALE,
    hourly: Array.from(encoded),
  }
  const gzipped = zlib.gzipSync(JSON.stringify(out), { level: 9 })
  const outPath = path.join(OUT_DIR, `${slug}.json.gz`)
  fs.writeFileSync(outPath + '.tmp', gzipped)
  fs.renameSync(outPath + '.tmp', outPath)

  // Return new annual yield for sanity check.
  let sum = 0
  for (const v of encoded) sum += v
  const years = encoded.length / 8760
  return (sum * SCALE) / (1000 * years)
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const affected = findAffected()
  console.log(`Found ${affected.length} near-equator cities with suspiciously low yield. Refetching…\n`)
  for (const { city, slug, annual } of affected) {
    try {
      const newAnnual = await refetchAndRebuild(city, slug)
      console.log(`  ${slug.padEnd(32)} ${annual} → ${newAnnual.toFixed(0)} kWh/kWp`)
      await new Promise(r => setTimeout(r, 250)) // be polite to PVGIS
    } catch (e) {
      console.log(`  ${slug.padEnd(32)} FAILED: ${e.message}`)
    }
  }
  console.log(`\nDone.`)
}

main().catch(e => { console.error(e); process.exit(1) })
