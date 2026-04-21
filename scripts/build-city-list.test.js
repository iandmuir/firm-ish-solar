import { describe, it, expect } from 'vitest'
import { pickMostPopulousPerCountry, ISO2_TO_3, parseGeoNamesTsv } from './build-city-list.mjs'

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

describe('parseGeoNamesTsv', () => {
  it('parses a single line correctly', () => {
    const line = [
      '1275339',                  // geonameid
      'Mumbai',                   // name
      'Mumbai',                   // asciiname
      '',                         // alt names
      '19.07283', '72.88261',     // lat, lon
      'P', 'PPL',                 // feature class, code
      'IN', '',                   // country code, cc2
      '16', '', '', '',           // admin codes
      '12691836',                 // population
      '',                         // elevation
      '14', 'Asia/Kolkata',       // dem, timezone
      '2024-01-01',               // mod date
    ].join('\t')
    const [city] = parseGeoNamesTsv(line)
    expect(city).toEqual({
      iso2: 'IN', name: 'Mumbai', lat: 19.07283, lon: 72.88261, pop: 12691836,
    })
  })

  it('skips entries with no population', () => {
    const line = [
      '1', 'Nowhere', 'Nowhere', '',
      '0', '0', 'P', 'PPL', 'XX', '',
      '', '', '', '', '0', '', '', '', '',
    ].join('\t')
    expect(parseGeoNamesTsv(line)).toHaveLength(0)
  })
})
