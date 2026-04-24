import React from 'react'
import ComparisonIndicator from '../ComparisonIndicator.jsx'

export default function LcoeHeadline({
  systemLcoe, blendedLcoe, solarMW, batteryMWh, firmMW,
  benchmarkLcoe, benchmarkSource,
  firmnessRequested, firmnessAchieved,
  firmnessByYear, startYear,
}) {
  // Engine reports $/MWh — display directly, no unit conversion.
  const short = firmnessRequested != null && firmnessAchieved != null
    && (firmnessRequested - firmnessAchieved) > 0.5

  // Per-year extremes for the best/worst callout
  let best = null, worst = null
  if (firmnessByYear && firmnessByYear.length > 0 && startYear != null) {
    let bestIdx = 0, worstIdx = 0
    for (let i = 1; i < firmnessByYear.length; i++) {
      if (firmnessByYear[i] > firmnessByYear[bestIdx]) bestIdx = i
      if (firmnessByYear[i] < firmnessByYear[worstIdx]) worstIdx = i
    }
    best = { year: startYear + bestIdx, pct: firmnessByYear[bestIdx] * 100 }
    worst = { year: startYear + worstIdx, pct: firmnessByYear[worstIdx] * 100 }
  }

  // Combined scenario health → shared border color across all three boxes.
  // Firmness met + LCOE ≤ benchmark → green.
  // Either slightly off (firmness short, or LCOE within 20% above benchmark) → amber.
  // LCOE ≥ 1.2× benchmark → red (overrides everything else).
  // We pick the worst signal so the reader sees the most urgent problem first.
  let status = 'ok' // 'ok' | 'warn' | 'bad'
  if (benchmarkLcoe != null) {
    const ratio = blendedLcoe / benchmarkLcoe
    if (ratio >= 1.2) status = 'bad'
    else if (ratio > 1 || short) status = 'warn'
  } else if (short) {
    status = 'warn'
  }

  return (
    <div className={`headline-frame status-${status}`}>
    <div className="headline-row">
      {/* Box 1: Firmness — the gate. Can the system hit its target? */}
      <div className={`hr-box firmness ${short ? 'short' : 'met'}`}>
        <div className="hr-label">Firmness</div>
        <div className="fg-row">
          <span>Target</span>
          <span className="fg-value">{firmnessRequested != null ? `${firmnessRequested.toFixed(0)}%` : '—'}</span>
        </div>
        <div className="fg-row">
          <span>Achieved</span>
          <span className="fg-value">{firmnessAchieved != null ? `${firmnessAchieved.toFixed(2)}%` : '—'}</span>
        </div>
        {short ? (
          <div className="fg-warning">
            Best feasible within solver bounds; consider a lower target or a sunnier site.
          </div>
        ) : (
          <div className="fg-success">
            System design successfully meets or exceeds the target firmness threshold.
          </div>
        )}
        {best && worst && (
          <div className="fg-extremes">
            <div className="fg-extreme-box best">
              <div className="fg-extreme-label">↑ Best year</div>
              <div className="fg-extreme-value best">{best.pct.toFixed(2)}%</div>
            </div>
            <div className="fg-extreme-box worst">
              <div className="fg-extreme-label">↓ Worst year</div>
              <div className="fg-extreme-value worst">{worst.pct.toFixed(2)}%</div>
            </div>
          </div>
        )}
      </div>

      {/* Box 2: Sizing — what it takes to meet the firmness target. */}
      <div className="hr-box">
        <div className="hr-label">System Sizing</div>
        <div className="hr-sizing-line">
          <span className="hr-sizing-value">{solarMW.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          <span className="hr-sizing-unit">MW solar</span>
        </div>
        <div className="hr-sizing-sub">{(solarMW / firmMW).toFixed(2)}× firm capacity</div>
        <div className="hr-sizing-line" style={{ marginTop: 6 }}>
          <span className="hr-sizing-value">{batteryMWh.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
          <span className="hr-sizing-unit">MWh battery</span>
        </div>
        <div className="hr-sizing-sub">{(batteryMWh / firmMW).toFixed(1)}h storage @ {firmMW} MW</div>
      </div>

      {/* Box 3: Blended LCOE — the price of the answer. */}
      <div className="hr-box">
        <div className="hr-label">Blended LCOE</div>
        <div className="hr-lcoe-row">
          <div className="hr-kwh">
            ${blendedLcoe.toFixed(0)}<span className="hr-kwh-unit">/MWh</span>
          </div>
          <span className="hr-kwh-sep">·</span>
          <div className="hr-kwh-secondary">
            ${(blendedLcoe / 1000).toFixed(3)}<span className="hr-kwh-secondary-unit">/kWh</span>
          </div>
        </div>
        <div className="hr-sub">RE-system-only: ${systemLcoe.toFixed(0)}/MWh</div>
        {benchmarkLcoe != null && benchmarkSource && (
          <ComparisonIndicator
            lcoeMWh={blendedLcoe}
            benchmarkLcoe={benchmarkLcoe}
            benchmarkSource={benchmarkSource}
          />
        )}
      </div>

      <style>{`
        /* Outer frame — one thick, status-colored border wrapping all
           three boxes. Color driven by CSS vars so a single status flip
           restyles the whole frame at once. Glow sits outside the border
           so the panel reads as a single "Key Results" unit against the
           dark background. */
        .headline-frame {
          border: 2px solid var(--hr-border);
          border-radius: 10px;
          padding: 10px;
          box-shadow: 0 0 20px var(--hr-glow);

          --hr-border: rgba(16, 185, 129, 0.60);
          --hr-glow:   rgba(16, 185, 129, 0.20);
        }
        .headline-frame.status-warn {
          --hr-border: rgba(234, 179, 8, 0.70);
          --hr-glow:   rgba(234, 179, 8, 0.20);
        }
        .headline-frame.status-bad {
          --hr-border: rgba(239, 68, 68, 0.75);
          --hr-glow:   rgba(239, 68, 68, 0.22);
        }

        .headline-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        /* Inner boxes keep their original subtle 1px separation so the
           three outputs read as distinct tiles inside the status frame. */
        .hr-box {
          padding: 12px 14px;
          border-radius: 6px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        /* Box title — bigger, bolder, Space Grotesk. The "Key Results" job
           gets done by these three crisp eyebrows + the shared border
           color, rather than an outer frame. */
        .hr-label {
          font-family: "Space Grotesk", sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #e2e8f0;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .hr-lcoe-row { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
        .hr-kwh {
          font-family: "Space Grotesk", sans-serif;
          font-size: 2.4rem;
          font-weight: 700;
          color: #7dd3fc;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .hr-kwh-unit { font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-left: 4px; font-weight: 400; letter-spacing: 0; }
        .hr-kwh-sep {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.2);
          font-weight: 300;
          line-height: 1;
          align-self: baseline;
        }
        .hr-kwh-secondary {
          font-family: "JetBrains Mono", monospace;
          font-size: 0.95rem;
          font-weight: 500;
          color: rgba(125,211,252,0.55);
          line-height: 1;
        }
        .hr-kwh-secondary-unit { font-size: 0.78rem; color: rgba(255,255,255,0.35); margin-left: 2px; font-weight: 400; }
        .hr-sub { font-size: 14px; color: rgba(255,255,255,0.75); margin-top: 10px; margin-bottom: 4px; }
        .hr-sizing-line { display: flex; align-items: baseline; gap: 6px; }
        .hr-sizing-value { font-family: "JetBrains Mono", monospace; font-size: 1.4rem; font-weight: 600; color: #e2e8f0; }
        .hr-sizing-unit { font-size: 12px; color: #94a3b8; }
        .hr-sizing-sub { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 1px; }

        /* Firmness box: preserve the per-figure color cue so the value
           itself reads as met/short even without looking at the border. */
        .fg-row { display: flex; justify-content: space-between; font-size: 13px; margin-top: 2px; }
        .fg-value { font-weight: 600; }
        .hr-box.firmness.met .fg-value { color: #4ade80; }
        .hr-box.firmness.short .fg-value { color: #eab308; }
        .fg-warning { margin-top: 6px; font-size: 11px; color: #fde68a; line-height: 1.35; }
        .fg-success { margin-top: 6px; font-size: 11px; color: #94a3b8; line-height: 1.35; }
        .fg-extremes {
          margin-top: 8px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .fg-extreme-box {
          padding: 4px 6px;
          border-radius: 4px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          text-align: center;
        }
        .fg-extreme-label { font-size: 10px; color: #94a3b8; }
        .fg-extreme-value { font-size: 12px; font-weight: 600; font-family: "JetBrains Mono", monospace; }
        .fg-extreme-value.best { color: #4ade80; }
        .fg-extreme-value.worst { color: #f87171; }
        @media (max-width: 900px) {
          .headline-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
    </div>
  )
}
