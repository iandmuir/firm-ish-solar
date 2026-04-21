import { describe, it, expect } from 'vitest'
import { simulateDispatch } from './dispatch.js'
import { flatProfile, sunnyDayProfile, multiYearProfile } from './test-helpers.js'

describe('simulateDispatch — trivial cases', () => {
  it('zero solar and zero battery: everything unmet', () => {
    const hourly = flatProfile(24, 0)
    const r = simulateDispatch({
      hourly, hoursPerYear: [24],
      solarMW: 0, batteryMWh: 0, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0, batteryDegPerYear: 0,
      solarRepowerYears: new Set(), batteryAugYears: new Set(),
    })
    expect(r.metHours).toBe(0)
    expect(r.totalHours).toBe(24)
    expect(r.firmnessAchieved).toBe(0)
    expect(r.deliveredByYear).toEqual([0])
    expect(r.unmetByYear[0]).toBeCloseTo(100 * 24, 5)
    expect(r.excessByYear).toEqual([0])
  })
})

describe('simulateDispatch — PV only', () => {
  it('oversized PV, zero battery: met exactly during daylight, unmet at night', () => {
    const hourly = sunnyDayProfile(1000)
    const r = simulateDispatch({
      hourly, hoursPerYear: [24],
      solarMW: 1000, batteryMWh: 0, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0, batteryDegPerYear: 0,
      solarRepowerYears: new Set(), batteryAugYears: new Set(),
    })
    expect(r.metHours).toBeGreaterThanOrEqual(10)
    expect(r.metHours).toBeLessThanOrEqual(12)
    expect(r.excessByYear[0]).toBeGreaterThan(0)
    expect(r.unmetByYear[0]).toBeGreaterThan(0)
  })
})

describe('simulateDispatch — battery round-trip', () => {
  it('delivered + curtailed <= PV generated × invEff (energy conservation)', () => {
    const hourly = sunnyDayProfile(800)
    const solarMW = 300
    const r = simulateDispatch({
      hourly, hoursPerYear: [24],
      solarMW, batteryMWh: 500, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0, batteryDegPerYear: 0,
      solarRepowerYears: new Set(), batteryAugYears: new Set(),
    })
    let pvDcTotal = 0
    for (const v of hourly) pvDcTotal += v
    pvDcTotal = pvDcTotal * solarMW / 1000
    const delivered = r.deliveredByYear[0]
    const curtailed = r.excessByYear[0]
    expect(delivered).toBeGreaterThan(0)
    expect(curtailed).toBeGreaterThanOrEqual(0)
    expect(delivered + curtailed).toBeLessThan(pvDcTotal + 500 * 0.9 + 1)
  })
})

describe('simulateDispatch — multi-year', () => {
  it('SoC carries across year boundaries (no reset to full each year)', () => {
    const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [1, 1], peak: 100 })
    // Weak-sun scenario: PV (50 MW × 100 W/kWp = 5 MW peak) never exceeds firm demand,
    // so the battery cannot recharge. Year 0 starts full and drains; year 1 starts
    // empty. If SoC were (buggily) reset to full each year, year 1 would match year 0
    // exactly. The correct behaviour is year 1 delivers LESS (more unmet) because
    // the battery cannot replenish.
    const r = simulateDispatch({
      hourly, hoursPerYear,
      solarMW: 50, batteryMWh: 100, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0, batteryDegPerYear: 0,
      solarRepowerYears: new Set(), batteryAugYears: new Set(),
    })
    // Year 1 has strictly more unmet — proof SoC did not refill to full.
    expect(r.unmetByYear[1]).toBeGreaterThan(r.unmetByYear[0])
    // Sanity bound: the carry-over shortfall should be roughly the year-0 battery
    // contribution (~90 MWh × invEff ≈ 87). Allow wide margin for floating point.
    const diff = r.unmetByYear[1] - r.unmetByYear[0]
    expect(diff).toBeGreaterThan(50)
    expect(diff).toBeLessThan(120)
  })

  it('firmnessAchieved = metHours / totalHours', () => {
    const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [1, 1], peak: 1000 })
    const r = simulateDispatch({
      hourly, hoursPerYear,
      solarMW: 500, batteryMWh: 500, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0, batteryDegPerYear: 0,
      solarRepowerYears: new Set(), batteryAugYears: new Set(),
    })
    expect(r.totalHours).toBe(48)
    expect(r.firmnessAchieved).toBeCloseTo(r.metHours / 48, 6)
  })
})

