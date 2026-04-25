import React, { useMemo } from 'react'

// Each LCOE line item belongs to one of three groups. Group assignment
// determines the bar color and the "CAPEX / OPEX / REINVEST" legend pills
// at the top. Legend order is capex → opex → reinvest.
const GROUPS = {
  capex:    { label: 'CAPEX',    color: '#10b981' }, // greens — amortized initial capex
  opex:     { label: 'OPEX',     color: '#fbbf24' }, // ambers — operating costs (incl. backup)
  reinvest: { label: 'Reinvest', color: '#60a5fa' }, // blues  — mid-life replacements
}

// CAPEX: shades of green (group identity).
// OPEX: distinct warm hues — amber (solar O&M), orange (battery O&M), red
//   (backup power, matching the shortfall-hotspot bands). Hue separation
//   within the warm family makes the three rows readable at a glance even
//   when stacked together; group identity still reads as "warm".
// REINVEST: distinct cool hues — blue (inverter), violet (battery aug).
const ITEMS = [
  { key: 'solarCapex',          label: 'Solar CAPEX',          group: 'capex',    color: '#10b981' }, // emerald-500
  { key: 'batteryCapex',        label: 'Battery CAPEX',        group: 'capex',    color: '#34d399' }, // emerald-400
  { key: 'gridCapex',           label: 'Grid',                 group: 'capex',    color: '#6ee7b7' }, // emerald-300
  { key: 'invCapex',            label: 'Inverter',             group: 'capex',    color: '#059669' }, // emerald-600
  { key: 'solarOm',             label: 'Solar O&M',            group: 'opex',     color: '#fbbf24' }, // amber-400
  { key: 'batteryOm',           label: 'Battery O&M',          group: 'opex',     color: '#fb923c' }, // orange-400
  { key: 'backup',              label: 'Backup power',         group: 'opex',     color: '#f87171' }, // red-400
  { key: 'inverterReplacement', label: 'Inverter replacement', group: 'reinvest', color: '#60a5fa' }, // blue-400
  { key: 'batteryAug',          label: 'Battery augment.',     group: 'reinvest', color: '#a78bfa' }, // violet-400
]

function fmtUsd(v) {
  // $/MWh with 2–3 sig figs: integer for values ≥10, one decimal below that
  // so sub-dollar items don't round to $0.
  if (Math.abs(v) >= 10) return '$' + v.toFixed(0)
  return '$' + v.toFixed(1)
}

export default function CostBreakdownV2({ breakdown }) {
  // Sort rows descending by value so the biggest drivers appear on top —
  // matches how the eye scans and makes the "which costs dominate" story
  // read in the first second. Engine emits $/kWh; we display $/MWh.
  const { rows, total, groupTotals } = useMemo(() => {
    const rows = ITEMS
      .map(it => ({ ...it, value: (breakdown[it.key] ?? 0) * 1000 }))
      .filter(r => r.value > 0)
      .sort((a, b) => b.value - a.value)
    const total = rows.reduce((s, r) => s + r.value, 0)
    const groupTotals = rows.reduce((acc, r) => {
      acc[r.group] = (acc[r.group] ?? 0) + r.value
      return acc
    }, {})
    return { rows, total, groupTotals }
  }, [breakdown])

  const maxValue = rows[0]?.value ?? 1

  return (
    <div className="lcoe-breakdown">
      {/* Group legend — three pills showing aggregate $/MWh per bucket.
          Gives a quick answer to "how much of the LCOE is upfront vs.
          ongoing" before the user starts parsing individual rows. */}
      <div className="lcoe-legend">
        {Object.entries(GROUPS).map(([key, g]) => {
          const v = groupTotals[key] ?? 0
          const pct = total > 0 ? (v / total) * 100 : 0
          return (
            <div key={key} className="lcoe-legend-pill">
              <span className="lcoe-legend-dot" style={{ background: g.color }} />
              <span className="lcoe-legend-label">{g.label}</span>
              <span className="lcoe-legend-val">{fmtUsd(v)}</span>
              <span className="lcoe-legend-pct">{pct.toFixed(0)}%</span>
            </div>
          )
        })}
      </div>

      {/* Rows: label · bar · absolute · percent, in monospace so the
          numeric columns stack cleanly regardless of row length. */}
      <div className="lcoe-rows">
        {rows.map(r => {
          const pct = total > 0 ? (r.value / total) * 100 : 0
          const widthPct = (r.value / maxValue) * 100
          return (
            <div key={r.key} className="lcoe-row">
              <div className="lcoe-row-label" title={GROUPS[r.group].label}>
                <span className="lcoe-row-dot" style={{ background: r.color }} />
                {r.label}
              </div>
              <div className="lcoe-row-bar">
                <div
                  className="lcoe-row-bar-fill"
                  style={{ width: `${widthPct}%`, background: r.color }}
                />
              </div>
              <div className="lcoe-row-val">{fmtUsd(r.value)}/MWh</div>
              <div className="lcoe-row-pct">({pct.toFixed(0)}%)</div>
            </div>
          )
        })}
      </div>

      {/* Total — visually distinct, right-aligned in the same numeric
          columns so it reads as a sum of the stack above. */}
      <div className="lcoe-total">
        <div className="lcoe-total-label">Total LCOE</div>
        <div className="lcoe-total-val">{fmtUsd(total)}/MWh</div>
      </div>

      <style>{`
        .lcoe-breakdown {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-family: "DM Sans", sans-serif;
          height: 100%;
        }
        .lcoe-legend {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .lcoe-legend-pill {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          padding: 4px 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 6px;
          font-size: 11px;
        }
        .lcoe-legend-dot {
          display: inline-block;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          align-self: center;
        }
        .lcoe-legend-label {
          color: #cbd5e1;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          font-size: 10px;
        }
        .lcoe-legend-val {
          color: #e2e8f0;
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          font-weight: 600;
        }
        .lcoe-legend-pct {
          color: #64748b;
          font-family: "JetBrains Mono", monospace;
          font-size: 10px;
        }

        .lcoe-rows {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .lcoe-row {
          display: grid;
          grid-template-columns: minmax(130px, 160px) 1fr max-content 44px;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: #cbd5e1;
        }
        .lcoe-row-label {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .lcoe-row-dot {
          flex-shrink: 0;
          width: 8px;
          height: 8px;
          border-radius: 2px;
        }
        .lcoe-row-bar {
          height: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
          overflow: hidden;
        }
        .lcoe-row-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 300ms ease;
        }
        .lcoe-row-val {
          font-family: "JetBrains Mono", monospace;
          font-size: 12px;
          color: #e2e8f0;
          text-align: right;
          white-space: nowrap;
        }
        .lcoe-row-pct {
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          color: #64748b;
          text-align: right;
        }

        .lcoe-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.08);
          /* Anchor Total to the bottom so it visually aligns with the
             Total CAPEX row on the sibling thermometer card, and any
             spare vertical space goes above (not below) the total. */
          margin-top: auto;
        }
        .lcoe-total-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .lcoe-total-val {
          font-family: "Space Grotesk", sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #7dd3fc;
        }

        @media (max-width: 520px) {
          .lcoe-row {
            grid-template-columns: 1fr max-content 40px;
            row-gap: 2px;
          }
          /* On narrow screens the bar slides below the label so there's
             room for it to actually show something. */
          .lcoe-row-bar {
            grid-column: 1 / -1;
            order: 3;
          }
          .lcoe-row-label { order: 1; }
          .lcoe-row-val   { order: 2; }
          .lcoe-row-pct   { order: 2; }
        }
      `}</style>
    </div>
  )
}
