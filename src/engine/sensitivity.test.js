import { describe, it, expect } from 'vitest'
import { runSensitivityAnalysis } from './sensitivity.js'
import { calculateV2 } from './calculate-v2.js'
import { multiYearProfile } from './test-helpers.js'
import { V2_DEFAULTS } from './constants-v2.js'

// Build a small synthetic city + baseline calc result we can perturb against.
// PVGIS-style hourly is W/kWp; existing dispatch tests use peak=500–600. Three
// sunny years at peak=600 yield a comfortably feasible sizing for default
// inputs so the perturbation paths exercise real numbers.
function makeFixture() {
  const cityData = multiYearProfile({ daysPerYear: [365, 365, 365], peak: 600 })
  const inputs = {
    cityData,
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
  const baseResult = calculateV2(inputs, { solverSteps: 6, maxInnerIter: 5 })
  return { inputs, baseResult, cityData }
}

describe('runSensitivityAnalysis', () => {
  it('returns [] when there is no feasible baseline', () => {
    const out = runSensitivityAnalysis({
      baseInputs: {}, baseResult: { current: null }, cityData: null,
    })
    expect(out).toEqual([])
  })

  it('returns one entry per param in ranges with swing >= 0', () => {
    const { inputs, baseResult, cityData } = makeFixture()
    const out = runSensitivityAnalysis({ baseInputs: inputs, baseResult, cityData })
    expect(out.length).toBeGreaterThan(15) // ~21 params
    for (const entry of out) {
      expect(entry.swing).toBeGreaterThanOrEqual(0)
      expect(entry.low.blendedLcoe).toBeGreaterThan(0)
      expect(entry.high.blendedLcoe).toBeGreaterThan(0)
    }
  })

  it('sorts results descending by swing', () => {
    const { inputs, baseResult, cityData } = makeFixture()
    const out = runSensitivityAnalysis({ baseInputs: inputs, baseResult, cityData })
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].swing).toBeGreaterThanOrEqual(out[i].swing)
    }
  })

  it('higher solar CAPEX produces higher blended LCOE', () => {
    const { inputs, baseResult, cityData } = makeFixture()
    const out = runSensitivityAnalysis({ baseInputs: inputs, baseResult, cityData })
    const solar = out.find(e => e.paramKey === 'solarCostPerWdc')
    expect(solar).toBeDefined()
    expect(solar.high.blendedLcoe).toBeGreaterThan(solar.low.blendedLcoe)
    expect(solar.swing).toBeGreaterThan(5) // material mover at NYC-class cost
  })

  it('higher WACC produces higher blended LCOE', () => {
    const { inputs, baseResult, cityData } = makeFixture()
    const out = runSensitivityAnalysis({ baseInputs: inputs, baseResult, cityData })
    const wacc = out.find(e => e.paramKey === 'waccPct')
    expect(wacc.high.blendedLcoe).toBeGreaterThan(wacc.low.blendedLcoe)
  })

  it('dispatch-affecting params (DoD) produce a non-zero swing', () => {
    const { inputs, baseResult, cityData } = makeFixture()
    const out = runSensitivityAnalysis({ baseInputs: inputs, baseResult, cityData })
    const dod = out.find(e => e.paramKey === 'batteryDodPct')
    expect(dod).toBeDefined()
    // DoD changes usable energy → changes unmet → changes backup cost.
    expect(dod.swing).toBeGreaterThan(0)
  })

  it('embeds baseLcoe equal to baseResult.current.costs.blendedLcoePerMWh', () => {
    const { inputs, baseResult, cityData } = makeFixture()
    const out = runSensitivityAnalysis({ baseInputs: inputs, baseResult, cityData })
    expect(out[0].baseLcoe).toBeCloseTo(baseResult.current.costs.blendedLcoePerMWh, 5)
  })

  it('runs in well under 500ms (performance contract for inline UI use)', () => {
    const { inputs, baseResult, cityData } = makeFixture()
    const start = Date.now()
    runSensitivityAnalysis({ baseInputs: inputs, baseResult, cityData })
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(500)
  })
})
