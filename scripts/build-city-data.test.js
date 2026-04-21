import { describe, it, expect } from 'vitest'
import { extractHourlyFromPvgis, encodeToInt16, decodeFromInt16 } from './build-city-data.mjs'

const MOCK_PVGIS = {
  inputs: {
    location: { latitude: -1.28, longitude: 36.82, elevation: 1670 },
    meteo_data: { year_min: 2005, year_max: 2006 },
  },
  outputs: {
    hourly: [
      { time: '20050101:0010', P: 0 },
      { time: '20050101:0110', P: 0 },
      { time: '20050101:1210', P: 456.7 },  // midday
      { time: '20060101:0010', P: 0 },
    ],
  },
}

describe('extractHourlyFromPvgis', () => {
  it('returns P values in order', () => {
    const { hourly } = extractHourlyFromPvgis(MOCK_PVGIS)
    expect(hourly).toEqual([0, 0, 456.7, 0])
  })

  it('preserves year range metadata', () => {
    const meta = extractHourlyFromPvgis(MOCK_PVGIS)
    expect(meta.startYear).toBe(2005)
    expect(meta.endYear).toBe(2006)
    expect(meta.lat).toBe(-1.28)
    expect(meta.lon).toBe(36.82)
  })

  it('counts hours per year', () => {
    const { hoursPerYear } = extractHourlyFromPvgis(MOCK_PVGIS)
    expect(hoursPerYear).toEqual([3, 1])  // 3 in 2005, 1 in 2006
  })
})

describe('encodeToInt16 / decodeFromInt16', () => {
  it('round-trips within 0.05 W tolerance at scale 0.1', () => {
    const values = [0, 10.3, 456.7, 999.9, 0.1]
    const encoded = encodeToInt16(values, 0.1)
    const decoded = decodeFromInt16(encoded, 0.1)
    for (let i = 0; i < values.length; i++) {
      expect(decoded[i]).toBeCloseTo(values[i], 1)
    }
  })

  it('clamps negative values to zero', () => {
    const encoded = encodeToInt16([-5, 10], 0.1)
    const decoded = decodeFromInt16(encoded, 0.1)
    expect(decoded[0]).toBe(0)
    expect(decoded[1]).toBeCloseTo(10, 1)
  })

  it('produces Int16Array', () => {
    const encoded = encodeToInt16([100], 0.1)
    expect(encoded).toBeInstanceOf(Int16Array)
  })
})
