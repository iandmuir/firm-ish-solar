import { describe, it, expect } from 'vitest'
import { buildPvgisUrl } from './fetch-pvgis.mjs'

describe('buildPvgisUrl', () => {
  it('includes required params', () => {
    const url = buildPvgisUrl({ lat: -1.28, lon: 36.82 })
    expect(url).toContain('lat=-1.28')
    expect(url).toContain('lon=36.82')
    expect(url).toContain('pvcalculation=1')
    expect(url).toContain('peakpower=1')
    expect(url).toContain('loss=0')
    expect(url).toContain('optimalangles=1')
    expect(url).toContain('outputformat=json')
    expect(url).toContain('startyear=2005')
    expect(url).toContain('endyear=2023')
  })

  it('targets the seriescalc endpoint on v5_3', () => {
    const url = buildPvgisUrl({ lat: 0, lon: 0 })
    expect(url).toContain('re.jrc.ec.europa.eu/api/v5_3/seriescalc')
  })

  it('accepts custom year range', () => {
    const url = buildPvgisUrl({ lat: 0, lon: 0, startyear: 2010, endyear: 2020 })
    expect(url).toContain('startyear=2010')
    expect(url).toContain('endyear=2020')
  })
})
