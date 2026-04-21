import React from 'react'

function fmtM(n) {
  return '$' + (n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + 'M'
}

const PARTS = [
  { key: 'solar',    label: 'Solar',    color: '#10b981' },
  { key: 'battery',  label: 'Battery',  color: '#60a5fa' },
  { key: 'grid',     label: 'Grid',     color: '#fbbf24' },
  { key: 'inverter', label: 'Inverter', color: '#a78bfa' },
]

export default function InitialCapexBreakdown({ initialCapex }) {
  if (!initialCapex) return null
  const total = initialCapex.total

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {PARTS.map(p => (
            <div key={p.key}>
              <div style={{ fontSize: 11, color: p.color, marginBottom: 2 }}>{p.label}</div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#e2e8f0' }}>
                {fmtM(initialCapex[p.key])}
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>Total</div>
          <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
            {fmtM(total)}
          </div>
        </div>
      </div>
      {/* Segmented CAPEX bar */}
      <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: '#162d58', overflow: 'hidden', display: 'flex' }}>
        {PARTS.map(p => (
          <div key={p.key} style={{
            height: '100%',
            width: `${(initialCapex[p.key] / total) * 100}%`,
            background: p.color,
          }} />
        ))}
      </div>
      {/* Segment labels anchored to the left edge of each bar segment.
          Grid + inverter are merged into one label since each is too thin
          to fit its own tag. */}
      {(() => {
        const solarPct = (initialCapex.solar / total) * 100
        const batteryPct = (initialCapex.battery / total) * 100
        const gridInvPct = ((initialCapex.grid + initialCapex.inverter) / total) * 100
        const gridRightAlign = gridInvPct < 10
        const labels = [
          { left: 0, right: null, text: `Solar ${solarPct.toFixed(0)}%`, color: '#10b981' },
          { left: solarPct, right: null, text: `Battery ${batteryPct.toFixed(0)}%`, color: '#60a5fa' },
          gridRightAlign
            ? { left: null, right: 0, text: `Grid + Inverter ${gridInvPct.toFixed(0)}%`, color: '#fbbf24' }
            : { left: solarPct + batteryPct, right: null, text: `Grid + Inverter ${gridInvPct.toFixed(0)}%`, color: '#fbbf24' },
        ]
        return (
          <div style={{ position: 'relative', height: 14, marginTop: 3 }}>
            {labels.map((l) => (
              <span key={l.text} style={{
                position: 'absolute',
                left: l.left != null ? `${l.left}%` : undefined,
                right: l.right != null ? `${l.right}%` : undefined,
                fontSize: 10,
                color: l.color,
                whiteSpace: 'nowrap',
              }}>
                {l.text}
              </span>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
