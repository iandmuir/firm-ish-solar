// Pure utility: find the year (if any) at which each LCOE projection line
// crosses *below* an escalating benchmark, within the projection window.
//
// Curve points are assumed monotonic in projectionYear and are walked
// pairwise. For each line we look for the first segment where the LCOE−bench
// delta flips from positive to ≤0, then linearly interpolate within the
// segment to get a sub-year crossover year.
//
// If a line starts at or below the benchmark at year 0, we return null —
// "already winning" is conveyed by the green status frame in the headline,
// not by a future-parity callout.

export function findBenchmarkCrossovers(curve, benchmarkLcoe, benchmarkEscalationPct = 0) {
  if (benchmarkLcoe == null || !curve || curve.length === 0) {
    return { system: null, blended: null }
  }
  const esc = (benchmarkEscalationPct ?? 0) / 100
  const benchAt = (year) => benchmarkLcoe * Math.pow(1 + esc, year)

  return {
    system:  findCrossoverForLine(curve, benchAt, 'systemLcoePerMWh'),
    blended: findCrossoverForLine(curve, benchAt, 'blendedLcoePerMWh'),
  }
}

function findCrossoverForLine(curve, benchAt, key) {
  // Already at/below benchmark at year 0 → no future-parity callout.
  const first = curve[0]
  if (first == null) return null
  const firstLcoe = first[key]
  if (firstLcoe == null) return null
  const firstDelta = firstLcoe - benchAt(first.projectionYear)
  if (firstDelta <= 0) return null

  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i]
    const b = curve[i + 1]
    const lcoeA = a[key]
    const lcoeB = b[key]
    if (lcoeA == null || lcoeB == null) continue
    const deltaA = lcoeA - benchAt(a.projectionYear)
    const deltaB = lcoeB - benchAt(b.projectionYear)
    // Look for first descending sign-flip: > 0 → ≤ 0.
    if (deltaA > 0 && deltaB <= 0) {
      // Linear interpolation: solve delta(t) = (1-t)·deltaA + t·deltaB = 0
      // t = deltaA / (deltaA − deltaB). Both deltaA > 0 and deltaA − deltaB > 0
      // (because deltaB ≤ 0), so the denominator is safely positive.
      const t = deltaA / (deltaA - deltaB)
      const yearsFromNow = a.projectionYear + t * (b.projectionYear - a.projectionYear)
      const lcoeAtCrossover = lcoeA + t * (lcoeB - lcoeA)
      return { yearsFromNow, lcoeAtCrossover }
    }
  }
  return null
}
