import React from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ReferenceLine, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function ProjectionChartV2({ curve, benchmarkLcoe, benchmarkSource }) {
  // Engine reports $/MWh; chart displays $/kWh (÷1000).
  const data = curve.map(p => ({
    projectionYear: p.projectionYear,
    systemLcoeKwh: p.systemLcoePerMWh != null ? p.systemLcoePerMWh / 1000 : null,
    blendedLcoeKwh: p.blendedLcoePerMWh != null ? p.blendedLcoePerMWh / 1000 : null,
  }))

  const benchmarkKwh = benchmarkLcoe != null ? benchmarkLcoe : null // already $/kWh
  const systemMax = Math.max(...data.map(p => p.blendedLcoeKwh ?? 0))
  const rawMax = benchmarkKwh != null ? Math.max(systemMax, benchmarkKwh) * 1.1 : systemMax * 1.1
  // Round up to nearest $0.01
  const yMax = Math.ceil(rawMax * 100) / 100

  const fmt = (v) => `$${v.toFixed(3)}/kWh`

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
            tickFormatter={(v) => `$${v.toFixed(2)}`}
            label={{ value: '$/kWh', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
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
          <Line type="monotone" dataKey="systemLcoeKwh" name="RE-System LCOE" stroke="#7dd3fc" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="blendedLcoeKwh" name="Blended LCOE" stroke="#fbbf24" strokeWidth={2} dot={false} />
          {benchmarkKwh != null && (
            <ReferenceLine
              y={benchmarkKwh}
              stroke="#ef4444"
              strokeDasharray="6 4"
              ifOverflow="extendDomain"
              isFront={true}
              label={(props) => {
                const { viewBox } = props
                const text = `${benchmarkSource ?? 'Benchmark'}: $${benchmarkKwh.toFixed(3)}/kWh`
                const padX = 6
                const padY = 3
                const approxCharW = 6.2
                const textW = text.length * approxCharW
                const boxW = textW + padX * 2
                const boxH = 18
                const x = viewBox.x + viewBox.width - boxW - 4
                const y = viewBox.y + 4
                return (
                  <g>
                    <rect
                      x={x}
                      y={y}
                      width={boxW}
                      height={boxH}
                      fill="rgba(15,23,42,0.85)"
                      stroke="rgba(239,68,68,0.5)"
                      strokeWidth={1}
                      rx={3}
                    />
                    <text
                      x={x + padX}
                      y={y + boxH / 2}
                      fill="#fca5a5"
                      fontSize={11}
                      dominantBaseline="middle"
                    >
                      {text}
                    </text>
                  </g>
                )
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