describe('simulateDispatch — month tallies', () => {
  it('unmetByMonth sums to unmetByYear total', () => {
    const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [365], peak: 300 })
    const r = simulateDispatch({
      hourly, hoursPerYear,
      solarMW: 50, batteryMWh: 50, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0, batteryDegPerYear: 0,
      solarRepowerYears: new Set(), batteryAugYears: new Set(),
    })
    const monthSum = r.unmetByMonth.reduce((a, b) => a + b, 0)
    expect(monthSum).toBeCloseTo(r.unmetByYear[0], 3)
  })
})

describe('simulateDispatch — degradation', () => {
  it('5% solar degradation over 2 years reduces year-1 PV vs year-0', () => {
    const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [365, 365], peak: 300 })
    const r = simulateDispatch({
      hourly, hoursPerYear,
      solarMW: 50, batteryMWh: 0, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0.05, batteryDegPerYear: 0,
      solarRepowerYears: new Set(), batteryAugYears: new Set(),
    })
    expect(r.deliveredByYear[1]).toBeLessThan(r.deliveredByYear[0])
    const drop = 1 - r.deliveredByYear[1] / r.deliveredByYear[0]
    expect(drop).toBeGreaterThan(0.03)
    expect(drop).toBeLessThan(0.07)
  })

  it('solar repower at year 1 resets solar degradation', () => {
    const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [365, 365], peak: 300 })
    const r = simulateDispatch({
      hourly, hoursPerYear,
      solarMW: 50, batteryMWh: 0, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0.05, batteryDegPerYear: 0,
      solarRepowerYears: new Set([1]), batteryAugYears: new Set(),
    })
    expect(Math.abs(r.deliveredByYear[0] - r.deliveredByYear[1])).toBeLessThan(100)
  })

  it('battery augmentation at year 1 resets battery degradation', () => {
    const { hourly, hoursPerYear } = multiYearProfile({ daysPerYear: [365, 365], peak: 1000 })
    // Need battery in the loop so deg matters. Oversize PV so surplus always charges.
    const common = {
      hourly, hoursPerYear,
      solarMW: 500, batteryMWh: 500, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0, batteryDegPerYear: 0.1, // heavy batt deg for signal
      solarRepowerYears: new Set(),
    }
    const noAug = simulateDispatch({ ...common, batteryAugYears: new Set() })
    const withAug = simulateDispatch({ ...common, batteryAugYears: new Set([1]) })
    // With aug at y=1, year 1 should deliver at least as much as without (deg reset helps)
    expect(withAug.deliveredByYear[1]).toBeGreaterThanOrEqual(noAug.deliveredByYear[1] - 1)
    // And by a non-trivial margin given 10% deg
    expect(withAug.deliveredByYear[1] - noAug.deliveredByYear[1]).toBeGreaterThan(0)
  })
})

describe('simulateDispatch — leap year month tables', () => {
  it('uses 366-day month starts for 8784-hour year', () => {
    // Generate 8784 hours of constant-zero profile
    const hourly = new Float32Array(8784)
    const hoursPerYear = [8784]
    const r = simulateDispatch({
      hourly, hoursPerYear,
      solarMW: 0, batteryMWh: 0, firmMW: 100,
      pvToBattEff: 0.982, invEff: 0.9624, dodPct: 90,
      solarDegPerYear: 0, batteryDegPerYear: 0,
      solarRepowerYears: new Set(), batteryAugYears: new Set(),
    })
    // Jan is hours [0, 744): 744h × 100 MW = 74,400 MWh unmet
    expect(r.unmetByMonth[0]).toBeCloseTo(74_400, 0)
    // Feb in leap year is hours [744, 1440): 696h × 100 MW = 69,600 MWh
    expect(r.unmetByMonth[1]).toBeCloseTo(69_600, 0)
    // Dec (leap) is hours [8040, 8784): 744h × 100 MW = 74,400 MWh
    expect(r.unmetByMonth[11]).toBeCloseTo(74_400, 0)
    // Sum still equals total unmet
    const sum = r.unmetByMonth.reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(r.unmetByYear[0], 2)
  })
})
