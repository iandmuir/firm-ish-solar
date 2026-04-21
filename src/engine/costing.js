import { buildAugmentationSchedule } from './augmentation.js'

export function computeCosts(opts) {
  const {
    solarMW, batteryMWh, firmMW,
    deliveredByYear, unmetByYear,
    solarCostPerWdc, batteryCostPerKwh, gridCostPerWac, inverterCostPerWac,
    solarOmPerKwdcYear, batteryOmPerKwhYear, opexEscalationPct,
    inverterReplacementCycle, inverterReplacementFraction,
    batteryAugCycle, batteryDegradationPct,
    annualSolarCostDeclinePct, annualBatteryCostDeclinePct,
    waccPct, projectLifetime, backupCostPerMWh,
  } = opts

  const wacc = waccPct / 100
  const escalation = opexEscalationPct / 100
  const solarDecline = annualSolarCostDeclinePct / 100
  const batteryDecline = annualBatteryCostDeclinePct / 100
  const batteryDeg = batteryDegradationPct / 100
  const invReplaceFrac = inverterReplacementFraction / 100

  // --- CAPEX ---
  const solar = solarMW * 1e6 * solarCostPerWdc
  const battery = batteryMWh * 1e3 * batteryCostPerKwh
  const grid = firmMW * 1e6 * gridCostPerWac
  const inverter = firmMW * 1e6 * inverterCostPerWac
  const totalInitial = solar + battery + grid + inverter

  // --- OPEX (year-0 nominal) ---
  const annualSolarOm = solarMW * 1000 * solarOmPerKwdcYear
  const annualBatteryOm = batteryMWh * 1000 * batteryOmPerKwhYear

  // --- Replacement & augmentation schedules ---
  const inverterSchedule = buildAugmentationSchedule(inverterReplacementCycle, projectLifetime)
  const batterySchedule = buildAugmentationSchedule(batteryAugCycle, projectLifetime)

  // --- Event capex (nominal, at event year) ---
  // Inverter replacement: full skid swap priced as (inverter $/Wac × firm Wac) × replacement %,
  // with future pricing declining at the solar-cost decline rate (inverter costs track solar).
  const inverterReplacementEvents = inverterSchedule.augmentationYears.map(y => {
    const costPerWacAtYear = inverterCostPerWac * Math.pow(1 - solarDecline, y)
    const capex = invReplaceFrac * costPerWacAtYear * firmMW * 1e6
    return { year: y, capex }
  })

  const batteryAugEvents = []
  {
    let prev = 0
    for (const y of batterySchedule.augmentationYears) {
      const lost = 1 - Math.pow(1 - batteryDeg, y - prev)
      const costAtYear = batteryCostPerKwh * Math.pow(1 - batteryDecline, y)
      const capex = lost * batteryMWh * 1e3 * costAtYear
      batteryAugEvents.push({ year: y, capex })
      prev = y
    }
  }

  // --- NPV discounted streams ---
  let npvOpex = 0, npvInvReplace = 0, npvAug = 0, npvBackup = 0, npvEnergy = 0
  const dispatchYears = deliveredByYear.length
  for (let y = 1; y <= projectLifetime; y++) {
    const df = Math.pow(1 + wacc, y)
    const opexThisYear =
      (annualSolarOm + annualBatteryOm) * Math.pow(1 + escalation, y - 1)
    npvOpex += opexThisYear / df

    // Backup: escalates at opex rate; use cycled dispatch year (pragmatic: project lifetime
    // can exceed weather-data years, so we cycle through the available dispatch results)
    const dispatchIdx = (y - 1) % dispatchYears
    const backupNominal =
      unmetByYear[dispatchIdx] * backupCostPerMWh * Math.pow(1 + escalation, y - 1)
    npvBackup += backupNominal / df

    npvEnergy += (firmMW * 8760) / df
  }
  for (const ev of inverterReplacementEvents) {
    npvInvReplace += ev.capex / Math.pow(1 + wacc, ev.year)
  }
  for (const ev of batteryAugEvents) {
    npvAug += ev.capex / Math.pow(1 + wacc, ev.year)
  }

  const npvSystem = totalInitial + npvOpex + npvInvReplace + npvAug

  const systemLcoePerMWh = npvSystem / npvEnergy
  const blendedLcoePerMWh = (npvSystem + npvBackup) / npvEnergy

  // --- Per-kWh breakdown ---
  const perKWh = (n) => n / npvEnergy / 1000
  const costBreakdownPerKWh = {
    solarCapex: perKWh(solar),
    batteryCapex: perKWh(battery),
    gridCapex: perKWh(grid),
    invCapex: perKWh(inverter),
    inverterReplacement: perKWh(npvInvReplace),
    batteryAug: perKWh(npvAug),
    solarOm: perKWh(discountedSingleStream(annualSolarOm, escalation, wacc, projectLifetime)),
    batteryOm: perKWh(discountedSingleStream(annualBatteryOm, escalation, wacc, projectLifetime)),
    backup: perKWh(npvBackup),
  }

  return {
    initialCapex: { solar, battery, grid, inverter, total: totalInitial },
    annualOm: { solar: annualSolarOm, battery: annualBatteryOm, total: annualSolarOm + annualBatteryOm },
    inverterReplacementEvents,
    batteryAugEvents,
    lifetimeNpv: {
      capex: totalInitial,
      opex: npvOpex,
      inverterReplacement: npvInvReplace,
      augmentation: npvAug,
      backup: npvBackup,
      total: npvSystem,
    },
    lifetimeEnergyNpv: npvEnergy,
    systemLcoePerMWh,
    blendedLcoePerMWh,
    costBreakdownPerKWh,
    inverterSchedule,
    batterySchedule,
  }
}

function discountedSingleStream(year0, escalation, wacc, years) {
  let s = 0
  for (let y = 1; y <= years; y++) {
    s += year0 * Math.pow(1 + escalation, y - 1) / Math.pow(1 + wacc, y)
  }
  return s
}

/**
 * Forward projection: freeze sizing, decline CAPEX inputs by projection year.
 */
export function projectForward({ baseInputs, yearsOut = 10 }) {
  const out = []
  for (let p = 0; p <= yearsOut; p++) {
    const scaled = {
      ...baseInputs,
      solarCostPerWdc: baseInputs.solarCostPerWdc
        * Math.pow(1 - baseInputs.annualSolarCostDeclinePct / 100, p),
      batteryCostPerKwh: baseInputs.batteryCostPerKwh
        * Math.pow(1 - baseInputs.annualBatteryCostDeclinePct / 100, p),
    }
    const c = computeCosts(scaled)
    out.push({
      projectionYear: p,
      systemLcoePerMWh: c.systemLcoePerMWh,
      blendedLcoePerMWh: c.blendedLcoePerMWh,
    })
  }
  return out
}
