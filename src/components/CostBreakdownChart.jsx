import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, Legend, ResponsiveContainer, LabelList,
} from 'recharts'

const COLORS = {
  solarCapex:   '#10b981',
  batteryCapex: '#3b82f6',
  solarRepower: '#34d399',
  batteryAug:   '#93c5fd',
  solarOm:      '#6ee7b7',
  batteryOm:    '#bfdbfe',
}

const LABELS = {
  solarCapex:   'Solar CAPEX',
  batteryCapex: 'Battery CAPEX',
  solarRepower: 'Solar Repowering',
  batteryAug:   'Battery Augmentation',
  solarOm:      'Solar O&M',
  batteryOm:    'Battery O&M',
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0f2040',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 6,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, background: p.fill, borderRadius: 2, display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1', fontFamily: '"DM Sans", sans-serif' }}>{LABELS[p.dataKey]}:</span>
          <span style={{ color: '#e2e8f0', fontFamily: '"JetBrains Mono", monospace' }}>
            ${(p.value * 1000).toFixed(2)}/MWh
          </span>
        </div>
      ))}
    </div>
  )
}

const renderLegend = (props) => {
  const { payload } = props
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginBottom: 8 }}>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, background: p.color, borderRadius: 2, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#cbd5e1', fontFamily: '"DM Sans", sans-serif' }}>
            {LABELS[p.dataKey]}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function CostBreakdownChart({ costBreakdown, benchmarkLcoe, benchmarkSource }) {
  if (!costBreakdown) return null

  const data = [
    {
      name: 'LCOE Breakdown',
      solarCapex:   costBreakdown.solarCapex,
      batteryCapex: costBreakdown.batteryCapex,
      solarRepower: costBreakdown.solarRepower,
      batteryAug:   costBreakdown.batteryAug,
      solarOm:      costBreakdown.solarOm,
      batteryOm:    costBreakdown.batteryOm,
    },
  ]

  const total = Object.values(costBreakdown).reduce((a, b) => a + b, 0)
  const benchmarkInKwh = benchmarkLcoe // already $/kWh

  return (
    <div>
      <h3 style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 13,
        fontWeight: 600,
        color: '#cbd5e1',
        margin: '0 0 10px',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        LCOE Cost Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, bottom: 4, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis
            type="number"
            tickFormatter={v => `$${(v * 1000).toFixed(0)}`}
            tick={{ fontSize: 10, fill: '#475569', fontFamily: '"JetBrains Mono", monospace' }}
            axisLine={false}
            tickLine={false}
            unit=""
            domain={[0, Math.max(total * 1.15, benchmarkInKwh * 1.1)]}
          />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend content={renderLegend} />
          {Object.keys(COLORS).map(key => (
            <Bar key={key} dataKey={key} stackId="a" fill={COLORS[key]} radius={key === 'batteryOm' ? [0, 3, 3, 0] : [0, 0, 0, 0]} />
          ))}
          <ReferenceLine
            x={benchmarkInKwh}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: `${benchmarkSource}: $${(benchmarkInKwh * 1000).toFixed(0)}/MWh`,
              position: 'right',
              fontSize: 10,
              fill: '#f59e0b',
              fontFamily: '"DM Sans", sans-serif',
            }}
          />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, color: '#334155', marginTop: -4 }}>
        Values in $/MWh · dashed line = {benchmarkSource} benchmark
      </div>
    </div>
  )
}
