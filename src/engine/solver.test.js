import { describe, it, expect } from 'vitest'
import { solveSizing, solveSizingSweep } from './solver.js'
import { multiYearProfile } from './test-helpers.js'

const effs = {
  pvToBattEff: 0.982, pvToGridEff: 0.98, battToGridEff: 0.9624, dodPct: 90,
  solarDegPerYear: 0, batteryDegPerYear: 0,
  batteryAugYears: new Set(),
}

describe('solveSizing', () => {
  it('marks infeasible when max battery cannot reach threshold', () => {
    // Zero-sun profile over a full year: no amount of solar can help,
    // and 3,600 MWh battery cannot carry 100 MW for 95% of 8,760 h.
    const hoursPerYear = [8760]
    const hourly = new Float32Array(8760) // all zeros
    const r = solveSizing({
      hourly, hoursPerYear, firmMW: 100, ...effs,
      thresholdPct: 95,
      capexPerMWSolar: 388000, capexPerMWhBattery: 165000,
      solarMWMin: 150, solarMWMax: 800, solarSteps: 4,
      batteryMWhMin: 0, batteryMWhMax: 3600,
    })
    expect(r.feasible).toBe(false)
  })
})

describe('solveSizing — feasible', () => {
  it('returns sizing whose dispatch achieves ≥ threshold', () => {
    const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [30], peak: 800 })
    const r = solveSizing({
      hourly, hoursPerYear, firmMW: 100, ...effs,
      thresholdPct: 80,
      capexPerMWSolar: 388000, capexPerMWhBattery: 165000,
      solarMWMin: 150, solarMWMax: 800, solarSteps: 5,
      batteryMWhMin: 0, batteryMWhMax: 2000,
      bisectTolerance: 10, maxInnerIter: 8,
    })
    expect(r.feasible).toBe(true)
    expect(r.dispatch.firmnessAchieved).toBeGreaterThanOrEqual(0.80 - 0.001)
  })

  it('higher threshold ⇒ no cheaper solution', () => {
    const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [30], peak: 800 })
    const common = {
      hourly, hoursPerYear, firmMW: 100, ...effs,
      capexPerMWSolar: 388000, capexPerMWhBattery: 165000,
      solarMWMin: 150, solarMWMax: 800, solarSteps: 5,
      batteryMWhMin: 0, batteryMWhMax: 2000,
      bisectTolerance: 10, maxInnerIter: 8,
    }
    const r80 = solveSizing({ ...common, thresholdPct: 80 })
    const r95 = solveSizing({ ...common, thresholdPct: 95 })
    const cost80 = r80.solarMW * 388000 + r80.batteryMWh * 165000
    const cost95 = r95.solarMW * 388000 + r95.batteryMWh * 165000
    expect(cost95).toBeGreaterThanOrEqual(cost80 - 1)
  })
})

describe('solveSizingSweep', () => {
  it('returns one result per threshold, tagged with thresholdPct', () => {
    const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [30], peak: 800 })
    const results = solveSizingSweep({
      hourly, hoursPerYear, firmMW: 100, ...effs,
      thresholds: [70, 80, 90],
      capexPerMWSolar: 388000, capexPerMWhBattery: 165000,
      solarMWMin: 150, solarMWMax: 800, solarSteps: 4,
      batteryMWhMin: 0, batteryMWhMax: 2000,
      bisectTolerance: 10, maxInnerIter: 6,
    })
    expect(results.length).toBe(3)
    expect(results.map(r => r.thresholdPct)).toEqual([70, 80, 90])
    expect(results.every(r => r.feasible)).toBe(true)
  })
})
