import { describe, it, expect } from 'vitest'
import { buildOptions, citySlug, findByIso3 } from './locationPicker.logic.js'

const CITIES = [
  { city: 'Nairobi', country: 'Kenya', iso3: 'KEN', lat: -1.28, lon: 36.82 },
  { city: 'Abuja', country: 'Nigeria', iso3: 'NGA', lat: 9.08, lon: 7.49 },
  { city: 'New York', country: 'United States', iso3: 'USA', lat: 40.71, lon: -74.00 },
]

describe('buildOptions', () => {
  it('returns one entry per city, sorted by country name', () => {
    const opts = buildOptions(CITIES)
    expect(opts.map(o => o.country)).toEqual(['Kenya', 'Nigeria', 'United States'])
  })

  it('each option carries its slug', () => {
    const opts = buildOptions(CITIES)
    expect(opts[0].slug).toBe('KEN-nairobi')
    expect(opts[2].slug).toBe('USA-new-york')
  })

  it('preserves city metadata (lat/lon) so the header can show it', () => {
    const opts = buildOptions(CITIES)
    expect(opts[0].lat).toBe(-1.28)
    expect(opts[0].city).toBe('Nairobi')
  })

  it('does not mutate input', () => {
    const copy = CITIES.map(c => ({ ...c }))
    buildOptions(CITIES)
    expect(CITIES).toEqual(copy)
  })
})

describe('findByIso3', () => {
  it('finds the option for a given iso3', () => {
    const opts = buildOptions(CITIES)
    expect(findByIso3(opts, 'USA').city).toBe('New York')
  })

  it('returns undefined when absent', () => {
    const opts = buildOptions(CITIES)
    expect(findByIso3(opts, 'XXX')).toBeUndefined()
  })
})

describe('citySlug', () => {
  it('lowercases and hyphenates', () => {
    expect(citySlug({ city: 'New York', iso3: 'USA' })).toBe('USA-new-york')
  })
  it('collapses runs of non-alphanumerics', () => {
    expect(citySlug({ city: "São Paulo", iso3: 'BRA' })).toBe('BRA-s-o-paulo')
  })
  it('matches build-city-data output convention', () => {
    expect(citySlug({ city: 'Los Angeles', iso3: 'USA' })).toBe('USA-los-angeles')
  })
})
