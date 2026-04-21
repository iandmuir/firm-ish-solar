import { describe, it, expect } from 'vitest'
import { pickMostPopulousPerCountry, ISO2_TO_3 } from './build-city-list.mjs'

describe('pickMostPopulousPerCountry', () => {
  it('returns one entry per country', () => {
    const cities = [
      { iso2: 'IN', name: 'Mumbai',  lat: 19.07, lon: 72.87, pop: 20400000 },
      { iso2: 'IN', name: 'Delhi',   lat: 28.61, lon: 77.21, pop: 18500000 },
      { iso2: 'KE', name: 'Nairobi', lat: -1.28, lon: 36.82, pop:  4400000 },
    ]
    const out = pickMostPopulousPerCountry(cities)
    expect(out).toHaveLength(2)
  })

  it('picks the most populous city per country', () => {
    const cities = [
      { iso2: 'IN', name: 'Mumbai', lat: 19.07, lon: 72.87, pop: 20400000 },
      { iso2: 'IN', name: 'Delhi',  lat: 28.61, lon: 77.21, pop: 18500000 },
    ]
    const [pick] = pickMostPopulousPerCountry(cities)
    expect(pick.city).toBe('Mumbai')
  })

  it('converts ISO-2 to ISO-3 country codes', () => {
    const cities = [{ iso2: 'IN', name: 'Mumbai', lat: 19.07, lon: 72.87, pop: 20400000 }]
    const [pick] = pickMostPopulousPerCountry(cities)
    expect(pick.iso3).toBe('IND')
  })

  it('emits the expected shape', () => {
    const cities = [{ iso2: 'KE', name: 'Nairobi', lat: -1.28, lon: 36.82, pop: 4400000 }]
    const [pick] = pickMostPopulousPerCountry(cities)
    expect(pick).toEqual({
      iso3: 'KEN', city: 'Nairobi', lat: -1.28, lon: 36.82, pop: 4400000,
    })
  })

  it('skips entries with no ISO-3 mapping', () => {
    const cities = [
      { iso2: 'XX', name: 'Nowhere', lat: 0, lon: 0, pop: 1000 },
      { iso2: 'IN', name: 'Mumbai',  lat: 19.07, lon: 72.87, pop: 20400000 },
    ]
    const out = pickMostPopulousPerCountry(cities)
    expect(out).toHaveLength(1)
    expect(out[0].iso3).toBe('IND')
  })

  it('sorts output by ISO-3 code', () => {
    const cities = [
      { iso2: 'KE', name: 'Nairobi', lat: -1.28, lon: 36.82, pop:  4400000 },
      { iso2: 'IN', name: 'Mumbai',  lat: 19.07, lon: 72.87, pop: 20400000 },
    ]
    const out = pickMostPopulousPerCountry(cities)
    expect(out.map(c => c.iso3)).toEqual(['IND', 'KEN'])
  })
})

describe('ISO2_TO_3', () => {
  it('covers at least 200 countries', () => {
    expect(Object.keys(ISO2_TO_3).length).toBeGreaterThanOrEqual(200)
  })
})
