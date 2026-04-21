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
    solarCostPerWdc, solarDegradationPct, solarOmPerKwdcYear,
    batteryCostPerKwh, pvToBatteryEffPct, inverterEffPct,
    batteryDodPct, batteryChemicalRtePct, batteryDegradationPct, batteryAugCycle, batteryOmPerKwhYear,
    gridCostPerWac, inverterCostPerWac,
    inverterReplacementCycle, inverterReplacementFraction,
    waccPct, projectLifetime, opexEscalationPct,
    annualSolarCostDeclinePct, annualBatteryCostDeclinePct,
  } = inputs

  const thresholds = opts.thresholdSweepPoints ?? V2_DEFAULTS.thresholdSweepPoints
  const solverSteps = opts.solverSteps ?? 15
  const maxInnerIter = opts.maxInnerIter ?? 10
  const bisectTolerance = opts.bisectTolerance ?? 1

  const batterySched = buildAugmentationSchedule(batteryAugCycle, projectLifetime)

  const dispatchCommon = {
    hourly: cityData.hourly,
    hoursPerYear: cityData.hoursPerYear,
    firmMW,
    // PV-centric DC coupling (required for extreme overbuilds used here): PV strings feed
    // field-side DC-DC optimizers that regulate the DC bus, so every PV electron pays the
    // DC-DC hit. The battery then sits on the regulated bus and only pays DC-AC on the way
    // out. So: PV→Battery = DC-DC; PV→Grid = DC-DC × DC-AC; Battery→Grid = DC-AC only.
    pvToBattEff: pvToBatteryEffPct / 100,
    pvToGridEff: (pvToBatteryEffPct / 100) * (inverterEffPct / 100),
    battToGridEff: inverterEffPct / 100,
    // Chemical RTE is split symmetrically — one-way = √RTE — applied separately on
    // charge and discharge, independent of the silicon power-electronics losses.
    chemOneWayEff: Math.sqrt((batteryChemicalRtePct ?? 100) / 100),
    dodPct: batteryDodPct,
    solarDegPerYear: solarDegradationPct / 100,
    batteryDegPerYear: batteryDegradationPct / 100,
    batteryAugYears: new Set(batterySched.augmentationYears),
  }

  const sizingSweep = solveSizingSweep({
    ...dispatchCommon,
    thresholds,
    capexPerMWSolar: solarCostPerWdc * 1e6,
    capexPerMWhBattery: batteryCostPerKwh * 1e3,
    solarMWMin: 1.5 * firmMW,
    solarMWMax: 12 * firmMW,
    solarSteps: solverSteps,
    batteryMWhMin: 0,
    batteryMWhMax: 72 * firmMW,
    bisectTolerance,
    maxInnerIter,
  })

  const costingBase = {
    firmMW,
    solarCostPerWdc, batteryCostPerKwh, gridCostPerWac, inverterCostPerWac,
    solarOmPerKwdcYear, batteryOmPerKwhYear, opexEscalationPct,
    inverterReplacementCycle, inverterReplacementFraction,
    batteryAugCycle, batteryDegradationPct,
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
