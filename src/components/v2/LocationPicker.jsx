import React, { useMemo } from 'react'
import cities from '../../data/cities.json'
import { buildOptions, groupByCountry, findGroupBySlug } from './locationPicker.logic.js'
import LatitudeMap from './LatitudeMap.jsx'

const selectStyle = {
  width: '100%',
  background: '#0f172a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  padding: '6px 10px',
  color: '#e2e8f0',
  fontSize: 13,
  cursor: 'pointer',
}

/**
 * Cascading country → city picker. Emits a slug that useCityData can consume.
 * Changing the country auto-selects the first city alphabetically in that country.
 */
export default function LocationPicker({ value, onChange }) {
  const groups = useMemo(() => groupByCountry(buildOptions(cities)), [])
  const currentGroup = findGroupBySlug(groups, value) ?? groups[0]
  const currentCity = useMemo(
    () => currentGroup?.cities.find(c => c.slug === value) ?? currentGroup?.cities[0] ?? null,
    [currentGroup, value]
  )

  const handleCountryChange = (iso3) => {
    const g = groups.find(g => g.iso3 === iso3)
    if (g && g.cities[0]) onChange(g.cities[0].slug)
  }

  const cityDisabled = !currentGroup || currentGroup.cities.length <= 1

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'stretch' }}>
      <div>
        <label
          htmlFor="country-select"
          style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}
        >
          Country
        </label>
        <select
          id="country-select"
          value={currentGroup?.iso3 ?? ''}
          onChange={e => handleCountryChange(e.target.value)}
          style={selectStyle}
        >
          {groups.map(g => (
            <option key={g.iso3} value={g.iso3} style={{ background: '#0f172a', color: '#fff' }}>
              {g.country}
            </option>
          ))}
        </select>
        <div style={{ marginTop: 10 }}>
          <label
            htmlFor="city-select"
            style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}
          >
            City
          </label>
          <select
            id="city-select"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            disabled={cityDisabled}
            style={{
              ...selectStyle,
              opacity: cityDisabled ? 0.6 : 1,
            }}
          >
            {currentGroup?.cities.map(c => (
              <option key={c.slug} value={c.slug} style={{ background: '#0f172a', color: '#fff' }}>
                {c.city}
              </option>
            ))}
          </select>
        </div>
      </div>
      {/* Pull map up to overlap the section's title row. -44px ≈ Section
          padding-top (12) + title block (~32). Keeps top of map level with
          top of the "Site & Target" heading; bottom still clears city box. */}
      {/* Pull the map up to overlap the section title row, and stretch its
          height down to the bottom of the selectors column. */}
      <div style={{
        marginTop: -44,
        height: 'calc(100% + 44px)',
        position: 'relative',
        zIndex: 1,
      }}>
        <LatitudeMap lat={currentCity?.lat} lon={currentCity?.lon} />
      </div>
    </div>
  )
}
