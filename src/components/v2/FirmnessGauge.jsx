import React from 'react'

/**
 * Renders firmness target vs achieved. When achieved falls short of requested,
 * flags the gap so the user understands the engine is reporting a fallback.
 */
export default function FirmnessGauge({ requested, achieved }) {
  const gap = requested - achieved
  const short = gap > 0.5  // tolerance for rounding
  return (
    <div className={`firmness-gauge ${short ? 'short' : 'met'}`}>
      <div className="fg-row">
        <span className="fg-label">Firmness target</span>
        <span className="fg-value">{requested.toFixed(0)}%</span>
      </div>
      <div className="fg-row">
        <span className="fg-label">Achieved</span>
        <span className="fg-value">{achieved.toFixed(2)}%</span>
      </div>
      {short && (
        <div className="fg-warning">
          Best feasible within solver bounds; consider lower target, larger firm capacity,
          or a sunnier site.
        </div>
      )}
      <style>{`
        .firmness-gauge {
          padding: 12px;
          border-radius: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .firmness-gauge.short { border-color: #eab308; }
        .fg-row { display: flex; justify-content: space-between; }
        .fg-value { font-weight: 600; }
        .firmness-gauge.met .fg-value { color: #4ade80; }
        .firmness-gauge.short .fg-value { color: #eab308; }
        .fg-warning {
          margin-top: 8px; font-size: 0.8rem; color: #fde68a;
        }
      `}</style>
    </div>
  )
}
