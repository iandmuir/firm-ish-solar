import { describe, it, expect } from 'vitest'
import { findBenchmarkCrossovers } from './crossover.js'

function curve(systemLcoes, blendedLcoes) {
  return systemLcoes.map((s, i) => ({
    projectionYear: i,
    systemLcoePerMWh: s,
    blendedLcoePerMWh: blendedLcoes[i],
  }))
}

describe('findBenchmarkCrossovers', () => {
  it('returns null for both lines when benchmark is missing', () => {
    const c = curve([200, 180, 160], [220, 200, 180])
    expect(findBenchmarkCrossovers(c, null, 0)).toEqual({ system: null, blended: null })
  })

  it('finds a crossover when an LCOE line dips below a flat benchmark', () => {
    // System: 200 → 100 over 10 years (linear). Benchmark flat at $140.
    // Crosses 140 at year 6 (linear interpolation between the closest pair).
    const sys = Array.from({ length: 11 }, (_, i) => 200 - i * 10)
    const bld = Array.from({ length: 11 }, (_, i) => 250 - i * 10) // never crosses 140
    const result = findBenchmarkCrossovers(curve(sys, bld), 140, 0)
    expect(result.system?.yearsFromNow).toBeCloseTo(6, 5)
    expect(result.blended).toBeNull() // 250 → 150 at year 10, doesn't reach 140
  })

  it('returns null for a line that starts already below the benchmark', () => {
    // System starts at $80 (already below $140). Should be silent.
    const sys = Array.from({ length: 11 }, (_, i) => 80 - i * 2)
    const bld = Array.from({ length: 11 }, (_, i) => 200 - i * 8)
    const result = findBenchmarkCrossovers(curve(sys, bld), 140, 0)
    expect(result.system).toBeNull()
    expect(result.blended?.yearsFromNow).toBeCloseTo(7.5, 5)
  })

  it('handles benchmark escalation: rising benchmark catches a falling line earlier', () => {
    // System: 200 → 150 over 10 yrs. Benchmark: 140 escalating at 5%/yr.
    // Year 0: 200 vs 140 (above). Benchmark rises ~5%/yr — they meet sooner
    // than they would with a flat benchmark.
    const sys = Array.from({ length: 11 }, (_, i) => 200 - i * 5)
    const bld = sys.map(v => v + 30)
    const result = findBenchmarkCrossovers(curve(sys, bld), 140, 5)
    // Should cross within the 10-year window
    expect(result.system).not.toBeNull()
    expect(result.system.yearsFromNow).toBeGreaterThan(0)
    expect(result.system.yearsFromNow).toBeLessThan(10)
  })

  it('returns null when no crossover happens within the window', () => {
    // System stays well above a flat benchmark.
    const sys = Array.from({ length: 11 }, (_, i) => 300 - i * 5)
    const bld = sys
    const result = findBenchmarkCrossovers(curve(sys, bld), 140, 0)
    expect(result.system).toBeNull()
    expect(result.blended).toBeNull()
  })
})
