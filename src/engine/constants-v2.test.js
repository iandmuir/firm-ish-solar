import { describe, it, expect } from 'vitest'
import { V2_DEFAULTS } from './constants-v2.js'

describe('V2_DEFAULTS', () => {
  it('has firm target, threshold, and backup cost', () => {
    expect(V2_DEFAULTS.firmCapacityMW).toBe(100)
    expect(V2_DEFAULTS.firmnessThresholdPct).toBe(95)
    expect(V2_DEFAULTS.backupCostPerMWh).toBe(150)
  })

  it('has solar, storage, grid and inverter costs per Ember', () => {
    expect(V2_DEFAULTS.solarCostPerWdc).toBe(0.5)
    expect(V2_DEFAULTS.batteryCostPerKwh).toBe(125)
    expect(V2_DEFAULTS.gridCostPerWac).toBe(0.085)
    expect(V2_DEFAULTS.inverterCostPerWac).toBe(0.053)
  })

  it('has DC-coupled efficiencies', () => {
    expect(V2_DEFAULTS.pvToBatteryEffPct).toBe(98.2)
    expect(V2_DEFAULTS.inverterEffPct).toBe(98)
  })

  it('has battery chemical round-trip efficiency', () => {
    expect(V2_DEFAULTS.batteryChemicalRtePct).toBe(95)
  })

  it('has finance defaults', () => {
    expect(V2_DEFAULTS.waccPct).toBe(8)
    expect(V2_DEFAULTS.projectLifetime).toBe(25)
    expect(V2_DEFAULTS.opexEscalationPct).toBe(2.5)
  })

  it('threshold sweep points span 70-99%', () => {
    expect(V2_DEFAULTS.thresholdSweepPoints).toEqual([70, 80, 85, 90, 95, 97, 98, 99])
  })
})
