// Curated low/high ranges for the tornado-chart parameter-sensitivity view.
//
// Each entry sweeps a *single* input across a plausible market range while
// holding every other input — and the chosen sizing — fixed at the baseline.
// The chart reads the resulting blended-LCOE swing as a sensitivity score.
//
// `affects: 'dispatch'` flags inputs that change hourly dispatch (efficiency,
// degradation, DoD, RTE, augmentation cadence) and therefore require a
// re-run of `simulateDispatch` at the fixed sizing. Everything else only
// touches `computeCosts` and is sub-millisecond per perturbation.
//
// Ranges are educated guesses spanning the most-mature, low-friction markets
// (low end) through high-friction contexts (high labor cost, risk premia,
// permitting/interconnection delays, supply-chain premiums). They mirror the
// philosophy of the Disclaimer modal — defaults are best-case-ish; real-world
// numbers can land meaningfully above. v1 ships these as read-only; a future
// iteration will let users override per-param.
//
// Excluded by design (target/comparison, not assumption):
//   firmCapacityMW, firmnessThresholdPct,
//   benchmarkSource, benchmarkLcoe, benchmarkEscalationPct,
//   thresholdSweepPoints, backupType.

export const SENSITIVITY_RANGES = {
  // --- CAPEX ---
  solarCostPerWdc:        { low: 0.35, high: 0.70, label: 'Solar CAPEX',         group: 'CAPEX',  affects: 'cost', unit: '$/Wdc' },
  batteryCostPerKwh:      { low: 90,   high: 180,  label: 'Battery CAPEX',       group: 'CAPEX',  affects: 'cost', unit: '$/kWh' },
  gridCostPerWac:         { low: 0.04, high: 0.15, label: 'Grid interconnect',   group: 'CAPEX',  affects: 'cost', unit: '$/Wac' },
  inverterCostPerWac:     { low: 0.035,high: 0.080,label: 'Inverter CAPEX',      group: 'CAPEX',  affects: 'cost', unit: '$/Wac' },

  // --- OPEX ---
  solarOmPerKwdcYear:     { low: 6,    high: 18,   label: 'Solar O&M',           group: 'OPEX',   affects: 'cost', unit: '$/kWdc/yr' },
  batteryOmPerKwhYear:    { low: 3,    high: 8,    label: 'Battery O&M',         group: 'OPEX',   affects: 'cost', unit: '$/kWh/yr' },
  opexEscalationPct:      { low: 1.0,  high: 4.0,  label: 'OPEX escalation',     group: 'OPEX',   affects: 'cost', unit: '%/yr' },
  backupCostPerMWh:       { low: 80,   high: 500,  label: 'Backup power cost',   group: 'OPEX',   affects: 'cost', unit: '$/MWh' },

  // --- Replacement / augmentation ---
  inverterReplacementCycle:    { low: 12, high: 20, label: 'Inverter repl cycle',   group: 'REPL', affects: 'cost', unit: 'yr' },
  inverterReplacementFraction: { low: 70, high: 110,label: 'Inverter repl cost %',  group: 'REPL', affects: 'cost', unit: '%' },
  batteryAugCycle:             { low: 5,  high: 12, label: 'Battery aug cycle',     group: 'REPL', affects: 'dispatch', unit: 'yr' },

  // --- Technical (dispatch-affecting) ---
  solarDegradationPct:    { low: 0.3,  high: 0.8,  label: 'Solar degradation',   group: 'TECH',   affects: 'dispatch', unit: '%/yr' },
  pvToBatteryEffPct:      { low: 96,   high: 99,   label: 'PV→Batt DC-DC eff',   group: 'TECH',   affects: 'dispatch', unit: '%' },
  inverterEffPct:         { low: 96.5, high: 99,   label: 'Inverter DC-AC eff',  group: 'TECH',   affects: 'dispatch', unit: '%' },
  batteryDodPct:          { low: 85,   high: 98,   label: 'Battery DoD',         group: 'TECH',   affects: 'dispatch', unit: '%' },
  batteryChemicalRtePct:  { low: 88,   high: 98,   label: 'Battery chem. RTE',   group: 'TECH',   affects: 'dispatch', unit: '%' },
  batteryDegradationPct:  { low: 1.5,  high: 4.0,  label: 'Battery degradation', group: 'TECH',   affects: 'dispatch', unit: '%/yr' },

  // --- Finance / forward ---
  waccPct:                       { low: 5,   high: 11,  label: 'WACC',                  group: 'FIN', affects: 'cost', unit: '%' },
  projectLifetime:               { low: 20,  high: 30,  label: 'Project lifetime',      group: 'FIN', affects: 'cost', unit: 'yr' },
  annualSolarCostDeclinePct:     { low: 0.5, high: 3.0, label: 'Solar cost decline',    group: 'FIN', affects: 'cost', unit: '%/yr' },
  annualBatteryCostDeclinePct:   { low: 2,   high: 6,   label: 'Battery cost decline',  group: 'FIN', affects: 'cost', unit: '%/yr' },
}
