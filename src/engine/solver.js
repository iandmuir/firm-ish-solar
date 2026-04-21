import { simulateDispatch } from './dispatch.js'

function logSpaced(min, max, n) {
  if (n === 1) return [min]
  const lmin = Math.log(min), lmax = Math.log(max)
  const out = []
  for (let i = 0; i < n; i++) out.push(Math.exp(lmin + (lmax - lmin) * i / (n - 1)))
  return out
}

function firmnessAt(common, solarMW, batteryMWh) {
  return simulateDispatch({ ...common, solarMW, batteryMWh })
}

/**
 * Inner bisection: min battery s.t. firmness ≥ target.
 * Returns { batteryMWh, dispatch } or null if max battery is infeasible.
 */
function minBatteryForThreshold(common, solarMW, thresholdFrac, batMin, batMax, tol, maxIter) {
  const dMax = firmnessAt(common, solarMW, batMax)
  if (dMax.firmnessAchieved < thresholdFrac) return null
  const dMin = firmnessAt(common, solarMW, batMin)
  if (dMin.firmnessAchieved >= thresholdFrac) return { batteryMWh: batMin, dispatch: dMin }
  let lo = batMin, hi = batMax, bestDispatch = dMax
  for (let i = 0; i < maxIter; i++) {
    if (hi - lo <= tol) break
    const mid = (lo + hi) / 2
    const dMid = firmnessAt(common, solarMW, mid)
    if (dMid.firmnessAchieved >= thresholdFrac) {
      hi = mid
      bestDispatch = dMid
    } else {
      lo = mid
    }
  }
  return { batteryMWh: hi, dispatch: bestDispatch }
}

export function solveSizing(opts) {
  const {
    thresholdPct,
    capexPerMWSolar, capexPerMWhBattery,
    firmMW,
    solarMWMin = 1.5 * firmMW,
    solarMWMax = 8 * firmMW,
    solarSteps = 15,
    batteryMWhMin = 0,
    batteryMWhMax = 36 * firmMW,
    bisectTolerance = 1,
    maxInnerIter = 10,
    ...dispatchCommon
  } = opts
  const common = { ...dispatchCommon, firmMW }
  const thresholdFrac = thresholdPct / 100

  let best = null
  for (const solarMW of logSpaced(solarMWMin, solarMWMax, solarSteps)) {
    const inner = minBatteryForThreshold(
      common, solarMW, thresholdFrac,
      batteryMWhMin, batteryMWhMax, bisectTolerance, maxInnerIter,
    )
    if (!inner) continue
    const capex = solarMW * capexPerMWSolar + inner.batteryMWh * capexPerMWhBattery
    if (!best || capex < best.capex) {
      best = { solarMW, batteryMWh: inner.batteryMWh, dispatch: inner.dispatch, capex }
    }
  }

  if (!best) return { feasible: false, solarMW: null, batteryMWh: null, dispatch: null }
  return {
    feasible: true,
    solarMW: best.solarMW,
    batteryMWh: best.batteryMWh,
    dispatch: best.dispatch,
  }
}

export function solveSizingSweep(opts) {
  const { thresholds, ...rest } = opts
  return thresholds.map(thresholdPct =>
    ({ thresholdPct, ...solveSizing({ ...rest, thresholdPct }) })
  )
}
