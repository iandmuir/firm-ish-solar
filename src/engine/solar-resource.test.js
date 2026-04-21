import { describe, it, expect } from 'vitest'
import { computeDailyResourceCurve } from './solar-resource.js'

function fakeCity({ years = 3, leap = [], dailyKwh = 5 } = {}) {
  // Build hourly data where every day has constant kW == dailyKwh/24 so daily
  // total equals dailyKwh.
  const hoursPerYear = []
  let total = 0
  for (let y = 0; y < years; y++) {
    const isLeap = leap.includes(y)
    const h = isLeap ? 366 * 24 : 365 * 24
    hoursPerYear.push(h)
    total += h
  }
  const hourly = new Float32Array(total)
  const perHour = dailyKwh / 24
  for (let i = 0; i < total; i++) hourly[i] = perHour
  return { hourly, hoursPerYear }
}

describe('computeDailyResourceCurve', () => {
  it('returns 365 rows with month metadata', () => {
    const curve = computeDailyResourceCurve(fakeCity(), { smoothingWindow: 1 })
    expect(curve.length).toBe(365)
    expect(curve[0].doy).toBe(0)
    expect(curve[0].month).toBe(0)
    expect(curve[30].month).toBe(0) // doy 30 is Jan 31
    expect(curve[31].month).toBe(1) // doy 31 is Feb 1
    expect(curve[364].month).toBe(11) // Dec 31
  })

  it('constant input yields constant daily total and zero-width band', () => {
    const curve = computeDailyResourceCurve(fakeCity({ dailyKwh: 5 }), { smoothingWindow: 1 })
    for (const row of curve) {
      expect(row.median).toBeCloseTo(5, 5)
      expect(row.p10).toBeCloseTo(5, 5)
      expect(row.p90).toBeCloseTo(5, 5)
    }
  })

  it('p90 >= median >= p10 for variable data', () => {
    // Make years differ: year 0 = 3, year 1 = 5, year 2 = 7
    const hoursPerYear = [365 * 24, 365 * 24, 365 * 24]
    const total = hoursPerYear.reduce((a, b) => a + b, 0)
    const hourly = new Float32Array(total)
    const dailyTotals = [3, 5, 7]
    let off = 0
    for (let y = 0; y < 3; y++) {
      const perHour = dailyTotals[y] / 24
      for (let i = 0; i < hoursPerYear[y]; i++) hourly[off + i] = perHour
      off += hoursPerYear[y]
    }
    const curve = computeDailyResourceCurve({ hourly, hoursPerYear }, { smoothingWindow: 1 })
    for (const row of curve) {
      expect(row.p90).toBeGreaterThanOrEqual(row.median)
      expect(row.median).toBeGreaterThanOrEqual(row.p10)
      expect(row.median).toBeCloseTo(5, 5)
    }
  })

  it('handles leap years by dropping Feb 29', () => {
    // 4 years, year 1 is leap. All constant so results should match non-leap case.
    const curve = computeDailyResourceCurve(
      fakeCity({ years: 4, leap: [1], dailyKwh: 4 }),
      { smoothingWindow: 1 },
    )
    expect(curve.length).toBe(365)
    for (const row of curve) expect(row.median).toBeCloseTo(4, 5)
  })

  it('applies rolling-mean smoothing', () => {
    // Spike one day to an extreme; smoothed value should be pulled toward neighbors.
    const hoursPerYear = [365 * 24]
    const hourly = new Float32Array(365 * 24).fill(5 / 24)
    // Make doy 100 have a huge value
    for (let h = 0; h < 24; h++) hourly[100 * 24 + h] = 100 / 24
    const raw = computeDailyResourceCurve({ hourly, hoursPerYear }, { smoothingWindow: 1 })
    const smoothed = computeDailyResourceCurve({ hourly, hoursPerYear }, { smoothingWindow: 7 })
    expect(raw[100].median).toBeCloseTo(100, 5)
    expect(smoothed[100].median).toBeLessThan(raw[100].median)
    expect(smoothed[100].median).toBeGreaterThan(5)
  })
})
