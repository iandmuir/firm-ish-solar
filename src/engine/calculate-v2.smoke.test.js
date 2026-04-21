import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { calculateV2 } from './calculate-v2.js'
import { decodeFromInt16 } from '../../scripts/build-city-data.mjs'

// PVGIS data now lives gzipped under public/data/pvgis/<slug>.json.gz.
const PVGIS_DIR = path.resolve('public/data/pvgis')
const TEST_CITY = 'USA-new-york-city.json.gz'
const TEST_PATH = path.join(PVGIS_DIR, TEST_CITY)
const available = fs.existsSync(TEST_PATH)

describe.skipIf(!available)('calculateV2 smoke test with real PVGIS data', () => {
  it('runs against NYC data and returns sane LCOE', () => {
    const gzipped = fs.readFileSync(TEST_PATH)
    const raw = JSON.parse(zlib.gunzipSync(gzipped).toString('utf8'))
    const hourly = decodeFromInt16(new Int16Array(raw.hourly), raw.scale)
    const cityData = { hourly, hoursPerYear: raw.hoursPerYear }

    const start = Date.now()
    const r = calculateV2({
      cityData,
      firmCapacityMW: 100,
      firmnessThresholdPct: 95,
      backupCostPerMWh: 150,
      solarCostPerWdc: 0.388,
      solarDegradationPct: 0.5,
      solarRepowerCycle: 12,
      solarRepowerFraction: 35,
      solarOmPerKwdcYear: 12.5,
      batteryCostPerKwh: 0.165,
      pvToBatteryEffPct: 98.2,
      inverterEffPct: 96.24,
      batteryDodPct: 90,
      batteryDegradationPct: 2.6,
      batteryAugCycle: 8,
      batteryOmPerKwhYear: 5.9,
      gridCostPerWac: 0.076,
      inverterCostPerWac: 0.048,
      softCostPct: 10,
      waccPct: 7.7,
      projectLifetime: 25,
      opexEscalationPct: 2.5,
      annualSolarCostDeclinePct: 3,
      annualBatteryCostDeclinePct: 5,
    })
    const elapsed = Date.now() - start

    console.log(`calculateV2 elapsed: ${elapsed} ms`)
    console.log(`systemLcoe: $${r.current.costs.systemLcoePerMWh.toFixed(2)}/MWh`)
    console.log(`blendedLcoe: $${r.current.costs.blendedLcoePerMWh.toFixed(2)}/MWh`)
    console.log(`sizing: solar=${r.current.solarMW.toFixed(0)} MW, battery=${r.current.batteryMWh.toFixed(0)} MWh`)
    console.log(`firmness achieved: ${(r.current.dispatch.firmnessAchieved * 100).toFixed(2)}%`)

    expect(r.sweep.length).toBe(8)
    expect(r.current).toBeDefined()
    expect(r.current.costs.systemLcoePerMWh).toBeGreaterThan(50)
    expect(r.current.costs.systemLcoePerMWh).toBeLessThan(600)
    expect(r.current.costs.blendedLcoePerMWh).toBeGreaterThanOrEqual(r.current.costs.systemLcoePerMWh)

    expect(elapsed).toBeLessThan(60_000)
  }, { timeout: 90_000 })
})
