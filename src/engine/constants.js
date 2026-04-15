export const DEFAULTS = {
  // Site & Target
  country: 'IND',
  firmCapacityMW: 100,
  targetMode: 'mw', // 'mw' or 'mwh'

  // Solar Asset
  solarCostPerWdc: 0.50,
  solarDegradationPct: 0.5,
  solarRepowerCycle: 12,
  solarRepowerFraction: 35, // % of turnkey cost
  solarOmPerKwdcYear: 10,

  // Storage Asset
  batteryCostPerKwh: 125,
  batteryRtePct: 90,
  batteryDodPct: 100,
  batteryDegradationPct: 1.5,
  batteryAugCycle: 5,
  batteryOmPerKwhYear: 5,

  // Project Finance
  waccPct: 8,
  projectLifetime: 25,

  // Market Comparison
  benchmarkSource: 'Gas CCGT',
  benchmarkLcoe: 0.07,

  // Future Cost Projections
  annualSolarCostDeclinePct: 1.5,
  annualBatteryCostDeclinePct: 4,
}

export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
