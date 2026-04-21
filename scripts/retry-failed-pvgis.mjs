#!/usr/bin/env node
/**
 * One-off: retry the 12 cities that failed the initial PVGIS fetch
 * with small coordinate nudges. For each failure, try a sequence of
 * (dLat, dLon) offsets and take the first one that returns data.
 *
 * Reports what worked (so we can update cities.json) and what didn't
 * (so we can drop it from the city list).
 */
import fs from 'node:fs'
import path from 'node:path'
import { buildPvgisUrl } from './fetch-pvgis.mjs'

const CACHE_DIR = path.resolve('scripts/.cache')
const FAILURES = JSON.parse(
  fs.readFileSync(path.join(CACHE_DIR, '_failures.json'), 'utf8'),
)

// Nudge offsets to try in order: same point, then small square pattern.
const NUDGES = [
  [0, 0],        // original (baseline — skip if same as prior failure)
  [0.1, 0],      // 11 km north
  [-0.1, 0],     // 11 km south
  [0, 0.1],      // 11 km east
  [0, -0.1],     // 11 km west
  [0.3, 0],      // 33 km north
  [-0.3, 0],     // 33 km south
  [0.5, 0.5],    // diagonal NE
  [-0.5, -0.5],  // diagonal SW
  [1.0, 0],      // 111 km north (last resort)
  [-1.0, 0],
]

function cacheKey(city) {
  return `${city.iso3}-${city.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
}

async function tryFetch(lat, lon) {
  const url = buildPvgisUrl({ lat, lon })
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, status: res.status, body: body.slice(0, 120) }
  }
  return { ok: true, text: await res.text() }
}

async function retryCity(entry) {
  const { city } = entry
  console.log(`\n=== ${city.iso3}/${city.city} (${city.lat}, ${city.lon}) ===`)
  for (const [dLat, dLon] of NUDGES) {
    const lat = +(city.lat + dLat).toFixed(5)
    const lon = +(city.lon + dLon).toFixed(5)
    if (dLat === 0 && dLon === 0) continue // baseline already failed
    process.stdout.write(`  try (${dLat >= 0 ? '+' : ''}${dLat}, ${dLon >= 0 ? '+' : ''}${dLon}) → (${lat}, ${lon}) ... `)
    try {
      const r = await tryFetch(lat, lon)
      if (r.ok) {
        console.log('OK')
        const cachePath = path.join(CACHE_DIR, cacheKey(city))
        const tmp = cachePath + '.tmp'
        fs.writeFileSync(tmp, r.text)
        fs.renameSync(tmp, cachePath)
        return { city, success: true, nudge: [dLat, dLon], actualLat: lat, actualLon: lon }
      } else {
        console.log(`FAIL ${r.status}: ${r.body.slice(0, 60)}`)
      }
    } catch (e) {
      console.log(`ERR ${e.message.slice(0, 80)}`)
    }
    await new Promise(r => setTimeout(r, 250))
  }
  console.log(`  → GIVING UP on ${city.iso3}/${city.city}`)
  return { city, success: false }
}

async function main() {
  const results = []
  for (const entry of FAILURES) {
    results.push(await retryCity(entry))
  }

  console.log('\n\n========= SUMMARY =========')
  const ok = results.filter(r => r.success)
  const still = results.filter(r => !r.success)
  console.log(`Recovered: ${ok.length} / ${results.length}`)
  for (const r of ok) {
    console.log(`  ${r.city.iso3}/${r.city.city}: nudged to (${r.actualLat}, ${r.actualLon})`)
  }
  if (still.length) {
    console.log(`Still failing:`)
    for (const r of still) console.log(`  ${r.city.iso3}/${r.city.city}`)
  }
  // Write results for downstream consumers
  fs.writeFileSync(
    path.join(CACHE_DIR, '_retry-results.json'),
    JSON.stringify(results, null, 2),
  )
}

main().catch(e => { console.error(e); process.exit(1) })
