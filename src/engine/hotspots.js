// Pure transform: turn the per-day-of-year unmet-hour histogram into a small set
// of "shortfall hotspot" windows for the Daily Solar Resource overlay.
//
// Anchored on **unmet hours** (count, not MWh) so the percentage stays
// consistent with the firmness % shown in the headline panel — both are
// hour-based gates against the firmW target.
//
// Algorithm (matches the spec):
//   1. Compute rolling windowDays-sum across the 365-day array.
//   2. Repeatedly pick argmax → mask ±(windowDays - 1) so windows can't overlap.
//   3. Stop after N picks, or when no positive window remains.
//   4. Return windows sorted ascending by startDoy so chips read ① ② ③ in
//      calendar order, not severity.
//
// No calendar wraparound: a Dec→Jan event splits cleanly into two features.

export function findHotspots(unmetHoursByDoy, { n = 3, windowDays = 7 } = {}) {
  const empty = { windows: [], paretoPct: 0, totalUnmetHours: 0 }
  if (!unmetHoursByDoy || unmetHoursByDoy.length === 0) return empty

  const days = unmetHoursByDoy.length // 365
  let totalUnmetHours = 0
  for (let i = 0; i < days; i++) totalUnmetHours += unmetHoursByDoy[i]
  if (totalUnmetHours === 0) return empty

  // Rolling window sums. windowUnmet[d] = sum(unmetHoursByDoy[d..d+windowDays-1]).
  const lastStart = days - windowDays
  const windowUnmet = new Array(lastStart + 1).fill(0)
  let running = 0
  for (let i = 0; i < windowDays; i++) running += unmetHoursByDoy[i]
  windowUnmet[0] = running
  for (let d = 1; d <= lastStart; d++) {
    running += unmetHoursByDoy[d + windowDays - 1] - unmetHoursByDoy[d - 1]
    windowUnmet[d] = running
  }

  // Greedy pick + mask. masked[] guards startDoy candidates; we mask
  // ±(windowDays - 1) around each pick so chosen windows never overlap.
  const masked = new Array(windowUnmet.length).fill(false)
  const picks = []
  for (let pickIdx = 0; pickIdx < n; pickIdx++) {
    let bestD = -1
    let bestVal = 0
    for (let d = 0; d < windowUnmet.length; d++) {
      if (masked[d]) continue
      if (windowUnmet[d] > bestVal) {
        bestVal = windowUnmet[d]
        bestD = d
      }
    }
    if (bestD < 0) break // nothing positive left
    picks.push({ startDoy: bestD, unmetHours: bestVal })
    const lo = Math.max(0, bestD - (windowDays - 1))
    const hi = Math.min(windowUnmet.length - 1, bestD + (windowDays - 1))
    for (let d = lo; d <= hi; d++) masked[d] = true
  }

  picks.sort((a, b) => a.startDoy - b.startDoy)

  let windowsUnmetSum = 0
  const windows = picks.map(p => {
    windowsUnmetSum += p.unmetHours
    return {
      startDoy: p.startDoy,
      endDoy: p.startDoy + windowDays - 1,
      unmetHours: p.unmetHours,
      paretoPct: (p.unmetHours / totalUnmetHours) * 100,
    }
  })

  return {
    windows,
    paretoPct: (windowsUnmetSum / totalUnmetHours) * 100,
    totalUnmetHours,
  }
}
