#!/usr/bin/env node
// One-off: sweep every PVGIS city with default inputs at the highest feasible
// threshold and report the largest battery sizing. Used to calibrate the
// batteryMWhMax ceiling in calculate-v2.js.

import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { calculateV2 } from '../src/engine/calculate-v2.js'
import { V2_DEFAULTS } from '../src/engine/constants-v2.js'
import { decodeFromInt16 } from './build-city-data.mjs'

const PVGIS_DIR = path.resolve('public/data/pvgis')
const files = fs.readdirSync(PVGIS_DIR).filter(f => f.endsWith('.json.gz'))

const baseInputs = {
  firmCapacityMW: V2_DEFAULTS.firmCapacityMW,
  firmnessThresholdPct: V2_DEFAULTS.firmnessThresholdPct,
  backupCostPerMWh: V2_DEFAULTS.backupCostPerMWh,
  solarCostPerWdc: V2_DEFAULTS.solarCostPerWdc,
  solarDegradationPct: V2_DEFAULTS.solarDegradationPct,
  solarOmPerKwdcYear: V2_DEFAULTS.solarOmPerKwdcYear,
  batteryCostPerKwh: V2_DEFAULTS.batteryCostPerKwh,
  pvToBatteryEffPct: V2_DEFAULTS.pvToBatteryEffPct,
  inverterEffPct: V2_DEFAULTS.inverterEffPct,
  batteryDodPct: V2_DEFAULTS.batteryDodPct,
  batteryChemicalRtePct: V2_DEFAULTS.batteryChemicalRtePct,
  batteryDegradationPct: V2_DEFAULTS.batteryDegradationPct,
  batteryAugCycle: V2_DEFAULTS.batteryAugCycle,
  batteryOmPerKwhYear: V2_DEFAULTS.batteryOmPerKwhYear,
  gridCostPerWac: V2_DEFAULTS.gridCostPerWac,
  inverterCostPerWac: V2_DEFAULTS.inverterCostPerWac,
  inverterReplacementCycle: V2_DEFAULTS.inverterReplacementCycle,
  inverterReplacementFraction: V2_DEFAULTS.inverterReplacementFraction,
  waccPct: V2_DEFAULTS.waccPct,
  projectLifetime: V2_DEFAULTS.projectLifetime,
  opexEscalationPct: V2_DEFAULTS.opexEscalationPct,
  annualSolarCostDeclinePct: V2_DEFAULTS.annualSolarCostDeclinePct,
  annualBatteryCostDeclinePct: V2_DEFAULTS.annualBatteryCostDeclinePct,
}

const FAST = { solverSteps: 10, maxInnerIter: 8, bisectTolerance: 5 }

const results = []
const start = Date.now()
let i = 0
for (const fname of files) {
  i++
  const gzipped = fs.readFileSync(path.join(PVGIS_DIR, fname))
  const raw = JSON.parse(zlib.gunzipSync(gzipped).toString('utf8'))
  const hourly = decodeFromInt16(new Int16Array(raw.hourly), raw.scale)
  const cityData = { hourly, hoursPerYear: raw.hoursPerYear }
  try {
    const r = calculateV2({ ...baseInputs, cityData }, FAST)
    const maxFeasible = r.sweep.filter(e => e.feasible).reduce((acc, e) =>
      e.thresholdPct > (acc?.thresholdPct ?? 0) ? e : acc, null)
    if (maxFeasible) {
      results.push({
        slug: fname.replace('.json.gz', ''),
        threshold: maxFeasible.thresholdPct,
        battMWh: maxFeasible.batteryMWh,
        hoursEquiv: maxFeasible.batteryMWh / baseInputs.firmCapacityMW,
      })
    }
  } catch (err) {
    console.error(`${fname}: ${err.message}`)
  }
  if (i % 20 === 0) process.stderr.write(`${i}/${files.length} (${((Date.now()-start)/1000).toFixed(0)}s)\n`)
}

results.sort((a, b) => b.hoursEquiv - a.hoursEquiv)
console.log('\nTop 20 by battery hours-equivalent (at highest feasible threshold):\n')
console.log('  hours   threshold  city')
for (const r of results.slice(0, 20)) {
  console.log(`  ${r.hoursEquiv.toFixed(1).padStart(5)}     ${String(r.threshold).padStart(3)}%       ${r.slug}`)
}
console.log(`\nGlobal max: ${results[0].hoursEquiv.toFixed(1)} h (${results[0].slug})`)
console.log(`Total time: ${((Date.now()-start)/1000).toFixed(1)}s across ${results.length} cities`)
