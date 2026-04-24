import React, { useLayoutEffect, useMemo, useRef, useState } from 'react'

function fmtM(n) {
  return '$' + (n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + 'M'
}

// Order matters: segments stack top-down in this order.
const PARTS = [
  { key: 'solar',    label: 'Solar',    color: '#10b981' },
  { key: 'battery',  label: 'Battery',  color: '#60a5fa' },
  { key: 'grid',     label: 'Grid',     color: '#fbbf24' },
  { key: 'inverter', label: 'Inverter', color: '#a78bfa' },
]

// Minimum vertical space each label needs (component name + $ amount stacked).
const LABEL_H = 34
// Below this % share, consecutive tiny segments get their percentages
// merged into a single right-rail label (avoids stacked overlap).
const TINY_PCT = 2
// Gap in px between the right edge of a label's text and where its leader
// line begins — keeps the diagonal from kissing the letterforms.
const LEADER_GAP = 6

/**
 * Vertical thermometer showing initial CAPEX composition.
 *
 * - Segments are strictly proportional to dollar value (no min-height).
 * - Labels span the full height of the bar, evenly spaced, so the left
 *   rail doesn't look top-heavy. Each has a diagonal leader line from the
 *   right edge of its actual text content to the segment's vertical center.
 * - Tiny (<2%) consecutive segments share a single combined percentage
 *   label on the right.
 * - The bar fills whatever height its container provides (via flex:1 +
 *   ResizeObserver), so the card stretches to match a taller neighbor
 *   without leaving empty space. The Total CAPEX row is pinned to the
 *   card bottom so it aligns with the Total LCOE on the adjacent card.
 */
export default function InitialCapexBreakdown({ initialCapex }) {
  const barRef = useRef(null)
  const railRef = useRef(null)
  const labelRefs = useRef([])
  const [H, setH] = useState(240)
  const [railW, setRailW] = useState(120)
  const [labelWidths, setLabelWidths] = useState(() => PARTS.map(() => 0))

  // Measure bar height, rail width, and per-label text widths. All three
  // feed the leader-line geometry: height sets the segment scale, rail
  // width is the leader's horizontal span, label widths determine where
  // each leader starts so it attaches to the text rather than floating
  // out in empty space.
  useLayoutEffect(() => {
    const targets = []
    const update = () => {
      if (barRef.current) {
        const h = Math.round(barRef.current.getBoundingClientRect().height)
        if (h > 0) setH(prev => (prev === h ? prev : h))
      }
      if (railRef.current) {
        const w = Math.round(railRef.current.getBoundingClientRect().width)
        if (w > 0) setRailW(prev => (prev === w ? prev : w))
      }
      const widths = labelRefs.current.map(el =>
        el ? Math.round(el.getBoundingClientRect().width) : 0
      )
      setLabelWidths(prev =>
        widths.length === prev.length && widths.every((v, i) => v === prev[i]) ? prev : widths
      )
    }
    update()
    const ro = new ResizeObserver(update)
    if (barRef.current) { ro.observe(barRef.current); targets.push(barRef.current) }
    if (railRef.current) { ro.observe(railRef.current); targets.push(railRef.current) }
    labelRefs.current.forEach(el => { if (el) { ro.observe(el); targets.push(el) } })
    return () => ro.disconnect()
  }, [])

  const { segments, rightGroups, total } = useMemo(() => {
    if (!initialCapex) return { segments: [], rightGroups: [], total: 0 }
    const total = initialCapex.total

    // y0/y1/yc in px within the H-tall bar.
    let cum = 0
    const segs = PARTS.map(p => {
      const value = initialCapex[p.key] ?? 0
      const pct = total > 0 ? (value / total) * 100 : 0
      const y0 = (cum / total) * H
      cum += value
      const y1 = (cum / total) * H
      const yc = (y0 + y1) / 2
      return { ...p, value, pct, y0, y1, yc }
    })

    // Spread labels across the full rail height so the first label sits
    // at the top edge and the last sits at the bottom edge — no cluster.
    const n = segs.length
    const totalLabelH = n * LABEL_H
    const canSpread = H >= totalLabelH && n > 1
    const gap = canSpread ? (H - totalLabelH) / (n - 1) : 0
    segs.forEach((s, i) => {
      // Fallback when the rail is short: stack tight at the top so labels
      // remain readable rather than getting clipped.
      s.labelTop = canSpread ? i * (LABEL_H + gap) : i * LABEL_H
      s.labelCenter = s.labelTop + LABEL_H / 2
    })

    // Right side: merge consecutive tiny segments into one percent label.
    const groups = []
    for (const s of segs) {
      const last = groups[groups.length - 1]
      if (s.pct < TINY_PCT && last?.tiny) {
        last.pct += s.pct
        last.y1 = s.y1
        last.yc = (last.y0 + last.y1) / 2
        last.members.push(s)
      } else {
        groups.push({
          y0: s.y0, y1: s.y1, yc: s.yc, pct: s.pct,
          tiny: s.pct < TINY_PCT,
          members: [s],
        })
      }
    }
    return { segments: segs, rightGroups: groups, total }
  }, [initialCapex, H])

  if (!initialCapex) return null

  return (
    <div className="capex-therm">
      <div className="capex-therm-body">
        {/* LEFT rail: evenly-spaced labels + diagonal leader SVG overlay. */}
        <div className="capex-therm-labels" ref={railRef}>
          {segments.map((s, i) => (
            <div
              key={s.key}
              className="capex-therm-label"
              style={{ top: s.labelTop, height: LABEL_H }}
            >
              <div
                className="capex-therm-label-content"
                ref={el => { labelRefs.current[i] = el }}
              >
                <div className="capex-therm-label-name" style={{ color: s.color }}>{s.label}</div>
                <div className="capex-therm-label-val">{fmtM(s.value)}</div>
              </div>
            </div>
          ))}
          <svg
            className="capex-therm-leaders"
            viewBox={`0 0 ${railW} ${H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {segments.map((s, i) => {
              // Start leader at the right edge of the label's actual
              // rendered text (so it attaches to "Solar $600.0M" rather
              // than floating in whitespace). End at the bar's left edge.
              const x1 = (labelWidths[i] ?? 0) + LEADER_GAP
              return (
                <line
                  key={s.key}
                  x1={x1} y1={s.labelCenter}
                  x2={railW} y2={s.yc}
                  stroke={s.color}
                  strokeOpacity={0.6}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </svg>
        </div>

        {/* CENTER: bar. flex-basis:0 + flex-grow:value = strict proportionality. */}
        <div className="capex-therm-stack" ref={barRef}>
          {segments.map(s => (
            <div
              key={s.key}
              className="capex-therm-seg"
              style={{ flexGrow: s.value, background: s.color }}
              title={`${s.label} · ${fmtM(s.value)} (${s.pct.toFixed(1)}%)`}
            />
          ))}
        </div>

        {/* RIGHT rail: % labels, positioned at each segment's yc
            (or at the merged midpoint for combined tiny groups). */}
        <div className="capex-therm-percents">
          {rightGroups.map((g, i) => (
            <div
              key={i}
              className="capex-therm-pct"
              style={{ top: g.yc - 10 /* center 20px line on yc */ }}
              title={g.members.length > 1
                ? `Combined: ${g.members.map(m => m.label).join(' + ')}`
                : undefined}
            >
              {g.pct.toFixed(0)}%
            </div>
          ))}
        </div>
      </div>

      {/* Total — pinned to card bottom so it aligns with Total LCOE on
          the sibling card. */}
      <div className="capex-therm-total">
        <div className="capex-therm-total-label">Total CAPEX</div>
        <div className="capex-therm-total-val">{fmtM(total)}</div>
      </div>

      <style>{`
        .capex-therm {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-family: "DM Sans", sans-serif;
          height: 100%;
        }
        .capex-therm-body {
          display: grid;
          grid-template-columns: 1fr 22px 40px;
          gap: 0;
          flex: 1;
          /* Minimum that still fits the 4-label stack tightly; below this
             the card would start clipping labels, which we never want. */
          min-height: 140px;
        }

        /* LEFT rail: labels (positioned via inline top) + SVG leaders over. */
        .capex-therm-labels {
          position: relative;
          min-width: 0;
        }
        .capex-therm-label {
          position: absolute;
          left: 0;
          /* No explicit width — shrinks to content so labelWidth refs
             report the real text width for leader anchoring. */
          display: flex;
          align-items: center;
          z-index: 1;
          padding-right: 0;
        }
        .capex-therm-label-content {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .capex-therm-label-name {
          font-size: 12px;
          font-weight: 600;
          line-height: 1.2;
          white-space: nowrap;
        }
        .capex-therm-label-val {
          font-family: "JetBrains Mono", monospace;
          font-size: 11px;
          color: #e2e8f0;
          line-height: 1.2;
          white-space: nowrap;
        }
        .capex-therm-leaders {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 0;
        }

        /* CENTER: bar container + strictly-proportional segments. */
        .capex-therm-stack {
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 4px;
          overflow: hidden;
          background: rgba(255,255,255,0.02);
        }
        .capex-therm-seg {
          flex-basis: 0;
          /* min-height:0 is critical — without it, flex items refuse to
             shrink below their content size, breaking proportionality on
             sub-1% slices. */
          min-height: 0;
        }

        /* RIGHT rail: percent labels. */
        .capex-therm-percents {
          position: relative;
          margin-left: 8px;
          min-width: 0;
        }
        .capex-therm-pct {
          position: absolute;
          right: 0;
          height: 20px;
          line-height: 20px;
          font-family: "JetBrains Mono", monospace;
          font-size: 12px;
          font-weight: 600;
          color: #e2e8f0;
          white-space: nowrap;
        }

        .capex-therm-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.08);
          /* Anchor to card bottom — aligns with Total LCOE opposite. */
          margin-top: auto;
        }
        .capex-therm-total-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .capex-therm-total-val {
          font-family: "Space Grotesk", sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #7dd3fc;
        }
      `}</style>
    </div>
  )
}
