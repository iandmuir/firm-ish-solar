/**
 * Sweep all PVGIS cities at 70% firmness, find min battery needed at
 * solar = 12× firmMW (the easiest overbuild case). Reports the global
 * minimum across sites — the physical floor below which no site needs
 * any less battery.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { decodeCityData } from '../src/data/loader.js'
import { simulateDispatch } from '../src/engine/dispatch.js'
import { V2_DEFAULTS } from '../src/engine/constants-v2.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pvgisDir = path.join(__dirname, '..', 'public', 'data', 'pvgis')
const files = fs.readdirSync(pvgisDir).filter(f => f.endsWith('.json.gz'))

const firmMW = 100
const threshold = 0.70
const solarMultipliers = [3, 6, 12]

const d = V2_DEFAULTS
const dispatchBase = {
  pvToBattEff: d.pvToBatteryEffPct / 100,
  pvToGridEff: (d.pvToBatteryEffPct / 100) * (d.inverterEffPct / 100),
  battToGridEff: d.inverterEffPct / 100,
  chemOneWayEff: Math.sqrt(d.batteryChemicalRtePct / 100),
  dodPct: d.batteryDodPct,
  solarDegPerYear: d.solarDegradationPct / 100,
  batteryDegPerYear: d.batteryDegradationPct / 100,
  batteryAugYears: new Set(), // worst-case: no augmentation
  firmMW,
}

function firmnessAt(city, solarMW, batteryMWh) {
  return simulateDispatch({
    ...dispatchBase,
    hourly: city.hourly,
    hoursPerYear: city.hoursPerYear,
    solarMW,
    batteryMWh,
  }).firmnessAchieved
}

function minBattery(city, solarMW, threshold) {
  const batMax = 72 * firmMW
  if (firmnessAt(city, solarMW, batMax) < threshold) return null
  if (firmnessAt(city, solarMW, 0) >= threshold) return 0
  let lo = 0, hi = batMax
  for (let i = 0; i < 20; i++) {
    if (hi - lo <= 0.5) break
    const mid = (lo + hi) / 2
    if (firmnessAt(city, solarMW, mid) >= threshold) hi = mid
    else lo = mid
  }
  return hi
}

const results = []
let done = 0
for (const f of files) {
  const raw = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(pvgisDir, f))))
  const city = decodeCityData(raw)
  const row = { slug: f.replace('.json.gz', ''), name: city.name, country: city.country }
  for (const mult of solarMultipliers) {
    const mb = minBattery(city, mult * firmMW, threshold)
    row[`s${mult}x`] = mb
  }
  results.push(row)
  done++
  if (done % 50 === 0) process.stderr.write(`${done}/${files.length}\n`)
}

for (const mult of solarMultipliers) {
  const key = `s${mult}x`
  const feasible = results.filter(r => r[key] !== null)
  const infeasible = results.length - feasible.length
  const ratios = feasible.map(r => r[key] / firmMW).sort((a, b) => a - b)
  console.log(`\n=== solar = ${mult}× firmMW, threshold = ${threshold * 100}% ===`)
  console.log(`feasible sites: ${feasible.length}/${results.length} (infeasible: ${infeasible})`)
  if (ratios.length) {
    console.log(`min   battery/firmMW MWh: ${ratios[0].toFixed(2)}`)
    console.log(`p05                     : ${ratios[Math.floor(ratios.length * 0.05)].toFixed(2)}`)
    console.log(`p50                     : ${ratios[Math.floor(ratios.length * 0.50)].toFixed(2)}`)
    console.log(`p95                     : ${ratios[Math.floor(ratios.length * 0.95)].toFixed(2)}`)
    console.log(`max                     : ${ratios[ratios.length - 1].toFixed(2)}`)
    const lowest5 = feasible.sort((a, b) => a[key] - b[key]).slice(0, 5)
    console.log(`lowest 5 sites:`)
    for (const r of lowest5) console.log(`  ${r.slug.padEnd(32)} ${(r[key] / firmMW).toFixed(2)} MWh/MW`)
  }
}
