import React, { useState } from 'react'
import MethodologyModal from './MethodologyModal.jsx'

export default function Header() {
  const [methodologyOpen, setMethodologyOpen] = useState(false)

  return (
    <header style={{
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '14px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'rgba(10,22,40,0.8)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div>
        <h1 style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 18,
          fontWeight: 700,
          color: '#e2e8f0',
          margin: 0,
          letterSpacing: '-0.02em',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981',
          }} />
          Firm(ish) Solar+Storage Sizing & LCOE Calculator
        </h1>
        <p style={{
          margin: '2px 0 0',
          fontSize: 12,
          color: '#94a3b8',
          fontFamily: '"DM Sans", sans-serif',
        }}>
          Solve for the cheapest solar + battery build that holds a 24/7 capacity target at your chosen reliability threshold — across 19 years of hourly insolation data.
        </p>
      </div>
      <button
        onClick={() => setMethodologyOpen(true)}
        style={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 12,
          color: '#94a3b8',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6,
          padding: '6px 12px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
          e.currentTarget.style.color = '#e2e8f0'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
          e.currentTarget.style.color = '#94a3b8'
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>ⓘ</span>
        Methodology
      </button>

      <MethodologyModal open={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
    </header>
  )
}
