import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts'

// Firmness vs LCOE: how the optimized RE-system and blended LCOE scale with the
// firmness target. Each x-axis point is its OWN optimized design (different
// sizing, different cost), not the same design re-evaluated at different
// thresholds — the subtitle conveys this so the curve isn't misread as a
// "performance derating" line.
//
// Data source: results.sweep — already computed by calculateV2 across the
// configured thresholdSweepPoints. Pure render: no engine work needed.
//
// Infeasibility handling: thresholds where the solver returns feasible:false
// get null LCOE so the line breaks cleanly. A right-side annotation labels
// the rightmost feasible threshold so the boundary is named.

const COLOR_SYSTEM   = '#7dd3fc'
const COLOR_BLENDED  = '#fbbf24'
const COLOR_BENCH    = '#ef4444'
const COLOR_CURRENT  = 'rgba(255,255,255,0.55)'
const COLOR_INFEASIBLE = '#fca5a5'

function fmtUsd(v) { return v == null ? '—' : `$${v.toFixed(0)}/MWh` }

function FvLTooltip({ active, payload, label, benchmarkLcoe, benchmarkSource }) {
  if (!active || !payload || payload.length === 0) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 4,
      padding: '8px 10px',
      fontSize: 11,
      fontFamily: '"DM Sans", sans-serif',
      color: '#e2e8f0',
      maxWidth: 280,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        {label}% firmness
        {!row.feasible && <span style={{ color: COLOR_INFEASIBLE, marginLeft: 6 }}>· infeasible</span>}
      </div>
      {row.feasible && (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 8px', fontFamily: '"JetBrains Mono", monospace' }}>
          <span style={{ color: COLOR_BLENDED }}>Blended</span>
          <span>{fmtUsd(row.blendedLcoe)}</span>
          <span style={{ color: COLOR_SYSTEM }}>RE-system</span>
          <span>{fmtUsd(row.systemLcoe)}</span>
          {benchmarkLcoe != null && (
            <>
              <span style={{ color: COLOR_BENCH }}>{benchmarkSource ?? 'Benchmark'}</span>
              <span>{fmtUsd(benchmarkLcoe)}</span>
            </>
          )}
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>Achieved</span>
          <span>{row.achievedPct.toFixed(2)}%</span>
          <span style={{ color: 'rgba(255,255,255,0.55)' }}>Sizing</span>
          <span>{Math.round(row.solarMW)} MW · {Math.round(row.batteryMWh)} MWh</span>
        </div>
      )}
    </div>
  )
}

