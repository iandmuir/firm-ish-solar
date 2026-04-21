import React from 'react'
import ComparisonIndicator from '../ComparisonIndicator.jsx'

export default function LcoeHeadline({
  systemLcoe, blendedLcoe, solarMW, batteryMWh, firmMW,
  benchmarkLcoe, benchmarkSource,
  firmnessRequested, firmnessAchieved,
  firmnessByYear, startYear,
}) {
  const blendedKwh = blendedLcoe / 1000 // engine reports $/MWh; indicator wants $/kWh
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

  return (
    <div className="headline-row">
      {/* Box 1: LCOE */}
      <div className="hr-box">
        <div className="hr-label">Blended LCOE</div>
        <div className="hr-lcoe-row">
          <div className="hr-kwh">
            ${blendedKwh.toFixed(3)}<span className="hr-kwh-unit">/kWh</span>
          </div>
        </div>
        <div className="hr-sub">RE-system-only: ${(systemLcoe / 1000).toFixed(3)}/kWh</div>
        {benchmarkLcoe != null && benchmarkSource && (
          <ComparisonIndicator
            lcoeKwh={blendedKwh}
            benchmarkLcoe={benchmarkLcoe}
            benchmarkSource={benchmarkSource}
          />
        )}
      </div>

      {/* Box 2: Sizing */}
      <div className="hr-box">
        <div className="hr-label">System sizing</div>
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

      {/* Box 3: Firmness */}
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

      <style>{`
        .headline-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }
        .hr-box {
          padding: 12px 14px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .hr-label { font-size: 11px; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
        .hr-lcoe-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .hr-kwh {
          font-family: "Space Grotesk", sans-serif;
          font-size: 2.4rem;
          font-weight: 700;
          color: #7dd3fc;
          letter-spacing: -0.03em;
          line-height: 1;
        }
        .hr-kwh-unit { font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-left: 4px; font-weight: 400; letter-spacing: 0; }
        .hr-mwh-pill {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          padding: 4px 10px;
        }
        .hr-mwh-value { font-family: "JetBrains Mono", monospace; font-size: 1rem; color: #7dd3fc; font-weight: 500; }
        .hr-mwh-unit { font-size: 11px; color: #94a3b8; margin-left: 3px; }
        .hr-sub { font-size: 12px; color: rgba(255,255,255,0.65); margin-top: 6px; }
        .hr-sizing-line { display: flex; align-items: baseline; gap: 6px; }
        .hr-sizing-value { font-family: "JetBrains Mono", monospace; font-size: 1.4rem; font-weight: 600; color: #e2e8f0; }
        .hr-sizing-unit { font-size: 12px; color: #94a3b8; }
        .hr-sizing-sub { font-size: 11px; color: rgba(255,255,255,0.55); margin-top: 1px; }
        .hr-box.firmness.short { border-color: #eab308; }
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
  )
}
