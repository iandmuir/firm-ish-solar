import React from 'react'

export default function ComparisonIndicator({ lcoeKwh, benchmarkLcoe, benchmarkSource }) {
  if (lcoeKwh == null) return null

  const ratio = lcoeKwh / benchmarkLcoe
  const pctDiff = ((lcoeKwh - benchmarkLcoe) / benchmarkLcoe) * 100

  let status, color, bg, label
  if (ratio <= 1) {
    status = 'below'
    color = '#10b981'
    bg = 'rgba(16,185,129,0.10)'
    label = `${Math.abs(pctDiff).toFixed(1)}% below ${benchmarkSource}`
  } else if (ratio <= 1.2) {
    status = 'close'
    color = '#f59e0b'
    bg = 'rgba(245,158,11,0.10)'
    label = `${pctDiff.toFixed(1)}% above ${benchmarkSource}`
  } else {
    status = 'above'
    color = '#ef4444'
    bg = 'rgba(239,68,68,0.10)'
    label = `${pctDiff.toFixed(1)}% above ${benchmarkSource}`
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 8,
    }}>
      <div style={{
        background: bg,
        border: `1px solid ${color}40`,
        borderRadius: 6,
        padding: '4px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          boxShadow: `0 0 6px ${color}`,
        }} />
        <span style={{
          fontSize: 12,
          color,
          fontFamily: '"DM Sans", sans-serif',
          fontWeight: 500,
        }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: 11, color: '#475569' }}>
        benchmark: ${benchmarkLcoe.toFixed(3)}/kWh
      </span>
    </div>
  )
}
