const MONTH_START_365 = [0, 744, 1416, 2160, 2880, 3624, 4344, 5088, 5832, 6552, 7296, 8016]
const MONTH_START_366 = [0, 744, 1440, 2184, 2904, 3648, 4368, 5112, 5856, 6576, 7320, 8040]

function monthOfHour(hourInYear, hoursInYear) {
  const table = hoursInYear === 8784 ? MONTH_START_366 : MONTH_START_365
  for (let m = 11; m >= 0; m--) {
    if (hourInYear >= table[m]) return m
  }
  return 0
}

export function simulateDispatch({
  hourly, hoursPerYear,
  solarMW, batteryMWh, firmMW,
  pvToBattEff, invEff, dodPct,
  solarDegPerYear, batteryDegPerYear,
  solarRepowerYears, batteryAugYears,
}) {
  const totalHours = hourly.length
  const years = hoursPerYear.length
  const firmW = firmMW * 1e6
  const solarKwp = solarMW * 1000
  const batteryWhNameplate = batteryMWh * 1e6
  const dod = dodPct / 100

  const deliveredByYear = new Array(years).fill(0)
  const unmetByYear = new Array(years).fill(0)
  const excessByYear = new Array(years).fill(0)
  const unmetByMonth = new Array(12).fill(0)
  let metHours = 0

  let soc = 0
  let solarYearsSinceReset = 0
  let batteryYearsSinceReset = 0
  let hourCursor = 0

  for (let y = 0; y < years; y++) {
    if (y === 0 || solarRepowerYears.has(y)) solarYearsSinceReset = 0
    if (y === 0 || batteryAugYears.has(y)) batteryYearsSinceReset = 0
    const solarDegFactor = Math.pow(1 - solarDegPerYear, solarYearsSinceReset)
    const batteryDegFactor = Math.pow(1 - batteryDegPerYear, batteryYearsSinceReset)
    const usableBatteryWh = batteryWhNameplate * dod * batteryDegFactor
    if (y === 0) soc = usableBatteryWh

    const hoursThisYear = hoursPerYear[y]
    for (let h = 0; h < hoursThisYear; h++) {
      const pvDc = hourly[hourCursor] * solarKwp * solarDegFactor

      const directAcMax = pvDc * invEff
      const directAc = directAcMax < firmW ? directAcMax : firmW
      const pvUsedForDirect = directAc / invEff
      const pvRemainingDc = pvDc - pvUsedForDirect

      const headroom = usableBatteryWh - soc
      const potentialChargeAtBatt = pvRemainingDc * pvToBattEff
      const actualCharge = potentialChargeAtBatt < headroom ? potentialChargeAtBatt : headroom
      const chargeDcUsed = pvToBattEff > 0 ? actualCharge / pvToBattEff : 0
      const pvCurtailedDc = pvRemainingDc - chargeDcUsed
      soc += actualCharge

      const deficitAc = firmW - directAc
      let batteryAc = 0
      if (deficitAc > 0) {
        const batteryWhNeeded = deficitAc / invEff
        const actualDischarge = batteryWhNeeded < soc ? batteryWhNeeded : soc
        batteryAc = actualDischarge * invEff
        soc -= actualDischarge
      }

      const deliveredAc = directAc + batteryAc
      const unmetAc = firmW - deliveredAc
      deliveredByYear[y] += deliveredAc
      unmetByYear[y] += unmetAc
      excessByYear[y] += pvCurtailedDc
      unmetByMonth[monthOfHour(h, hoursThisYear)] += unmetAc
      if (deliveredAc >= firmW - 1e-6) metHours++

      hourCursor++
    }

    solarYearsSinceReset++
    batteryYearsSinceReset++
  }

  const whToMwh = 1e-6
  for (let y = 0; y < years; y++) {
    deliveredByYear[y] *= whToMwh
    unmetByYear[y] *= whToMwh
    excessByYear[y] *= whToMwh
  }
  for (let m = 0; m < 12; m++) unmetByMonth[m] *= whToMwh

  return {
    deliveredByYear,
    unmetByYear,
    excessByYear,
    unmetByMonth,
    metHours,
    totalHours,
    firmnessAchieved: metHours / totalHours,
  }
}
