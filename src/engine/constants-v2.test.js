import { describe, it, expect } from 'vitest'
import { V2_DEFAULTS } from './constants-v2.js'

describe('V2_DEFAULTS', () => {
  it('has firm target, threshold, and backup cost', () => {
    expect(V2_DEFAULTS.firmCapacityMW).toBe(100)
    expect(V2_DEFAULTS.firmnessThresholdPct).toBe(95)
    expect(V2_DEFAULTS.backupCostPerMWh).toBe(150)
  })

  it('has solar, storage, grid and inverter costs per Ember', () => {
    expect(V2_DEFAULTS.solarCostPerWdc).toBe(0.388)
    expect(V2_DEFAULTS.batteryCostPerKwh).toBe(0.165)
    expect(V2_DEFAULTS.gridCostPerWac).toBe(0.076)
    expect(V2_DEFAULTS.inverterCostPerWac).toBe(0.048)
    expect(V2_DEFAULTS.softCostPct).toBe(10)
  })

  it('has DC-coupled efficiencies', () => {
    expect(V2_DEFAULTS.pvToBatteryEffPct).toBe(98.2)
    expect(V2_DEFAULTS.inverterEffPct).toBe(96.24)
  })

  it('has finance defaults', () => {
    expect(V2_DEFAULTS.waccPct).toBe(7.7)
    expect(V2_DEFAULTS.projectLifetime).toBe(25)
    expect(V2_DEFAULTS.opexEscalationPct).toBe(2.5)
  })

  it('threshold sweep points span 70-99%', () => {
    expect(V2_DEFAULTS.thresholdSweepPoints).toEqual([70, 80, 85, 90, 93, 95, 97, 99])
  })
})
