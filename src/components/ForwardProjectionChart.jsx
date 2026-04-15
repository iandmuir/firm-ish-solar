import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Label, Dot,
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0f2040',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <div style={{ color: '#cbd5e1', marginBottom: 4, fontFamily: '"DM Sans", sans-serif' }}>
        Year {label}
      </div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 2, background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#e2e8f0', fontFamily: '"JetBrains Mono", monospace' }}>
            ${(p.value * 1000).toFixed(1)}/MWh
          </span>
        </div>
      ))}
    </div>
  )
}

const ParityDot = (props) => {
  const { cx, cy } = props
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#f59e0b" stroke="#060d1a" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={12} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.4} />
    </g>
  )
}

export default function ForwardProjectionChart({ projectionData, benchmarkLcoe, benchmarkSource, parityYear }) {
  if (!projectionData?.length) return null

  const chartData = projectionData.map(d => ({
    year: d.year,
    lcoe: d.lcoeKwh,
    benchmark: benchmarkLcoe,
  }))

  const minLcoe = Math.min(...projectionData.map(d => d.lcoeKwh))
  const yMin = Math.max(0, Math.min(minLcoe * 0.85, benchmarkLcoe * 0.7))
  const yMax = Math.max(projectionData[0]?.lcoeKwh * 1.05, benchmarkLcoe * 1.1)

  const parityYearInt = parityYear !== null ? Math.round(parityYear) : null

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
          10-Year LCOE Projection
        </h3>
        {parityYear !== null && parityYear <= 10 && (
          <div style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 11,
            color: '#f59e0b',
            fontFamily: '"DM Sans", sans-serif',
          }}>
            {parityYear === 0
              ? 'Already at cost parity'
              : `Cost parity in Year ${parityYear.toFixed(1)}`
            }
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: -4 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: '#475569', fontFamily: '"JetBrains Mono", monospace' }}
            axisLine={false}
            tickLine={false}
            label={{ value: 'Years from now', position: 'insideBottom', offset: -4, fontSize: 10, fill: '#334155' }}
          />
          <YAxis
            tickFormatter={v => `$${(v * 1000).toFixed(0)}`}
            tick={{ fontSize: 10, fill: '#475569', fontFamily: '"JetBrains Mono", monospace' }}
            axisLine={false}
            tickLine={false}
            domain={[yMin, yMax]}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Benchmark reference line */}
          <ReferenceLine
            y={benchmarkLcoe}
            stroke="#f59e0b"
            strokeDasharray="5 4"
            strokeWidth={1.5}
          />

          {/* Parity crossing reference line */}
          {parityYear !== null && parityYear > 0 && parityYear <= 10 && (
            <ReferenceLine
              x={Math.round(parityYear)}
              stroke="#f59e0b"
              strokeDasharray="2 4"
              strokeWidth={1}
              opacity={0.5}
            />
          )}

          {/* Projected LCOE line */}
          <Line
            type="monotone"
            dataKey="lcoe"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#10b981', stroke: '#060d1a', strokeWidth: 2 }}
            name="Firm Solar+Storage LCOE"
          />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 16, height: 2, background: '#10b981', borderRadius: 1 }} />
          <span style={{ fontSize: 11, color: '#475569' }}>Firm Solar+Storage</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 16, height: 0, border: '1px dashed #f59e0b' }} />
          <span style={{ fontSize: 11, color: '#475569' }}>{benchmarkSource} benchmark</span>
        </div>
      </div>
    </div>
  )
}
