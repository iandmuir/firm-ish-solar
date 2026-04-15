import { buildAugmentationSchedule } from './augmentation.js'

/**
 * Pure calculation engine.
 * @param {object} inputs - All user inputs
 * @returns {object} - All derived results
 */
export function calculateResults(inputs) {
  const {
    countryData,
    firmCapacityMW,
    solarCostPerWdc,
    solarDegradationPct,
    solarRepowerCycle,
    solarRepowerFraction,  // % of turnkey cost (e.g. 35)
    solarOmPerKwdcYear,
    batteryCostPerKwh,
    batteryRtePct,
    batteryDodPct,
    batteryDegradationPct,
    batteryAugCycle,
    batteryOmPerKwhYear,
    waccPct,
    projectLifetime,
    benchmarkLcoe,
    annualSolarCostDeclinePct,
    annualBatteryCostDeclinePct,
  } = inputs

  // --- Step 1: Worst month ---
  const monthly = countryData.monthly
  const worstMonthIdx = monthly.indexOf(Math.min(...monthly))
  const worstMonthYield = monthly[worstMonthIdx] // kWh/kWp/day

  // --- Step 2: Solar/storage split ---
  const effectiveSunHours = worstMonthYield / 0.75
  const directSolarFraction = Math.min(effectiveSunHours / 24, 1)
  const batteryFraction = 1 - directSolarFraction

  const wacc = waccPct / 100
  const solarDeg = solarDegradationPct / 100
  const batteryDeg = batteryDegradationPct / 100
  const batteryRte = batteryRtePct / 100
  const batteryDod = batteryDodPct / 100
  const solarCostDecline = annualSolarCostDeclinePct / 100
  const batteryCostDecline = annualBatteryCostDeclinePct / 100
  const repowerFrac = solarRepowerFraction / 100

  // --- Step 3: Schedules ---
  // Solar repowering schedule (restores to 100% at each event)
  const solarSchedule = buildAugmentationSchedule(solarRepowerCycle, projectLifetime)
  // Battery augmentation schedule
  const batterySchedule = buildAugmentationSchedule(batteryAugCycle, projectLifetime)

  // --- Step 4: Size solar array ---
  const dailyFirmDemandMWh = firmCapacityMW * 24

  const effectiveDailyDemand =
    directSolarFraction * dailyFirmDemandMWh +
    batteryFraction * dailyFirmDemandMWh / batteryRte

  const baseSolarCapacityKwp = (effectiveDailyDemand * 1000) / worstMonthYield
  // Oversize to account for degradation over the repowering cycle
  const solarDegFactor = Math.pow(1 - solarDeg, solarSchedule.maxDegradationInterval)
  const requiredSolarKwp = baseSolarCapacityKwp / solarDegFactor
  const requiredSolarMW = requiredSolarKwp / 1000

  // --- Step 5: Size the battery ---
  const batteryEnergyDeliveredMWh = batteryFraction * dailyFirmDemandMWh
  const baseBatteryNameplateMWh = batteryEnergyDeliveredMWh / batteryDod
  const batteryDegFactor = Math.pow(1 - batteryDeg, batterySchedule.maxDegradationInterval)
  const requiredBatteryMWh = baseBatteryNameplateMWh / batteryDegFactor

  // --- Step 6: Initial CAPEX ---
  const solarCapex = requiredSolarMW * 1000 * 1000 * solarCostPerWdc
  const batteryCapex = requiredBatteryMWh * 1000 * batteryCostPerKwh
  const totalInitialCapex = solarCapex + batteryCapex

  // --- Step 7: Lifetime costs ---
  const annualSolarOm = requiredSolarMW * 1000 * solarOmPerKwdcYear
  const annualBatteryOm = requiredBatteryMWh * 1000 * batteryOmPerKwhYear

  // Solar repowering CAPEX — fraction of full turnkey cost at future price
  const solarRepowerCapexByYear = {}
  for (const repowerYear of solarSchedule.augmentationYears) {
    const solarCostAtYear = solarCostPerWdc * Math.pow(1 - solarCostDecline, repowerYear)
    solarRepowerCapexByYear[repowerYear] =
      repowerFrac * solarCostAtYear * requiredSolarMW * 1000 * 1000
  }

  // Battery augmentation CAPEX — adds back degraded capacity
  const batteryAugCapexByYear = {}
  {
    let prevYear = 0
    for (const augYear of batterySchedule.augmentationYears) {
      const yearsSinceLast = augYear - prevYear
      const capacityLostFraction = 1 - Math.pow(1 - batteryDeg, yearsSinceLast)
      const batteryCostAtYear = batteryCostPerKwh * Math.pow(1 - batteryCostDecline, augYear)
      batteryAugCapexByYear[augYear] =
        capacityLostFraction * requiredBatteryMWh * 1000 * batteryCostAtYear
      prevYear = augYear
    }
  }

  let discountedSolarOm = 0
  let discountedBatteryOm = 0
  let discountedSolarRepower = 0
  let discountedBatteryAug = 0

  for (let y = 1; y <= projectLifetime; y++) {
    const df = Math.pow(1 + wacc, y)
    discountedSolarOm += annualSolarOm / df
    discountedBatteryOm += annualBatteryOm / df
    if (solarRepowerCapexByYear[y] !== undefined) {
      discountedSolarRepower += solarRepowerCapexByYear[y] / df
    }
    if (batteryAugCapexByYear[y] !== undefined) {
      discountedBatteryAug += batteryAugCapexByYear[y] / df
    }
  }

  const totalDiscountedCosts =
    discountedSolarOm + discountedBatteryOm + discountedSolarRepower + discountedBatteryAug

  const totalLifetimeCost = totalInitialCapex + totalDiscountedCosts

  // --- Step 8: Lifetime energy ---
  let totalDiscountedEnergy = 0
  for (let y = 1; y <= projectLifetime; y++) {
    totalDiscountedEnergy += (firmCapacityMW * 8760) / Math.pow(1 + wacc, y)
  }

  // --- Step 9: LCOE ---
  const lcoeMWh = totalLifetimeCost / totalDiscountedEnergy
  const lcoeKwh = lcoeMWh / 1000

  // Cost breakdown ($/kWh contribution)
  const solarCapexLcoe   = solarCapex           / totalDiscountedEnergy / 1000
  const batteryCapexLcoe = batteryCapex         / totalDiscountedEnergy / 1000
  const solarRepowerLcoe = discountedSolarRepower / totalDiscountedEnergy / 1000
  const batteryAugLcoe   = discountedBatteryAug  / totalDiscountedEnergy / 1000
  const solarOmLcoe      = discountedSolarOm     / totalDiscountedEnergy / 1000
  const batteryOmLcoe    = discountedBatteryOm   / totalDiscountedEnergy / 1000

  // Augmentation / repowering events for timeline
  const solarRepowerEvents = solarSchedule.augmentationYears.map(yr => ({
    year: yr,
    capex: solarRepowerCapexByYear[yr],
    type: 'solar-repower',
  }))
  const batteryAugEvents = batterySchedule.augmentationYears.map(yr => ({
    year: yr,
    capex: batteryAugCapexByYear[yr],
    type: 'battery',
  }))

  const solarSkipped = computeSkippedEvents(solarRepowerCycle, projectLifetime, solarSchedule.augmentationYears)
  const batterySkipped = computeSkippedEvents(batteryAugCycle, projectLifetime, batterySchedule.augmentationYears)

  // --- Step 10: Forward projection ---
  const projectionData = []
  for (let projYear = 0; projYear <= 10; projYear++) {
    const futureSolarCost = solarCostPerWdc * Math.pow(1 - solarCostDecline, projYear)
    const futureBatteryCost = batteryCostPerKwh * Math.pow(1 - batteryCostDecline, projYear)

    const projResult = calculateLcoeWithCosts({
      ...inputs,
      solarCostPerWdc: futureSolarCost,
      batteryCostPerKwh: futureBatteryCost,
      _projectionBaseSolarCost: futureSolarCost,
      _projectionBaseBatteryCost: futureBatteryCost,
    })

    projectionData.push({ year: projYear, lcoeKwh: projResult.lcoeKwh })
  }

  // Find parity crossing
  let parityYear = null
  for (let i = 0; i < projectionData.length - 1; i++) {
    const a = projectionData[i]
    const b = projectionData[i + 1]
    if (a.lcoeKwh <= benchmarkLcoe) { parityYear = 0; break }
    if (a.lcoeKwh > benchmarkLcoe && b.lcoeKwh <= benchmarkLcoe) {
      const t = (benchmarkLcoe - a.lcoeKwh) / (b.lcoeKwh - a.lcoeKwh)
      parityYear = a.year + t
      break
    }
  }

  return {
    worstMonthIdx,
    worstMonthYield,
    effectiveSunHours,
    directSolarFraction,
    batteryFraction,
    requiredSolarMW,
    requiredBatteryMWh,
    solarOverBuildRatio: requiredSolarMW / firmCapacityMW,
    batteryHoursStorage: requiredBatteryMWh / firmCapacityMW,
    solarCapex,
    batteryCapex,
    totalInitialCapex,
    lcoeMWh,
    lcoeKwh,
    costBreakdown: {
      solarCapex:   solarCapexLcoe,
      batteryCapex: batteryCapexLcoe,
      solarRepower: solarRepowerLcoe,
      batteryAug:   batteryAugLcoe,
      solarOm:      solarOmLcoe,
      batteryOm:    batteryOmLcoe,
    },
    solarSchedule,
    batterySchedule,
    solarRepowerEvents,
    batteryAugEvents,
    solarSkipped,
    batterySkipped,
    projectionData,
    parityYear,
  }
}

