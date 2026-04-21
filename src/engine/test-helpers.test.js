import { describe, it, expect } from 'vitest'
import { flatProfile, sunnyDayProfile, multiYearProfile } from './test-helpers.js'

describe('flatProfile', () => {
  it('returns Float32Array of length n with constant value', () => {
    const p = flatProfile(10, 500)
    expect(p).toBeInstanceOf(Float32Array)
    expect(p.length).toBe(10)
    expect(Array.from(p)).toEqual(Array(10).fill(500))
  })
})

describe('sunnyDayProfile', () => {
  it('returns 24 hours: zero at night, peak at noon', () => {
    const p = sunnyDayProfile(1000)
    expect(p.length).toBe(24)
    expect(p[0]).toBe(0)
    expect(p[23]).toBe(0)
    expect(p[12]).toBe(1000) // peak at noon
    expect(p[6]).toBe(0)     // before sunrise
    expect(p[18]).toBe(0)    // after sunset
  })

  it('is non-negative everywhere', () => {
    const p = sunnyDayProfile(500)
    for (const v of p) expect(v).toBeGreaterThanOrEqual(0)
  })

  it('totals 6000 Wh/day at peak=1000 (half-sine over 12 daylight hours)', () => {
    const p = sunnyDayProfile(1000)
    const total = Array.from(p).reduce((a, b) => a + b, 0)
    // Half-sine from hour 6 to 18, peak at 12. Integral ≈ peak * 12 * 2/π ≈ 7639.
    expect(total).toBeGreaterThan(7000)
    expect(total).toBeLessThan(8200)
  })
})

describe('multiYearProfile', () => {
  it('concatenates days into a continuous sequence', () => {
    const p = multiYearProfile({ daysPerYear: [2, 3], peak: 100 })
    // 2 days year 0 (48h) + 3 days year 1 (72h) = 120h
    expect(p.hourly.length).toBe(120)
    expect(p.hoursPerYear).toEqual([48, 72])
  })
})