export default function FirmnessVsLcoeChart({
  sweep,
  benchmarkLcoe,
  benchmarkSource,
  currentThresholdPct,
}) {
  if (!sweep || sweep.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>No sweep data available.</div>
  }

  const data = sweep.map(entry => ({
    thresholdPct: entry.thresholdPct,
    feasible: entry.feasible,
    systemLcoe:  entry.feasible ? entry.costs.systemLcoePerMWh  : null,
    blendedLcoe: entry.feasible ? entry.costs.blendedLcoePerMWh : null,
    achievedPct: entry.feasible ? entry.dispatch.firmnessAchieved * 100 : 0,
    solarMW:     entry.feasible ? entry.solarMW   : 0,
    batteryMWh:  entry.feasible ? entry.batteryMWh : 0,
  }))

  // Find the rightmost feasible threshold to anchor the infeasibility label.
  // We don't shrink the x-axis domain — we want the user to see that 99.5%
  // is part of the considered range, just unattainable at this site.
  const lastFeasible = [...data].reverse().find(d => d.feasible)
  const anyInfeasible = data.some(d => !d.feasible)

  // Y-axis: round up to a tidy $10/MWh tick above the highest value.
  const lcoeValues = data.flatMap(d => [d.systemLcoe, d.blendedLcoe]).filter(v => v != null)
  if (benchmarkLcoe != null) lcoeValues.push(benchmarkLcoe)
  const yMax = Math.ceil((Math.max(...lcoeValues) * 1.1) / 10) * 10
  const xMin = data[0].thresholdPct
  const xMax = data[data.length - 1].thresholdPct

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Custom legend rendered ABOVE the chart. Replacing Recharts' inline
          <Legend> here fixes two things at once:
          (1) the absolute-positioned wrapper trick was leaving reserved
              layout space below the plot — that's the white-space gap;
          (2) Recharts gives no clean way to add a non-Line series (our
              benchmark ReferenceLine) into its legend, so the dashed red
              line had to be labelled inline on the chart, which clipped on
              the right edge. A hand-rolled legend names every visible
              element with a matching swatch — no clipping, no overlap. */}
      <ChartLegend
        benchmarkLcoe={benchmarkLcoe}
        benchmarkSource={benchmarkSource}
        anyInfeasible={anyInfeasible}
        lastFeasiblePct={lastFeasible?.thresholdPct}
      />
      <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 18, bottom: 22, left: 8 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis
            dataKey="thresholdPct"
            type="number"
            domain={[xMin, xMax]}
            ticks={data.map(d => d.thresholdPct)}
            tickFormatter={(v) => `${v}%`}
            label={{ value: 'Firmness threshold (%)', position: 'insideBottom', offset: -4, fill: 'rgba(255,255,255,0.6)' }}
            tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }}
          />
          <YAxis
            domain={[0, yMax]}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            label={{ value: '$/MWh', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.6)' }}
            tick={{ fill: 'rgba(255,255,255,0.6)' }}
          />
          <Tooltip content={<FvLTooltip benchmarkLcoe={benchmarkLcoe} benchmarkSource={benchmarkSource} />} />

          {/* Benchmark — drawn first so the system/blended lines sit on top
              when they cross. Named in the custom legend above; no inline
              label here (label was clipping at the right axis). */}
          {benchmarkLcoe != null && (
            <ReferenceLine
              y={benchmarkLcoe}
              stroke={COLOR_BENCH}
              strokeWidth={2}
              strokeDasharray="6 4"
              ifOverflow="extendDomain"
            />
          )}

          {/* "You are here" — vertical line at the user's currently-selected
              threshold. Inline label sits at the top of the line and shifts
              its text-anchor to the OPPOSITE side of the chart center so it
              never clips against the left or right edge. (At 99.5% the line
              is at the right edge, so the label grows leftward; at 70% it
              grows rightward.) */}
          {currentThresholdPct != null && (
            <ReferenceLine
              x={currentThresholdPct}
              stroke={COLOR_CURRENT}
              strokeWidth={1}
              strokeDasharray="2 4"
              ifOverflow="extendDomain"
              label={(props) => {
                const vb = props.viewBox
                if (!vb) return null
                const isRightHalf = currentThresholdPct > (xMin + xMax) / 2
                const dx = isRightHalf ? -5 : 5
                const anchor = isRightHalf ? 'end' : 'start'
                return (
                  <text
                    x={vb.x + dx}
                    y={vb.y + 11}
                    fill={COLOR_CURRENT}
                    fontSize={10}
                    fontFamily='"JetBrains Mono", monospace'
                    textAnchor={anchor}
                  >
                    Current target · {currentThresholdPct}%
                  </text>
                )
              }}
            />
          )}

          {/* Infeasibility marker: rightmost feasible threshold gets a
              vertical guide; legend above explains it. */}
          {anyInfeasible && lastFeasible && (
            <ReferenceLine
              x={lastFeasible.thresholdPct}
              stroke={COLOR_INFEASIBLE}
              strokeWidth={1}
              strokeDasharray="1 3"
            />
          )}

          <Line
            type="monotone"
            dataKey="systemLcoe"
            name="RE-System LCOE"
            stroke={COLOR_SYSTEM}
            strokeWidth={2}
            dot={{ r: 3, fill: COLOR_SYSTEM, stroke: COLOR_SYSTEM }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="blendedLcoe"
            name="Blended LCOE"
            stroke={COLOR_BLENDED}
            strokeWidth={2}
            dot={{ r: 3, fill: COLOR_BLENDED, stroke: COLOR_BLENDED }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}

// Hand-rolled legend that lives outside the LineChart so we can mix Line
// series and ReferenceLine entries (benchmark, current threshold, infeasible
// boundary) under one consistent visual treatment.
function ChartLegend({ benchmarkLcoe, benchmarkSource, anyInfeasible, lastFeasiblePct }) {
  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px 14px',
      alignItems: 'center',
      fontSize: 11,
      fontFamily: '"DM Sans", sans-serif',
      color: 'rgba(255,255,255,0.85)',
      marginBottom: 4,
    }}>
      <LegendSwatch color={COLOR_BLENDED} solid label="Blended LCOE" />
      <LegendSwatch color={COLOR_SYSTEM}  solid label="RE-System LCOE" />
      {benchmarkLcoe != null && (
        <LegendSwatch
          color={COLOR_BENCH}
          dash="6 4"
          label={`${benchmarkSource ?? 'Benchmark'} (${`$${benchmarkLcoe.toFixed(0)}/MWh`})`}
        />
      )}
      {anyInfeasible && (
        <LegendSwatch color={COLOR_INFEASIBLE} dash="1 3" label={`✕ infeasible above ${lastFeasiblePct}%`} />
      )}
    </div>
  )
}

function LegendSwatch({ color, solid, dash, label }) {
  // 18px-wide SVG line so dashed strokes read clearly at this size. Solid
  // entries get a slightly thicker stroke to mirror how they look on chart.
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
      <svg width={18} height={8} aria-hidden="true">
        <line
          x1={0} y1={4} x2={18} y2={4}
          stroke={color}
          strokeWidth={solid ? 2 : 1.5}
          strokeDasharray={dash || undefined}
        />
      </svg>
      <span>{label}</span>
    </span>
  )
}
