import React, { useMemo } from 'react'
import cities from '../../data/cities.json'
import { buildOptions } from './locationPicker.logic.js'

/**
 * Country picker. One `<option>` per country, label format "Country — City".
 * Emits a slug that useCityData can consume directly. When the dataset grows
 * to multiple cities per country, this component evolves into a cascading
 * country→city picker without changing its external slug-emitting contract.
 */
export default function LocationPicker({ value, onChange }) {
  const options = useMemo(() => buildOptions(cities), [])

  return (
    <div>
      <label
        htmlFor="location-select"
        style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}
      >
        Location
      </label>
      <select
        id="location-select"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          background: '#0f172a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4,
          padding: '6px 10px',
          color: '#e2e8f0',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        {options.map(o => (
          <option key={o.slug} value={o.slug} style={{ background: '#0f172a', color: '#fff' }}>
            {o.country} — {o.city}
          </option>
        ))}
      </select>
    </div>
  )
}
