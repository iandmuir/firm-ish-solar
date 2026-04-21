import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const LABELS = {
  solarCapex: 'Solar CAPEX',
  batteryCapex: 'Battery CAPEX',
  gridCapex: 'Grid',
  invCapex: 'Inverter',
  inverterReplacement: 'Inverter replacement',
  batteryAug: 'Battery aug',
  solarOm: 'Solar O&M',
  batteryOm: 'Battery O&M',
  backup: 'Backup',
}

export default function CostBreakdownV2({ breakdown }) {
  // breakdown is $/kWh; convert to $/MWh (×1000) for readability
  const data = [{
    name: 'LCOE breakdown',
    ...Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, v * 1000])),
  }]
  const keys = Object.keys(LABELS)
  const palette = ['#38bdf8', '#818cf8', '#fb7185', '#fbbf24', '#a3a3a3', '#22d3ee', '#f472b6', '#4ade80', '#a78bfa', '#f87171']

  return (
    <div style={{ width: '100%', height: 200 }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" stackOffset="expand" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.6)' }} />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            formatter={(v) => `$${v.toFixed(2)}/MWh`}
            allowEscapeViewBox={{ x: true, y: true }}
            wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
          />
          <Legend />
          {keys.map((k, i) => (
            <Bar key={k} dataKey={k} name={LABELS[k]} stackId="a" fill={palette[i % palette.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
