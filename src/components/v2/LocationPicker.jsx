import React, { useMemo } from 'react'
import cities from '../../data/cities.json'
import { buildOptions, groupByCountry, findGroupBySlug } from './locationPicker.logic.js'

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

  const handleCountryChange = (iso3) => {
    const g = groups.find(g => g.iso3 === iso3)
    if (g && g.cities[0]) onChange(g.cities[0].slug)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
      </div>
      <div>
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
          disabled={!currentGroup || currentGroup.cities.length <= 1}
          style={{
            ...selectStyle,
            opacity: (!currentGroup || currentGroup.cities.length <= 1) ? 0.6 : 1,
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
  )
}
