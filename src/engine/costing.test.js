import { describe, it, expect } from 'vitest'
import { computeCosts, projectForward } from './costing.js'

const BASE = {
  solarMW: 300, batteryMWh: 1000, firmMW: 100,
  deliveredByYear: Array(19).fill(800_000),
  unmetByYear: Array(19).fill(76_000),
  solarCostPerWdc: 0.388,
  batteryCostPerWh: 0.165,
  gridCostPerWac: 0.076,
  inverterCostPerWac: 0.048,
  softCostPct: 10,
  solarOmPerKwdcYear: 12.5,
  batteryOmPerKwhYear: 5.9,
  opexEscalationPct: 2.5,
  solarRepowerCycle: 12,
  solarRepowerFraction: 35,
  batteryAugCycle: 8,
  batteryDegradationPct: 2.6,
  annualSolarCostDeclinePct: 3,
  annualBatteryCostDeclinePct: 5,
  waccPct: 7.7,
  projectLifetime: 25,
  backupCostPerMWh: 150,
}

describe('computeCosts — CAPEX', () => {
  it('4-part CAPEX matches formulas', () => {
    const r = computeCosts(BASE)
    expect(r.initialCapex.solar).toBeCloseTo(300 * 1e6 * 0.388, 0)
    expect(r.initialCapex.battery).toBeCloseTo(1000 * 1e6 * 0.165, 0)
    expect(r.initialCapex.grid).toBeCloseTo(100 * 1e6 * 0.076, 0)
    expect(r.initialCapex.inverter).toBeCloseTo(100 * 1e6 * 0.048, 0)
    const subtotal = 116_400_000 + 165_000_000 + 7_600_000 + 4_800_000
    expect(r.initialCapex.softCost).toBeCloseTo(subtotal * 0.1, 0)
    expect(r.initialCapex.total).toBeCloseTo(subtotal * 1.1, 0)
  })
})

describe('computeCosts — grid/inverter scale with firm, not solar', () => {
  it('doubling solarMW leaves grid and inverter capex unchanged', () => {
    const a = computeCosts(BASE)
    const b = computeCosts({ ...BASE, solarMW: BASE.solarMW * 2 })
    expect(b.initialCapex.grid).toBeCloseTo(a.initialCapex.grid, 0)
    expect(b.initialCapex.inverter).toBeCloseTo(a.initialCapex.inverter, 0)
    expect(b.initialCapex.solar).toBeCloseTo(a.initialCapex.solar * 2, 0)
  })
})

describe('computeCosts — blended LCOE', () => {
  it('blendedLcoe >= systemLcoe (backup only adds cost)', () => {
    const r = computeCosts(BASE)
    expect(r.blendedLcoePerMWh).toBeGreaterThanOrEqual(r.systemLcoePerMWh)
  })

  it('higher backup cost ⇒ higher blended LCOE, same system LCOE', () => {
    const a = computeCosts({ ...BASE, backupCostPerMWh: 100 })
    const b = computeCosts({ ...BASE, backupCostPerMWh: 300 })
    expect(b.blendedLcoePerMWh).toBeGreaterThan(a.blendedLcoePerMWh)
    expect(a.systemLcoePerMWh).toBeCloseTo(b.systemLcoePerMWh, 6)
  })

  it('zero unmet ⇒ blendedLcoe equals systemLcoe', () => {
    const r = computeCosts({ ...BASE, unmetByYear: Array(19).fill(0) })
    expect(r.blendedLcoePerMWh).toBeCloseTo(r.systemLcoePerMWh, 6)
  })
})

describe('computeCosts — OPEX escalation', () => {
  it('higher escalation ⇒ higher NPV of OPEX', () => {
    const flat = computeCosts({ ...BASE, opexEscalationPct: 0 })
    const high = computeCosts({ ...BASE, opexEscalationPct: 5 })
    expect(high.lifetimeNpv.opex).toBeGreaterThan(flat.lifetimeNpv.opex)
  })
})

describe('projectForward', () => {
  it('declining CAPEX ⇒ declining LCOE over projection horizon', () => {
    const curve = projectForward({ baseInputs: BASE, yearsOut: 5 })
    expect(curve.length).toBe(6)
    expect(curve[0].projectionYear).toBe(0)
    expect(curve[5].projectionYear).toBe(5)
    expect(curve[5].systemLcoePerMWh).toBeLessThan(curve[0].systemLcoePerMWh)
  })
})
