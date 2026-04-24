import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function ProjectionChartV2({ curve, benchmarkLcoe, benchmarkSource, benchmarkEscalationPct = 0 }) {
  // Engine reports $/MWh; benchmark is already $/MWh. Chart renders $/MWh directly.
  const escalation = (benchmarkEscalationPct ?? 0) / 100
  const data = curve.map(p => ({
    projectionYear: p.projectionYear,
    systemLcoeMWh: p.systemLcoePerMWh ?? null,
    blendedLcoeMWh: p.blendedLcoePerMWh ?? null,
    benchmarkMWh: benchmarkLcoe != null ? benchmarkLcoe * Math.pow(1 + escalation, p.projectionYear) : null,
  }))

  const benchmarkMWh = benchmarkLcoe != null ? benchmarkLcoe : null // year-0 $/MWh
  const benchmarkMax = benchmarkMWh != null ? Math.max(...data.map(p => p.benchmarkMWh ?? 0)) : 0
  const systemMax = Math.max(...data.map(p => p.blendedLcoeMWh ?? 0))
  const rawMax = benchmarkMWh != null ? Math.max(systemMax, benchmarkMax) * 1.1 : systemMax * 1.1
  // Round up to nearest $10/MWh for a tidy axis.
  const yMax = Math.ceil(rawMax / 10) * 10

  const fmt = (v) => `$${v.toFixed(0)}/MWh`

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="projectionYear"
            label={{ value: 'Years from now', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.6)' }}
            tick={{ fill: 'rgba(255,255,255,0.6)' }}
          />
          <YAxis
            domain={[0, yMax]}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            label={{ value: '$/MWh', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
            tick={{ fill: 'rgba(255,255,255,0.6)' }}
          />
          <Tooltip formatter={(v) => fmt(v)} />
          <Legend
            align="left"
            verticalAlign="bottom"
            wrapperStyle={{
              position: 'absolute',
              left: 71,
              right: 'auto',
              bottom: 90,
              top: 'auto',
              width: 'auto',
              fontSize: 11,
              background: 'rgba(15,23,42,0.7)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          />
          <Line type="monotone" dataKey="systemLcoeMWh" name="RE-System LCOE" stroke="#7dd3fc" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="blendedLcoeMWh" name="Blended LCOE" stroke="#fbbf24" strokeWidth={2} dot={false} isAnimationActive={false} />
          {benchmarkMWh != null && (
            <Line
              type="monotone"
              dataKey="benchmarkMWh"
              name={benchmarkSource ?? 'Benchmark'}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
