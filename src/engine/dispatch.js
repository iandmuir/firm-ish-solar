const MONTH_START_365 = [0, 744, 1416, 2160, 2880, 3624, 4344, 5088, 5832, 6552, 7296, 8016]
const MONTH_START_366 = [0, 744, 1440, 2184, 2904, 3648, 4368, 5112, 5856, 6576, 7320, 8040]

/** Numerical noise floor for "delivered meets firm" check. Firm targets are ≥ 1e8 W. */
const FIRM_MET_EPS_W = 1e-6

export function simulateDispatch({
  hourly, hoursPerYear,
  solarMW, batteryMWh, firmMW,
  pvToBattEff, pvToGridEff, battToGridEff, dodPct,
  chemOneWayEff = 1,
  solarDegPerYear, batteryDegPerYear,
  batteryAugYears,
}) {
  if (pvToBattEff <= 0) throw new Error('pvToBattEff must be > 0')
  if (pvToGridEff <= 0) throw new Error('pvToGridEff must be > 0')
  if (battToGridEff <= 0) throw new Error('battToGridEff must be > 0')
  if (chemOneWayEff <= 0) throw new Error('chemOneWayEff must be > 0')
  const totalHours = hourly.length
  const years = hoursPerYear.length
  const firmW = firmMW * 1e6
  const solarKwp = solarMW * 1000
  const batteryWhNameplate = batteryMWh * 1e6
  const dod = dodPct / 100

  const deliveredByYear = new Array(years).fill(0)
  const unmetByYear = new Array(years).fill(0)
  const excessByYear = new Array(years).fill(0)
  const metHoursByYear = new Array(years).fill(0)
  const unmetByMonth = new Array(12).fill(0)
  // Per-day-of-year unmet-hour counter, summed across all weather years. Used by
  // the shortfall-hotspots overlay on the Daily Solar Resource chart. Indexed by
  // non-leap day-of-year [0..364]; Feb 29 hours skip the bucket (matching the
  // pattern in solar-resource.js) but still feed unmetByYear/unmetByMonth.
  const unmetHoursByDoy = new Array(365).fill(0)
  let metHours = 0

  let soc = 0
  let batteryYearsSinceReset = 0
  let hourCursor = 0

  for (let y = 0; y < years; y++) {
    if (y === 0 || batteryAugYears.has(y)) batteryYearsSinceReset = 0
    // Solar degrades continuously over project life — no repowering reset.
    const solarDegFactor = Math.pow(1 - solarDegPerYear, y)
    const batteryDegFactor = Math.pow(1 - batteryDegPerYear, batteryYearsSinceReset)
    const usableBatteryWh = batteryWhNameplate * dod * batteryDegFactor
    if (y === 0) soc = usableBatteryWh

    const hoursThisYear = hoursPerYear[y]
    const isLeap = hoursThisYear === 8784
    const table = isLeap ? MONTH_START_366 : MONTH_START_365
    let currentMonth = 0
    for (let h = 0; h < hoursThisYear; h++) {
      while (currentMonth < 11 && h >= table[currentMonth + 1]) currentMonth++

      const pvDc = hourly[hourCursor] * solarKwp * solarDegFactor

      const directAcMax = pvDc * pvToGridEff
      const directAc = directAcMax < firmW ? directAcMax : firmW
      const pvUsedForDirect = directAc / pvToGridEff
      const pvRemainingDc = pvDc - pvUsedForDirect

      // Charging: PV surplus pays DC-DC (silicon) and one-way chemical (heat in cells)
      // before landing in the SoC bucket. chargeDcUsed inverts both to find raw PV used.
      const headroom = usableBatteryWh - soc
      const chargeCombinedEff = pvToBattEff * chemOneWayEff
      const potentialChargeAtSoc = pvRemainingDc * chargeCombinedEff
      const actualCharge = potentialChargeAtSoc < headroom ? potentialChargeAtSoc : headroom
      const chargeDcUsed = actualCharge / chargeCombinedEff
      const pvCurtailedDc = pvRemainingDc - chargeDcUsed
      soc += actualCharge

      // Discharging: energy drained from SoC pays one-way chemical and DC-AC inverter
      // before reaching the grid. PV-side DC-DC is bypassed (battery sits on regulated bus).
      const deficitAc = firmW - directAc
      let batteryAc = 0
      if (deficitAc > 0) {
        const dischargeCombinedEff = battToGridEff * chemOneWayEff
        const batteryWhNeeded = deficitAc / dischargeCombinedEff
        const actualDischarge = batteryWhNeeded < soc ? batteryWhNeeded : soc
        batteryAc = actualDischarge * dischargeCombinedEff
        soc -= actualDischarge
      }

      const deliveredAc = directAc + batteryAc
      const unmetAc = firmW - deliveredAc
      deliveredByYear[y] += deliveredAc
      unmetByYear[y] += unmetAc
      excessByYear[y] += pvCurtailedDc
      unmetByMonth[currentMonth] += unmetAc
      if (deliveredAc >= firmW - FIRM_MET_EPS_W) {
        metHours++
        metHoursByYear[y]++
      } else {
        // Non-leap day-of-year mapping: Feb 29 (calendarDay === 59 in a leap
        // year) skips the bucket so the 365-element array stays aligned with
        // calendar days the same way solar-resource.js does it.
        const calendarDay = (h / 24) | 0
        if (!isLeap) {
          unmetHoursByDoy[calendarDay]++
        } else if (calendarDay !== 59) {
          unmetHoursByDoy[calendarDay > 59 ? calendarDay - 1 : calendarDay]++
        }
      }

      hourCursor++
    }

    batteryYearsSinceReset++
  }

  const whToMwh = 1e-6
  for (let y = 0; y < years; y++) {
    deliveredByYear[y] *= whToMwh
    unmetByYear[y] *= whToMwh
    excessByYear[y] *= whToMwh
  }
  for (let m = 0; m < 12; m++) unmetByMonth[m] *= whToMwh

  const firmnessByYear = metHoursByYear.map((m, y) => m / hoursPerYear[y])

  return {
    deliveredByYear,
    unmetByYear,
    excessByYear,
    unmetByMonth,
    unmetHoursByDoy,
    metHours,
    metHoursByYear,
    firmnessByYear,
    totalHours,
    firmnessAchieved: metHours / totalHours,
  }
}
