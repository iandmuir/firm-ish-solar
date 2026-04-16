import React, { useState, useRef, useEffect } from 'react'
import solarData from '../data/solar-data.json'
import { MONTHS } from '../engine/constants.js'

const allCountries = Object.entries(solarData)
  .map(([iso, d]) => ({ iso, name: d.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

function MiniBarChart({ monthly, worstIdx }) {
  const max = Math.max(...monthly)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, marginTop: 6 }}>
      {monthly.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              width: '100%',
              height: `${(v / max) * 24}px`,
              background: i === worstIdx ? '#f59e0b' : '#10b981',
              borderRadius: '2px 2px 0 0',
              opacity: i === worstIdx ? 1 : 0.5,
              minHeight: 2,
            }}
          />
        </div>
      ))}
    </div>
  )
}

export default function CountrySelector({ value, onChange, worstMonthIdx, worstMonthYield }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  const selectedCountry = allCountries.find(c => c.iso === value)
  const filtered = query.length > 0
    ? allCountries.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.iso.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 40)
    : allCountries

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const countryData = solarData[value]

  return (
    <div>
      <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
        Country
      </label>
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div
          onClick={() => { setOpen(!open); if (!open) setTimeout(() => inputRef.current?.focus(), 50) }}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#e2e8f0',
            fontFamily: '"DM Sans", sans-serif',
            fontSize: 13,
          }}
        >
          <span>{selectedCountry?.name || 'Select country'}</span>
          <span style={{ color: '#94a3b8', fontSize: 10 }}>▼</span>
        </div>

        {open && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#0f2040',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            zIndex: 100,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search countries…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  padding: '5px 8px',
                  color: '#e2e8f0',
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {filtered.map(c => (
                <div
                  key={c.iso}
                  onClick={() => { onChange(c.iso); setOpen(false); setQuery('') }}
                  style={{
                    padding: '7px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: c.iso === value ? 'rgba(16,185,129,0.12)' : 'transparent',
                    color: c.iso === value ? '#34d399' : '#e2e8f0',
                    fontSize: 13,
                  }}
                  onMouseEnter={e => { if (c.iso !== value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (c.iso !== value) e.currentTarget.style.background = 'transparent' }}
                >
                  <span>{c.name}</span>
                  <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>
                    {c.iso}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {countryData && (
        <div style={{ marginTop: 10 }}>
          <MiniBarChart monthly={countryData.monthly} worstIdx={worstMonthIdx} />
          <div style={{ display: 'flex', marginTop: 4 }}>
            {MONTHS.map((m, i) => (
              <div key={m} style={{
                flex: 1,
                textAlign: 'center',
                color: i === worstMonthIdx ? '#f59e0b' : '#94a3b8',
                fontSize: 9,
                fontFamily: '"JetBrains Mono", monospace',
              }}>
                {m[0]}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              background: 'rgba(245,158,11,0.15)',
              border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 4,
              padding: '2px 7px',
              fontSize: 11,
              color: '#f59e0b',
              fontFamily: '"JetBrains Mono", monospace',
            }}>
              ↓ {MONTHS[worstMonthIdx]}: {worstMonthYield?.toFixed(2)} kWh/kWp/day
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>binding month</span>
          </div>
        </div>
      )}
    </div>
  )
}
