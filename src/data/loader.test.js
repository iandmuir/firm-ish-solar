import { describe, it, expect, vi, beforeEach } from 'vitest'
import { decodeCityData, loadCityData, __resetLoaderCache } from './loader.js'

describe('decodeCityData', () => {
  it('returns a Float32Array of the expected length', () => {
    const raw = {
      name: 'Test', country: 'TST', lat: 0, lon: 0, elevation: 0,
      startYear: 2020, endYear: 2021,
      hoursPerYear: [3, 2],
      scale: 0.1,
      hourly: [0, 100, 200, 300, 400],
    }
    const out = decodeCityData(raw)
    expect(out.hourly).toBeInstanceOf(Float32Array)
    expect(out.hourly.length).toBe(5)
  })

  it('applies scale correctly', () => {
    const raw = {
      name: 'Test', country: 'TST', lat: 0, lon: 0, elevation: 0,
      startYear: 2020, endYear: 2020,
      hoursPerYear: [3],
      scale: 0.1,
      hourly: [0, 1000, 4567],
    }
    const out = decodeCityData(raw)
    expect(out.hourly[0]).toBe(0)
    expect(out.hourly[1]).toBeCloseTo(100, 4)
    expect(out.hourly[2]).toBeCloseTo(456.7, 4)
  })

  it('computes yearOffsets for fast per-year indexing', () => {
    const raw = {
      name: 'Test', country: 'TST', lat: 0, lon: 0, elevation: 0,
      startYear: 2020, endYear: 2022,
      hoursPerYear: [10, 20, 30],
      scale: 0.1,
      hourly: new Array(60).fill(0),
    }
    const out = decodeCityData(raw)
    expect(out.yearOffsets).toEqual([0, 10, 30, 60])
  })

  it('preserves metadata', () => {
    const raw = {
      name: 'Nairobi', country: 'KEN', lat: -1.28, lon: 36.82, elevation: 1670,
      startYear: 2005, endYear: 2023,
      hoursPerYear: [8760],
      scale: 0.1,
      hourly: [0],
    }
    const out = decodeCityData(raw)
    expect(out.name).toBe('Nairobi')
    expect(out.country).toBe('KEN')
    expect(out.lat).toBe(-1.28)
    expect(out.startYear).toBe(2005)
    expect(out.endYear).toBe(2023)
  })
})

describe('loadCityData', () => {
  beforeEach(() => { __resetLoaderCache() })

  it('fetches, decodes, and caches', async () => {
    const fakeRaw = {
      name: 'Fake', country: 'FAK', lat: 0, lon: 0, elevation: 0,
      startYear: 2020, endYear: 2020, hoursPerYear: [3],
      scale: 0.1, hourly: [0, 100, 200],
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeRaw,
    })
    globalThis.fetch = fetchMock

    const a = await loadCityData('FAK-fake')
    const b = await loadCityData('FAK-fake')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(a).toBe(b)
    expect(a.hourly[1]).toBeCloseTo(10, 5)
  })

  it('throws a useful error on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    await expect(loadCityData('NO-where')).rejects.toThrow(/404|not found/i)
  })
})
