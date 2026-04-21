import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function ProjectionChartV2({ curve }) {
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={curve}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis dataKey="projectionYear" label={{ value: 'Years from now', position: 'bottom', fill: 'rgba(255,255,255,0.6)' }} tick={{ fill: 'rgba(255,255,255,0.6)' }} />
          <YAxis label={{ value: '$/MWh', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }} tick={{ fill: 'rgba(255,255,255,0.6)' }} />
          <Tooltip formatter={(v) => `$${v.toFixed(0)}/MWh`} />
          <Legend />
          <Line type="monotone" dataKey="systemLcoePerMWh" name="System LCOE" stroke="#7dd3fc" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="blendedLcoePerMWh" name="Blended LCOE" stroke="#fbbf24" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
