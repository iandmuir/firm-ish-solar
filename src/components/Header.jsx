import React from 'react'

export default function Header() {
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
          Firm(ish) Solar+Storage Sizing and LCOE Calculator
        </h1>
        <p style={{
          margin: '2px 0 0',
          fontSize: 12,
          color: '#94a3b8',
          fontFamily: '"DM Sans", sans-serif',
        }}>
          Utility-scale firm renewables — delivers consistent 24/7 power averaging the monthly capacity target
        </p>
      </div>
      <div style={{
        fontSize: 11,
        color: '#64748b',
        fontFamily: '"JetBrains Mono", monospace',
        textAlign: 'right',
      }}>
        <div>PVOUT Level 1 data</div>
        <div>Solargis © 2024</div>
      </div>
    </header>
  )
}
