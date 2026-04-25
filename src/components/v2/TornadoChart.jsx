import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'

// Tornado chart: horizontal range bars per parameter, sorted by absolute LCOE
// swing. Each bar runs from the lower of {low-input LCOE, high-input LCOE} to
// the higher. A vertical reference line marks the baseline blended LCOE so the
// reader can see how each parameter pulls LCOE *relative to today's design*.
// Single neutral fill — the bar's position relative to the baseline already
// communicates direction; doubling that with color was overkill.
//
// Top 10 shown by default with a "Show all" toggle.

const COLLAPSED_LIMIT = 10
const ROW_HEIGHT = 24
const COLOR_BAR  = '#94a3b8'  // slate-400 — neutral, doesn't compete with the other charts
const COLOR_BASE = 'rgba(255,255,255,0.7)'

function fmtUsd(v) { return `$${v.toFixed(0)}` }

function fmtParamValue(value, unit) {
  if (typeof value !== 'number') return String(value)
  // Compact formatting: integers stay integer, fractional values get up to 3 sig figs
  const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(value < 1 ? 3 : 2)
  return unit ? `${formatted} ${unit}` : formatted
}

function TornadoTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null
  const e = payload[0]?.payload?.entry
  if (!e) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 4,
      padding: '8px 10px',
      fontSize: 11,
      fontFamily: '"DM Sans", sans-serif',
      color: '#e2e8f0',
      maxWidth: 280,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{e.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px', fontFamily: '"JetBrains Mono", monospace' }}>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>low</span>
        <span>{fmtParamValue(e.low.value, e.unit)} → {fmtUsd(e.low.blendedLcoe)}/MWh</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>high</span>
        <span>{fmtParamValue(e.high.value, e.unit)} → {fmtUsd(e.high.blendedLcoe)}/MWh</span>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>swing</span>
        <span>{fmtUsd(e.swing)}/MWh</span>
      </div>
    </div>
  )
}

export default function TornadoChart({ sensitivity }) {
  const [expanded, setExpanded] = useState(false)

  // Build chart rows. Each row carries a `range: [lo, hi]` tuple — Recharts
  // renders range bars natively when a Bar's dataKey returns a 2-element array
  // (provided you don't stack them; stacking forces scalar values and silently
  // collapses the tuple to its end value, which is what bit us before).
  // Recharts' vertical layout puts the first data entry at the *top* of the
  // chart, so passing `sensitivity` in its native (descending-by-swing) order
  // gives the canonical tornado shape: biggest mover up top, smallest at the
  // bottom.
  const rows = useMemo(() => {
    if (!sensitivity || sensitivity.length === 0) return []
    const visible = expanded ? sensitivity : sensitivity.slice(0, COLLAPSED_LIMIT)
    return visible.map((entry) => {
      const lo = Math.min(entry.low.blendedLcoe, entry.high.blendedLcoe)
      const hi = Math.max(entry.low.blendedLcoe, entry.high.blendedLcoe)
      return { label: entry.label, range: [lo, hi], entry }
    })
  }, [sensitivity, expanded])

  if (!sensitivity || sensitivity.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>No sensitivity data available.</div>
  }

  const baseLcoe = sensitivity[0].baseLcoe
  const visible = expanded ? sensitivity : sensitivity.slice(0, COLLAPSED_LIMIT)
  const hidden = sensitivity.length - visible.length

  // Domain: pad slightly beyond observed extremes so end-caps aren't flush
  // against the chart edge.
  const allLcoes = sensitivity.flatMap(e => [e.low.blendedLcoe, e.high.blendedLcoe, e.baseLcoe])
  const minLcoe = Math.min(...allLcoes)
  const maxLcoe = Math.max(...allLcoes)
  const pad = (maxLcoe - minLcoe) * 0.05 || 1
  const domain = [Math.floor(minLcoe - pad), Math.ceil(maxLcoe + pad)]

  const chartHeight = visible.length * ROW_HEIGHT + 60

  return (
    <div style={{ width: '100%' }}>
      <div style={{ width: '100%', height: chartHeight }}>
        <ResponsiveContainer>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 24, left: 8 }}
            barCategoryGap="20%"
          >
            <XAxis
              type="number"
              domain={domain}
              tickFormatter={fmtUsd}
              tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
              label={{ value: 'Blended LCOE ($/MWh)', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={150}
              tick={{ fill: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: '"DM Sans", sans-serif' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            />
            <Tooltip content={<TornadoTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <ReferenceLine
              x={baseLcoe}
              stroke={COLOR_BASE}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              label={{ value: `Baseline ${fmtUsd(baseLcoe)}`, position: 'top', fill: COLOR_BASE, fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }}
            />
            <Bar
              dataKey="range"
              fill={COLOR_BAR}
              fillOpacity={0.75}
              radius={[2, 2, 2, 2]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        fontSize: 11,
        color: 'rgba(255,255,255,0.55)',
        fontFamily: '"DM Sans", sans-serif',
      }}>
        <span>
          Each bar sweeps a single input across a plausible range; sizing held fixed at baseline.
        </span>
        {sensitivity.length > COLLAPSED_LIMIT && (
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0',
              fontSize: 11,
              fontFamily: '"DM Sans", sans-serif',
              padding: '4px 10px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {expanded ? `Show top ${COLLAPSED_LIMIT}` : `Show all (${hidden} more)`}
          </button>
        )}
      </div>
    </div>
  )
}
