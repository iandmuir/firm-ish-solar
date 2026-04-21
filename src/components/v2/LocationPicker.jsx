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
    <div className="location-picker">
      <label htmlFor="location-select">Location</label>
      <select
        id="location-select"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.slug} value={o.slug}>
            {o.country} — {o.city}
          </option>
        ))}
      </select>
      <style>{`
        .location-picker { display: flex; flex-direction: column; gap: 4px; }
        .location-picker label {
          font-size: 0.85rem; color: rgba(255,255,255,0.7);
        }
        .location-picker select {
          background: rgba(255,255,255,0.05);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 0.95rem;
        }
      `}</style>
    </div>
  )
}
