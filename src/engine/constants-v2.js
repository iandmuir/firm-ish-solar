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
  solarCostPerWdc: 0.5,
  solarDegradationPct: 0.5,
  solarOmPerKwdcYear: 10,

  // Storage
  batteryCostPerKwh: 125,
  pvToBatteryEffPct: 98.2,  // DC-DC conversion stage (Dufo-López). Also reused on grid path.
  inverterEffPct: 98,       // Pure DC-AC inverter stage (Sungrow). Composed with DC-DC on grid paths.
  batteryDodPct: 95,
  batteryChemicalRtePct: 95, // Li-ion chemical round-trip (heat loss in cells). Applied √RTE symmetrically per leg, separate from power-electronics losses.
  batteryDegradationPct: 2.5,
  batteryAugCycle: 8,
  batteryOmPerKwhYear: 5,

  // Grid + inverter (scale on firm MW, not solar MW)
  gridCostPerWac: 0.085,
  inverterCostPerWac: 0.053,
  inverterReplacementCycle: 15,    // years between inverter skid replacements
  inverterReplacementFraction: 100, // % of turnkey inverter cost per replacement

  // Finance
  waccPct: 8,
  projectLifetime: 25,
  opexEscalationPct: 2.5,

  // Forward projection declines (carry from v1 defaults)
  annualSolarCostDeclinePct: 1.5,
  annualBatteryCostDeclinePct: 4,

  // Conventional-plant benchmark (for comparison UI only; not fed to engine)
  benchmarkSource: 'Gas CCGT – Local',
  benchmarkLcoe: 0.08, // $/kWh
  benchmarkEscalationPct: 0, // %/yr applied to benchmark LCOE in projection chart

  // Solver
  thresholdSweepPoints: [70, 80, 85, 90, 95, 97, 98, 99],
}