function calculateLcoeWithCosts(inputs) {
  const {
    countryData,
    firmCapacityMW,
    solarCostPerWdc,
    solarDegradationPct,
    solarRepowerCycle,
    solarRepowerFraction,
    solarOmPerKwdcYear,
    batteryCostPerKwh,
    batteryRtePct,
    batteryDodPct,
    batteryDegradationPct,
    batteryAugCycle,
    batteryOmPerKwhYear,
    waccPct,
    projectLifetime,
    annualSolarCostDeclinePct,
    annualBatteryCostDeclinePct,
    _projectionBaseSolarCost,
    _projectionBaseBatteryCost,
  } = inputs

  const monthly = countryData.monthly
  const worstMonthYield = Math.min(...monthly)
  const effectiveSunHours = worstMonthYield / 0.75
  const directSolarFraction = Math.min(effectiveSunHours / 24, 1)
  const batteryFraction = 1 - directSolarFraction

  const wacc = waccPct / 100
  const solarDeg = solarDegradationPct / 100
  const batteryDeg = batteryDegradationPct / 100
  const batteryRte = batteryRtePct / 100
  const batteryDod = batteryDodPct / 100
  const solarCostDecline = annualSolarCostDeclinePct / 100
  const batteryCostDecline = annualBatteryCostDeclinePct / 100
  const repowerFrac = solarRepowerFraction / 100

  const baseSolarCost = _projectionBaseSolarCost ?? solarCostPerWdc
  const baseBatteryCost = _projectionBaseBatteryCost ?? batteryCostPerKwh

  const solarSchedule = buildAugmentationSchedule(solarRepowerCycle, projectLifetime)
  const batterySchedule = buildAugmentationSchedule(batteryAugCycle, projectLifetime)

  const dailyFirmDemandMWh = firmCapacityMW * 24
  const effectiveDailyDemand =
    directSolarFraction * dailyFirmDemandMWh +
    batteryFraction * dailyFirmDemandMWh / batteryRte

  const baseSolarKwp = (effectiveDailyDemand * 1000) / worstMonthYield
  const solarDegFactor = Math.pow(1 - solarDeg, solarSchedule.maxDegradationInterval)
  const reqSolarKwp = baseSolarKwp / solarDegFactor
  const reqSolarMW = reqSolarKwp / 1000

  const batteryEnergyMWh = batteryFraction * dailyFirmDemandMWh
  const baseNameplateMWh = batteryEnergyMWh / batteryDod
  const batteryDegFactor = Math.pow(1 - batteryDeg, batterySchedule.maxDegradationInterval)
  const reqBatteryMWh = baseNameplateMWh / batteryDegFactor

  const solarCapex = reqSolarMW * 1000 * 1000 * solarCostPerWdc
  const batteryCapex = reqBatteryMWh * 1000 * batteryCostPerKwh
  const totalInitialCapex = solarCapex + batteryCapex

  const annualSolarOm = reqSolarMW * 1000 * solarOmPerKwdcYear
  const annualBatteryOm = reqBatteryMWh * 1000 * batteryOmPerKwhYear

  let totalDiscountedCosts = 0

  // Solar repowering costs
  for (const repowerYear of solarSchedule.augmentationYears) {
    const costAtYear = baseSolarCost * Math.pow(1 - solarCostDecline, repowerYear)
    const repowerCapex = repowerFrac * costAtYear * reqSolarMW * 1000 * 1000
    totalDiscountedCosts += repowerCapex / Math.pow(1 + wacc, repowerYear)
  }

  // Battery augmentation costs
  let prevBatteryYear = 0
  for (const augYear of batterySchedule.augmentationYears) {
    const yearsSinceLast = augYear - prevBatteryYear
    const capacityLostFraction = 1 - Math.pow(1 - batteryDeg, yearsSinceLast)
    const costAtYear = baseBatteryCost * Math.pow(1 - batteryCostDecline, augYear)
    const augCapex = capacityLostFraction * reqBatteryMWh * 1000 * costAtYear
    totalDiscountedCosts += augCapex / Math.pow(1 + wacc, augYear)
    prevBatteryYear = augYear
  }

  // O&M
  for (let y = 1; y <= projectLifetime; y++) {
    totalDiscountedCosts += (annualSolarOm + annualBatteryOm) / Math.pow(1 + wacc, y)
  }

  const totalLifetimeCost = totalInitialCapex + totalDiscountedCosts

  let totalDiscountedEnergy = 0
  for (let y = 1; y <= projectLifetime; y++) {
    totalDiscountedEnergy += (firmCapacityMW * 8760) / Math.pow(1 + wacc, y)
  }

  return {
    lcoeKwh: (totalLifetimeCost / totalDiscountedEnergy) / 1000,
  }
}

function computeSkippedEvents(cycle, lifetime, includedYears) {
  const skipped = []
  let year = cycle
  while (year <= lifetime) {
    if (!includedYears.includes(year)) skipped.push(year)
    year += cycle
  }
  return skipped
}
