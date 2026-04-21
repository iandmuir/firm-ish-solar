/** Constant value across n hours. */
export function flatProfile(n, value) {
  const out = new Float32Array(n)
  out.fill(value)
  return out
}

/**
 * 24-hour profile: half-sine from hour 6 to 18, zero otherwise.
 * Peak value at noon. Simulates an idealised sunny day.
 */
export function sunnyDayProfile(peak) {
  const out = new Float32Array(24)
  for (let h = 6; h < 18; h++) {
    // half-sine over 12 daylight hours, peak at h=12
    const phase = ((h - 6) / 12) * Math.PI
    out[h] = peak * Math.sin(phase)
  }
  return out
}

/**
 * Concatenate N sunny days per year into one continuous series.
 * Returns { hourly: Float32Array, hoursPerYear: number[] }.
 */
export function multiYearProfile({ daysPerYear, peak }) {
  const totalHours = daysPerYear.reduce((a, d) => a + d * 24, 0)
  const hourly = new Float32Array(totalHours)
  const day = sunnyDayProfile(peak)
  let cursor = 0
  const hoursPerYear = []
  for (const days of daysPerYear) {
    for (let d = 0; d < days; d++) {
      hourly.set(day, cursor)
      cursor += 24
    }
    hoursPerYear.push(days * 24)
  }
  return { hourly, hoursPerYear }
}
