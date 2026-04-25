import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

// Colors mirror the LCOE Breakdown card so the two views read as a paired
// set. OPEX = ambers, REINVEST = blues. Stack order is bottom→top: backup,
// solar O&M, battery O&M, inverter repl, battery aug. Backup sits at the
// bottom because the rate is a fixed user input — it acts as the stable
// visual baseline even though the year-on-year amount varies with weather
// cycling and escalation.
const SERIES = [
  { key: 'backup',       label: 'Backup power',         color: '#f87171' }, // red-400
  { key: 'solarOm',      label: 'Solar O&M',            color: '#fbbf24' }, // amber-400
  { key: 'batteryOm',    label: 'Battery O&M',          color: '#fb923c' }, // orange-400
  { key: 'inverterRepl', label: 'Inverter replacement', color: '#60a5fa' }, // blue-400
  { key: 'batteryAug',   label: 'Battery augment.',     color: '#a78bfa' }, // violet-400
]

// Tooltip values: 1 decimal so sub-million values are still informative
// (e.g. "$1.4M" instead of "$1M").
function fmtUsd(n) {
  if (!n) return '—'
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K'
  return '$' + n.toFixed(0)
}

// Y-axis ticks: integer-rounded so the axis reads "$20M" not "$20.0M".
// Recharts picks round-number ticks anyway, so .toFixed(0) is lossless.
function fmtAxis(n) {
  if (!n) return '$0'
  if (n >= 1e6) return '$' + Math.round(n / 1e6) + 'M'
  if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'
  return '$' + Math.round(n)
}

export default function OpexReplacementChart({
  projectLifetime,
  costs,
  unmetByYear,
  backupCostPerMWh,
  opexEscalationPct,
}) {
  const data = useMemo(() => {
    if (!costs || !unmetByYear) return []
    const esc = (opexEscalationPct ?? 0) / 100
    const annualSolarOm = costs.annualOm?.solar ?? 0
    const annualBatteryOm = costs.annualOm?.battery ?? 0
    const dispatchYears = unmetByYear.length || 1

    // Index event arrays by year for O(1) lookup per bar.
    const invByYear = new Map((costs.inverterReplacementEvents ?? []).map(e => [e.year, e.capex]))
    const augByYear = new Map((costs.batteryAugEvents ?? []).map(e => [e.year, e.capex]))

    const rows = []
    for (let y = 1; y <= projectLifetime; y++) {
      const escFactor = Math.pow(1 + esc, y - 1)
      const dispatchIdx = (y - 1) % dispatchYears
      rows.push({
        year: y,
        backup: unmetByYear[dispatchIdx] * backupCostPerMWh * escFactor,
        solarOm: annualSolarOm * escFactor,
        batteryOm: annualBatteryOm * escFactor,
        inverterRepl: invByYear.get(y) ?? 0,
        batteryAug: augByYear.get(y) ?? 0,
      })
    }
    return rows
  }, [costs, unmetByYear, backupCostPerMWh, opexEscalationPct, projectLifetime])

  if (!data.length) return null

  // Ticks every 5 years, plus year 1 so the start of the project life is
  // explicitly anchored on the axis.
  const ticks = []
  for (let y = 5; y <= projectLifetime; y += 5) ticks.push(y)
  if (!ticks.includes(1)) ticks.unshift(1)

  return (
    <div style={{ width: '100%', height: 220, display: 'flex', flexDirection: 'column' }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }} barCategoryGap="10%">
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[0.5, projectLifetime + 0.5]}
            ticks={ticks}
            tickLine={false}
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
            label={{ value: 'Project year', position: 'insideBottom', offset: -2, fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          />
          <YAxis
            tickFormatter={fmtAxis}
            tick={{ fill: 'rgba(255,255,255,0.6)' }}
            label={{ value: 'Annual spend', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)', style: { textAnchor: 'middle' } }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12 }}
            labelFormatter={(y) => `Year ${y}`}
            content={<StackedTooltip />}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={20}
            wrapperStyle={{ fontSize: 11 }}
            iconType="square"
            // Reverse so legend top-to-bottom matches the visual stack
            // top-to-bottom (last Bar drawn = top of stack).
            payload={SERIES.slice().reverse().map(s => ({
              value: s.label, type: 'square', color: s.color, id: s.key,
            }))}
          />
          {SERIES.map(s => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="spend"
              name={s.label}
              fill={s.color}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Custom tooltip: reverse the series so top-of-stack reads first, append a
// total row, and use em-dash for zero-value rows so the row order stays
// consistent across years (no shifting layout).
function StackedTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  // Recharts orders payload by Bar render order (bottom→top). Reverse for display.
  const ordered = SERIES.slice().reverse().map(s => {
    const item = payload.find(p => p.dataKey === s.key)
    return { ...s, value: item?.value ?? 0 }
  })
  const total = ordered.reduce((sum, r) => sum + r.value, 0)
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 4,
      padding: '8px 10px',
      fontSize: 12,
      fontFamily: '"DM Sans", sans-serif',
      minWidth: 200,
    }}>
      <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: 6 }}>Year {label}</div>
      {ordered.map(r => (
        <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: '#cbd5e1', lineHeight: 1.6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, background: r.color, display: 'inline-block', borderRadius: 2 }} />
            {r.label}
          </span>
          <span style={{ fontFamily: '"JetBrains Mono", monospace', color: r.value > 0 ? '#e2e8f0' : '#475569' }}>
            {fmtUsd(r.value)}
          </span>
        </div>
      ))}
      <div style={{
        marginTop: 6,
        paddingTop: 6,
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        color: '#7dd3fc',
        fontWeight: 600,
      }}>
        <span>Total</span>
        <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>{fmtUsd(total)}</span>
      </div>
    </div>
  )
}
