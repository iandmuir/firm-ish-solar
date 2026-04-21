import React, { useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'
import { computeDailyResourceCurve } from '../../engine/solar-resource.js'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
// Day-of-year (0-indexed, non-leap) of the 1st of each month
const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
// Mid-month positions for label placement
const MONTH_MIDS = MONTH_STARTS.map((s, i) => s + Math.floor(DAYS_IN_MONTH[i] / 2))

export default function SolarResourceChart({ cityData }) {
  const curve = useMemo(() => {
    if (!cityData) return []
    return computeDailyResourceCurve(cityData)
  }, [cityData])

  if (!curve.length) return null

  const data = curve.map(row => ({
    doy: row.doy,
    median: row.median,
    // Recharts Area supports dataKey returning [low, high] for a ranged area.
    band: [row.p10, row.p90],
  }))

  const rawMax = Math.max(...curve.map(r => r.p90))
  const yMax = Math.ceil(rawMax / 1100) * 1100
  const fmt = (v) => Math.round(v).toLocaleString('en-US')

  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="doy"
            type="number"
            domain={[0, 364]}
            ticks={MONTH_MIDS}
            tickLine={false}
            tickFormatter={(d) => {
              const idx = MONTH_MIDS.indexOf(d)
              return idx >= 0 ? MONTH_LABELS[idx] : ''
            }}
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          />
          <YAxis
            domain={[0, yMax]}
            allowDecimals={false}
            tickFormatter={fmt}
            label={{ value: 'kWh/kWp/day', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)', style: { textAnchor: 'middle' } }}
            tick={{ fill: 'rgba(255,255,255,0.6)' }}
          />
          <Tooltip
            labelFormatter={(doy) => {
              // doy 0-indexed non-leap → calendar label
              const d = new Date(2001, 0, 1) // 2001 is non-leap
              d.setDate(d.getDate() + doy)
              return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            }}
            formatter={(value, name) => {
              if (Array.isArray(value)) {
                return [`${fmt(value[0])} – ${fmt(value[1])}`, name]
              }
              return [fmt(value), name]
            }}
            contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
          />
          <Legend
            align="left"
            verticalAlign="top"
            height={0}
            wrapperStyle={{
              position: 'absolute',
              left: 50,
              right: 'auto',
              top: 4,
              bottom: 'auto',
              width: 'auto',
              fontSize: 11,
              background: 'rgba(15,23,42,0.7)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          />
          <Area
            type="monotone"
            dataKey="band"
            name="P10–P90 across years"
            stroke="none"
            fill="#fbbf24"
            fillOpacity={0.18}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="median"
            name="Median day"
            stroke="#fbbf24"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
