import { describe, it, expect } from 'vitest'
import { calculateV2 } from './calculate-v2.js'
import { multiYearProfile } from './test-helpers.js'

const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [90, 90], peak: 700 })

const INPUTS = {
  cityData: { hourly, hoursPerYear, lat: 0, lon: 0 },
  firmCapacityMW: 100,
  firmnessThresholdPct: 90,
  backupCostPerMWh: 150,
  solarCostPerWdc: 0.388,
  solarDegradationPct: 0.5,
  solarOmPerKwdcYear: 12.5,
  batteryCostPerKwh: 165,
  pvToBatteryEffPct: 98.2,
  inverterEffPct: 98,
  batteryDodPct: 90,
  batteryDegradationPct: 2.6,
  batteryAugCycle: 8,
  batteryOmPerKwhYear: 5.9,
  gridCostPerWac: 0.076,
  inverterCostPerWac: 0.048,
  inverterReplacementCycle: 15,
  inverterReplacementFraction: 100,
  waccPct: 7.7,
  projectLifetime: 25,
  opexEscalationPct: 2.5,
  annualSolarCostDeclinePct: 3,
  annualBatteryCostDeclinePct: 5,
}

const FAST_SOLVER = {
  thresholdSweepPoints: [80, 90],
  solverSteps: 3,
  maxInnerIter: 5,
  bisectTolerance: 50,
}

describe('calculateV2', () => {
  it('returns a sweep and a selected current entry', () => {
    const r = calculateV2(INPUTS, FAST_SOLVER)
    expect(r.sweep.length).toBe(2)
    expect(r.sweep[0].thresholdPct).toBe(80)
    expect(r.sweep[1].thresholdPct).toBe(90)
    expect(r.current).toBeDefined()
    expect(r.current.thresholdPct).toBe(90)
  })

  it('projectionCurve covers 0..10 by default', () => {
    const r = calculateV2(INPUTS, FAST_SOLVER)
    expect(r.projectionCurve.length).toBe(11)
  })

  it('falls back to highest feasible threshold when requested threshold is unreachable', () => {
    const r = calculateV2({ ...INPUTS, firmnessThresholdPct: 99 }, FAST_SOLVER)
    expect(r.current.thresholdPct).toBe(90)
    expect(r.thresholdRequested).toBe(99)
    expect(r.thresholdAchieved).toBeLessThanOrEqual(r.thresholdRequested)
  })
})
