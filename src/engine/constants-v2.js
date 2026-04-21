/**
 * Default input values for the v2 engine.
 * Sourced from FIRM-SOLAR-LCOE-V2-SPEC.md §3 (Ember/Lazard 2024-25 benchmarks).
 */
export const V2_DEFAULTS = {
  // Site & target
  firmCapacityMW: 100,
  firmnessThresholdPct: 95,
  backupCostPerMWh: 150,

  // Solar
  solarCostPerWdc: 0.388,
  solarDegradationPct: 0.5,
  solarRepowerCycle: 12,
  solarRepowerFraction: 35,
  solarOmPerKwdcYear: 12.5,

  // Storage
  batteryCostPerKwh: 0.165,
  pvToBatteryEffPct: 98.2,
  inverterEffPct: 96.24,
  batteryDodPct: 90,
  batteryDegradationPct: 2.6,
  batteryAugCycle: 8,
  batteryOmPerKwhYear: 5.9,

  // Grid + inverter (scale on firm MW, not solar MW)
  gridCostPerWac: 0.076,
  inverterCostPerWac: 0.048,
  softCostPct: 10,

  // Finance
  waccPct: 7.7,
  projectLifetime: 25,
  opexEscalationPct: 2.5,

  // Forward projection declines (carry from v1 defaults)
  annualSolarCostDeclinePct: 3,
  annualBatteryCostDeclinePct: 5,

  // Solver
  thresholdSweepPoints: [70, 80, 85, 90, 93, 95, 97, 99],
}
