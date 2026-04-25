import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, ReferenceDot } from 'recharts'

export default function ProjectionChartV2({ curve, benchmarkLcoe, benchmarkSource, benchmarkEscalationPct = 0, crossovers }) {
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
            type="number"
            domain={[0, Math.max(...data.map(p => p.projectionYear))]}
            allowDecimals={false}
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
          {/* Crossover markers — dot at the crossover point with a short
              dashed leader rising above any chart lines to a haloed label.
              The leader + halo combination keeps the year readable even
              when another line passes through where the label sits.
              Conditional: null crossovers (no benchmark, already-winning,
              or never crosses) render nothing. */}
          {crossovers?.system && (
            <ReferenceDot
              x={crossovers.system.yearsFromNow}
              y={crossovers.system.lcoeAtCrossover}
              isFront
              shape={(props) => (
                <CrossoverMarker
                  {...props}
                  color="#7dd3fc"
                  label={`${crossovers.system.yearsFromNow.toFixed(1)} yr`}
                />
              )}
            />
          )}
          {crossovers?.blended && (
            <ReferenceDot
              x={crossovers.blended.yearsFromNow}
              y={crossovers.blended.lcoeAtCrossover}
              isFront
              shape={(props) => (
                <CrossoverMarker
                  {...props}
                  color="#fbbf24"
                  label={`${crossovers.blended.yearsFromNow.toFixed(1)} yr`}
                />
              )}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Custom ReferenceDot shape: dot at crossover + thin dashed leader rising
// above any chart lines to a haloed label. The text uses paint-order +
// stroke trick to draw a navy halo behind the glyphs so the label stays
// readable even if another chart line passes directly through it.
function CrossoverMarker({ cx, cy, color, label }) {
  if (cx == null || cy == null) return null
  const leaderHeight = 28
  const labelY = cy - leaderHeight - 6
  return (
    <g>
      <line
        x1={cx} y1={cy}
        x2={cx} y2={cy - leaderHeight}
        stroke={color}
        strokeWidth={1}
        strokeDasharray="2 2"
        opacity={0.7}
      />
      <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontFamily='"JetBrains Mono", monospace'
        fontWeight={600}
        style={{ paintOrder: 'stroke', stroke: '#0a1628', strokeWidth: 3, strokeLinejoin: 'round' }}
      >
        {label}
      </text>
    </g>
  )
}
