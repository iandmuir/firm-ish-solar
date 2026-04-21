/**
 * Compute per-day-of-year solar resource statistics across all PVGIS years.
 *
 * Input: cityData.hourly is kW per kWp-installed at hourly resolution; summed
 * over 24 hours it yields kWh/kWp/day. Leap days (Feb 29 → day-of-year 60 in
 * leap years) are dropped so we can report a clean 365-day "typical year".
 *
 * Returns 365 rows of { doy, month, median, p10, p90 } with a 7-day centered
 * rolling mean applied to each series to smooth the noise from only ~19
 * samples per day.
 */

const DAYS_IN_MONTH_NONLEAP = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return NaN
  if (sortedAsc.length === 1) return sortedAsc[0]
  const idx = (p / 100) * (sortedAsc.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sortedAsc[lo]
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo)
}

function median(sortedAsc) {
  return percentile(sortedAsc, 50)
}

function rollingMean(values, window) {
  const half = Math.floor(window / 2)
  const n = values.length
  const out = new Array(n)
  for (let i = 0; i < n; i++) {
    let sum = 0
    let count = 0
    for (let j = i - half; j <= i + half; j++) {
      if (j >= 0 && j < n) {
        sum += values[j]
        count++
      }
    }
    out[i] = sum / count
  }
  return out
}

function doyToMonth(doy) {
  // doy is 0-indexed, non-leap calendar
  let remaining = doy
  for (let m = 0; m < 12; m++) {
    if (remaining < DAYS_IN_MONTH_NONLEAP[m]) return m
    remaining -= DAYS_IN_MONTH_NONLEAP[m]
  }
  return 11
}

/**
 * Build the per-day distribution from an hourly PVGIS record.
 * @param {Object} cityData - { hourly: Float32Array, hoursPerYear: number[] }
 * @param {Object} [opts]
 * @param {number} [opts.smoothingWindow=7] - odd integer window for rolling mean
 * @returns {Array<{doy:number, month:number, median:number, p10:number, p90:number}>}
 */
export function computeDailyResourceCurve(cityData, opts = {}) {
  const { hourly, hoursPerYear } = cityData
  const smoothingWindow = opts.smoothingWindow ?? 7

  // For each day-of-year (0..364), collect one daily total from each year.
  // Drop Feb 29 in leap years (day-of-year 59 in 0-indexed leap calendar).
  const buckets = Array.from({ length: 365 }, () => [])

  let offset = 0
  for (const yearHours of hoursPerYear) {
    const daysThisYear = Math.round(yearHours / 24)
    const isLeap = daysThisYear === 366

    for (let d = 0; d < daysThisYear; d++) {
      // Skip Feb 29 (0-indexed day 59 in leap years: Jan=31, Feb 1..29 = 31..59)
      if (isLeap && d === 59) continue

      // Map calendar day to non-leap day-of-year
      const doy = isLeap && d > 59 ? d - 1 : d

      let daySum = 0
      const dayStart = offset + d * 24
      for (let h = 0; h < 24; h++) daySum += hourly[dayStart + h]
      buckets[doy].push(daySum)
    }
    offset += yearHours
  }

  // Compute raw percentile series
  const rawMedian = new Array(365)
  const rawP10 = new Array(365)
  const rawP90 = new Array(365)
  for (let doy = 0; doy < 365; doy++) {
    const sorted = buckets[doy].slice().sort((a, b) => a - b)
    rawMedian[doy] = median(sorted)
    rawP10[doy] = percentile(sorted, 10)
    rawP90[doy] = percentile(sorted, 90)
  }

  // Smooth each series independently
  const smMedian = rollingMean(rawMedian, smoothingWindow)
  const smP10 = rollingMean(rawP10, smoothingWindow)
  const smP90 = rollingMean(rawP90, smoothingWindow)

  const out = new Array(365)
  for (let doy = 0; doy < 365; doy++) {
    out[doy] = {
      doy,
      month: doyToMonth(doy),
      median: smMedian[doy],
      p10: smP10[doy],
      p90: smP90[doy],
    }
  }
  return out
}
