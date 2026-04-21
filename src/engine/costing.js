import { buildAugmentationSchedule } from './augmentation.js'

export function computeCosts(opts) {
  const {
    solarMW, batteryMWh, firmMW,
    deliveredByYear, unmetByYear,
    solarCostPerWdc, batteryCostPerWh, gridCostPerWac, inverterCostPerWac, softCostPct,
    solarOmPerKwdcYear, batteryOmPerKwhYear, opexEscalationPct,
    solarRepowerCycle, solarRepowerFraction, batteryAugCycle, batteryDegradationPct,
    annualSolarCostDeclinePct, annualBatteryCostDeclinePct,
    waccPct, projectLifetime, backupCostPerMWh,
  } = opts

  const wacc = waccPct / 100
  const escalation = opexEscalationPct / 100
  const solarDecline = annualSolarCostDeclinePct / 100
  const batteryDecline = annualBatteryCostDeclinePct / 100
  const softMult = 1 + softCostPct / 100
  const batteryDeg = batteryDegradationPct / 100
  const repowerFrac = solarRepowerFraction / 100

  // --- CAPEX ---
  const solar = solarMW * 1e6 * solarCostPerWdc
  const battery = batteryMWh * 1e6 * batteryCostPerWh
  const grid = firmMW * 1e6 * gridCostPerWac
  const inverter = firmMW * 1e6 * inverterCostPerWac
  const subtotal = solar + battery + grid + inverter
  const softCost = subtotal * softCostPct / 100
  const totalInitial = subtotal + softCost

  // --- OPEX (year-0 nominal) ---
  const annualSolarOm = solarMW * 1000 * solarOmPerKwdcYear
  const annualBatteryOm = batteryMWh * 1000 * batteryOmPerKwhYear

  // --- Repower & augmentation schedules ---
  const solarSchedule = buildAugmentationSchedule(solarRepowerCycle, projectLifetime)
  const batterySchedule = buildAugmentationSchedule(batteryAugCycle, projectLifetime)

  // --- Event capex (nominal, at event year) ---
  const solarRepowerEvents = solarSchedule.augmentationYears.map(y => {
    const costAtYear = solarCostPerWdc * Math.pow(1 - solarDecline, y)
    const capex = repowerFrac * costAtYear * solarMW * 1e6 * softMult
    return { year: y, capex }
  })

  const batteryAugEvents = []
  {
    let prev = 0
    for (const y of batterySchedule.augmentationYears) {
      const lost = 1 - Math.pow(1 - batteryDeg, y - prev)
      const costAtYear = batteryCostPerWh * Math.pow(1 - batteryDecline, y)
      const capex = lost * batteryMWh * 1e6 * costAtYear * softMult
      batteryAugEvents.push({ year: y, capex })
      prev = y
    }
  }

  // --- NPV discounted streams ---
  let npvOpex = 0, npvRepower = 0, npvAug = 0, npvBackup = 0, npvEnergy = 0
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
  for (const ev of solarRepowerEvents) {
    npvRepower += ev.capex / Math.pow(1 + wacc, ev.year)
  }
  for (const ev of batteryAugEvents) {
    npvAug += ev.capex / Math.pow(1 + wacc, ev.year)
  }

  const npvSystem = totalInitial + npvOpex + npvRepower + npvAug

  const systemLcoePerMWh = npvSystem / npvEnergy
  const blendedLcoePerMWh = (npvSystem + npvBackup) / npvEnergy

  // --- Per-kWh breakdown ---
  const perKWh = (n) => n / npvEnergy / 1000
  const costBreakdownPerKWh = {
    solarCapex: perKWh(solar),
    batteryCapex: perKWh(battery),
    gridCapex: perKWh(grid),
    invCapex: perKWh(inverter),
    softCost: perKWh(softCost),
    solarRepower: perKWh(npvRepower),
    batteryAug: perKWh(npvAug),
    solarOm: perKWh(discountedSingleStream(annualSolarOm, escalation, wacc, projectLifetime)),
    batteryOm: perKWh(discountedSingleStream(annualBatteryOm, escalation, wacc, projectLifetime)),
    backup: perKWh(npvBackup),
  }

  return {
    initialCapex: { solar, battery, grid, inverter, softCost, total: totalInitial },
    annualOm: { solar: annualSolarOm, battery: annualBatteryOm, total: annualSolarOm + annualBatteryOm },
    solarRepowerEvents,
    batteryAugEvents,
    lifetimeNpv: {
      capex: totalInitial,
      opex: npvOpex,
      repower: npvRepower,
      augmentation: npvAug,
      backup: npvBackup,
      total: npvSystem,
    },
    lifetimeEnergyNpv: npvEnergy,
    systemLcoePerMWh,
    blendedLcoePerMWh,
    costBreakdownPerKWh,
    solarSchedule,
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
      batteryCostPerWh: baseInputs.batteryCostPerWh
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
