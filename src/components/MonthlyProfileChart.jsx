import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer } from 'recharts'
import { MONTHS } from '../engine/constants.js'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0f2040',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
      fontFamily: '"JetBrains Mono", monospace',
      color: '#e2e8f0',
    }}>
      <div style={{ color: '#cbd5e1', marginBottom: 2 }}>{label}</div>
      <div>{payload[0].value.toFixed(2)} kWh/kWp/day</div>
    </div>
  )
}

export default function MonthlyProfileChart({ countryData, worstMonthIdx }) {
  if (!countryData) return null

  const data = countryData.monthly.map((v, i) => ({
    month: MONTHS[i],
    value: v,
    isWorst: i === worstMonthIdx,
  }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 13,
          fontWeight: 600,
          color: '#cbd5e1',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          Monthly Solar Resource (kWh/kWp/day)
        </h3>
        <span style={{ fontSize: 11, color: '#475569', fontFamily: '"DM Sans", sans-serif' }}>
          {countryData.name}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={18}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#475569', fontFamily: '"JetBrains Mono", monospace' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#475569', fontFamily: '"JetBrains Mono", monospace' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.isWorst ? '#f59e0b' : '#10b981'}
                opacity={entry.isWorst ? 1 : 0.55}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, background: '#f59e0b', borderRadius: 2, display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#475569' }}>Binding month (system sized to this)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, background: '#10b981', borderRadius: 2, display: 'inline-block', opacity: 0.55 }} />
          <span style={{ fontSize: 11, color: '#475569' }}>Other months</span>
        </div>
      </div>
    </div>
  )
}
