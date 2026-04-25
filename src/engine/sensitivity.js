// Tornado-chart sensitivity analysis: for each curated input range, sweep the
// input from low to high while holding sizing fixed at the baseline-recommended
// design and report the resulting blended-LCOE swing.
//
// Design notes:
// - Sizing is held fixed (baseResult.current.solarMW, batteryMWh). Re-running
//   the optimizer per perturbation would measure "sensitivity of the solver,"
//   not "sensitivity of LCOE to the assumption" — and would cost ~1s/param.
// - Cost-only perturbations (CAPEX rates, OPEX, finance, declines, backup)
//   skip dispatch entirely and just re-run computeCosts (~sub-millisecond).
// - Dispatch-affecting perturbations (efficiencies, DoD, RTE, degradation,
//   battery aug cycle) re-run simulateDispatch once at fixed sizing (~5 ms).
// - Total tornado refresh: <100 ms for the full ~21 params; safe to recompute
//   inline alongside the existing v2 calc result.

import { simulateDispatch } from './dispatch.js'
import { computeCosts } from './costing.js'
import { buildAugmentationSchedule } from './augmentation.js'
import { SENSITIVITY_RANGES } from './sensitivityRanges.js'

// Mirror of the dispatchCommon-builder in calculate-v2.js. Kept in sync by
// hand: any new dispatch input added to calculate-v2.js must be reflected here
// or sensitivity will silently use stale values.
function buildDispatchCommon(inputs, cityData) {
  const sched = buildAugmentationSchedule(inputs.batteryAugCycle, inputs.projectLifetime)
  return {
    hourly: cityData.hourly,
    hoursPerYear: cityData.hoursPerYear,
    firmMW: inputs.firmCapacityMW,
    pvToBattEff: inputs.pvToBatteryEffPct / 100,
    pvToGridEff: (inputs.pvToBatteryEffPct / 100) * (inputs.inverterEffPct / 100),
    battToGridEff: inputs.inverterEffPct / 100,
    chemOneWayEff: Math.sqrt((inputs.batteryChemicalRtePct ?? 100) / 100),
    dodPct: inputs.batteryDodPct,
    solarDegPerYear: inputs.solarDegradationPct / 100,
    batteryDegPerYear: inputs.batteryDegradationPct / 100,
    batteryAugYears: new Set(sched.augmentationYears),
  }
}

function evaluatePerturbed(perturbedInputs, baseResult, cityData, affectsDispatch) {
  const { solarMW, batteryMWh } = baseResult.current
  const dispatch = affectsDispatch
    ? simulateDispatch({ ...buildDispatchCommon(perturbedInputs, cityData), solarMW, batteryMWh })
    : baseResult.current.dispatch
  const costs = computeCosts({
    firmMW: perturbedInputs.firmCapacityMW,
    solarMW, batteryMWh,
    deliveredByYear: dispatch.deliveredByYear,
    unmetByYear: dispatch.unmetByYear,
    solarCostPerWdc: perturbedInputs.solarCostPerWdc,
    batteryCostPerKwh: perturbedInputs.batteryCostPerKwh,
    gridCostPerWac: perturbedInputs.gridCostPerWac,
    inverterCostPerWac: perturbedInputs.inverterCostPerWac,
    solarOmPerKwdcYear: perturbedInputs.solarOmPerKwdcYear,
    batteryOmPerKwhYear: perturbedInputs.batteryOmPerKwhYear,
    opexEscalationPct: perturbedInputs.opexEscalationPct,
    inverterReplacementCycle: perturbedInputs.inverterReplacementCycle,
    inverterReplacementFraction: perturbedInputs.inverterReplacementFraction,
    batteryAugCycle: perturbedInputs.batteryAugCycle,
    batteryDegradationPct: perturbedInputs.batteryDegradationPct,
    annualSolarCostDeclinePct: perturbedInputs.annualSolarCostDeclinePct,
    annualBatteryCostDeclinePct: perturbedInputs.annualBatteryCostDeclinePct,
    waccPct: perturbedInputs.waccPct,
    projectLifetime: perturbedInputs.projectLifetime,
    backupCostPerMWh: perturbedInputs.backupCostPerMWh,
  })
  return costs.blendedLcoePerMWh
}

/**
 * Run parameter-sensitivity analysis at the baseline-recommended sizing.
 *
 * Returns an array sorted descending by `swing` (absolute LCOE delta between
 * low-input and high-input evaluations). Each entry carries enough context
 * for the chart to render a horizontal bar centered on `baseLcoe`:
 *
 *   { paramKey, label, group, baseValue, baseLcoe,
 *     low:  { value, blendedLcoe },
 *     high: { value, blendedLcoe },
 *     swing }
 *
 * Returns [] when baseResult.current is null (infeasible scenario).
 */
export function runSensitivityAnalysis({ baseInputs, baseResult, cityData, ranges = SENSITIVITY_RANGES }) {
  if (!baseResult?.current || !cityData) return []
  const baseLcoe = baseResult.current.costs.blendedLcoePerMWh
  const out = []
  for (const [paramKey, spec] of Object.entries(ranges)) {
    if (!(paramKey in baseInputs)) continue
    const affectsDispatch = spec.affects === 'dispatch'
    const lowInputs  = { ...baseInputs, [paramKey]: spec.low }
    const highInputs = { ...baseInputs, [paramKey]: spec.high }
    const lowLcoe  = evaluatePerturbed(lowInputs,  baseResult, cityData, affectsDispatch)
    const highLcoe = evaluatePerturbed(highInputs, baseResult, cityData, affectsDispatch)
    out.push({
      paramKey,
      label: spec.label,
      group: spec.group,
      unit: spec.unit,
      baseValue: baseInputs[paramKey],
      baseLcoe,
      low:  { value: spec.low,  blendedLcoe: lowLcoe },
      high: { value: spec.high, blendedLcoe: highLcoe },
      swing: Math.abs(highLcoe - lowLcoe),
    })
  }
  out.sort((a, b) => b.swing - a.swing)
  return out
}
