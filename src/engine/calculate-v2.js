import { solveSizingSweep } from './solver.js'
import { computeCosts, projectForward } from './costing.js'
import { buildAugmentationSchedule } from './augmentation.js'
import { V2_DEFAULTS } from './constants-v2.js'

export function calculateV2(inputs, opts = {}) {
  const {
    cityData,
    firmCapacityMW: firmMW,
    firmnessThresholdPct,
    backupCostPerMWh,
    solarCostPerWdc, solarDegradationPct, solarRepowerCycle,
    solarRepowerFraction, solarOmPerKwdcYear,
    batteryCostPerWh, pvToBatteryEffPct, inverterEffPct,
    batteryDodPct, batteryDegradationPct, batteryAugCycle, batteryOmPerKwhYear,
    gridCostPerWac, inverterCostPerWac, softCostPct,
    waccPct, projectLifetime, opexEscalationPct,
    annualSolarCostDeclinePct, annualBatteryCostDeclinePct,
  } = inputs

  const thresholds = opts.thresholdSweepPoints ?? V2_DEFAULTS.thresholdSweepPoints
  const solverSteps = opts.solverSteps ?? 15
  const maxInnerIter = opts.maxInnerIter ?? 10
  const bisectTolerance = opts.bisectTolerance ?? 1

  const solarSched = buildAugmentationSchedule(solarRepowerCycle, projectLifetime)
  const batterySched = buildAugmentationSchedule(batteryAugCycle, projectLifetime)

  const dispatchCommon = {
    hourly: cityData.hourly,
    hoursPerYear: cityData.hoursPerYear,
    firmMW,
    pvToBattEff: pvToBatteryEffPct / 100,
    invEff: inverterEffPct / 100,
    dodPct: batteryDodPct,
    solarDegPerYear: solarDegradationPct / 100,
    batteryDegPerYear: batteryDegradationPct / 100,
    solarRepowerYears: new Set(solarSched.augmentationYears),
    batteryAugYears: new Set(batterySched.augmentationYears),
  }

  const sizingSweep = solveSizingSweep({
    ...dispatchCommon,
    thresholds,
    capexPerMWSolar: solarCostPerWdc * 1e6,
    capexPerMWhBattery: batteryCostPerWh * 1e6,
    solarMWMin: 1.5 * firmMW,
    solarMWMax: 8 * firmMW,
    solarSteps: solverSteps,
    batteryMWhMin: 0,
    batteryMWhMax: 36 * firmMW,
    bisectTolerance,
    maxInnerIter,
  })

  const costingBase = {
    firmMW,
    solarCostPerWdc, batteryCostPerWh, gridCostPerWac, inverterCostPerWac, softCostPct,
    solarOmPerKwdcYear, batteryOmPerKwhYear, opexEscalationPct,
    solarRepowerCycle, solarRepowerFraction, batteryAugCycle, batteryDegradationPct,
    annualSolarCostDeclinePct, annualBatteryCostDeclinePct,
    waccPct, projectLifetime, backupCostPerMWh,
  }
  const sweep = sizingSweep.map(entry => {
    if (!entry.feasible) {
      return { ...entry, costs: null }
    }
    const costs = computeCosts({
      ...costingBase,
      solarMW: entry.solarMW,
      batteryMWh: entry.batteryMWh,
      deliveredByYear: entry.dispatch.deliveredByYear,
      unmetByYear: entry.dispatch.unmetByYear,
    })
    return { ...entry, costs }
  })

  const feasibleEntries = sweep.filter(e => e.feasible)
  let current = feasibleEntries.find(e => e.thresholdPct >= firmnessThresholdPct)
  if (!current && feasibleEntries.length > 0) {
    current = feasibleEntries[feasibleEntries.length - 1]
  }

  const projectionCurve = current
    ? projectForward({
        baseInputs: {
          ...costingBase,
          solarMW: current.solarMW,
          batteryMWh: current.batteryMWh,
          deliveredByYear: current.dispatch.deliveredByYear,
          unmetByYear: current.dispatch.unmetByYear,
        },
        yearsOut: 10,
      })
    : []

  return {
    sweep,
    current,
    projectionCurve,
    thresholdRequested: firmnessThresholdPct,
    thresholdAchieved: current ? current.dispatch.firmnessAchieved * 100 : 0,
  }
}
