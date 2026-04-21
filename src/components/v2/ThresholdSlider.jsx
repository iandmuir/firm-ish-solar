import React from 'react'
import { V2_DEFAULTS } from '../../engine/constants-v2.js'

const POINTS = V2_DEFAULTS.thresholdSweepPoints  // [70, 80, 85, 90, 93, 95, 97, 99]

const TOOLTIP = 'Fraction of hours across all years of weather data where solar + battery must meet the firm capacity target. Drives how much storage (and oversized PV) the solver builds.'

function InfoIcon({ tooltip }) {
  return (
    <span className="tooltip-container ml-1 inline-flex">
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '1px solid #94a3b8',
          color: '#94a3b8',
          fontSize: 9,
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 600,
          cursor: 'default',
          flexShrink: 0,
        }}
      >
        ?
      </span>
      <span className="tooltip-text">{tooltip}</span>
    </span>
  )
}

/**
 * Snap-to-point slider. `value` must be one of POINTS; `onChange(pct)` fires
 * with the selected point. Uses an integer index internally so the browser's
 * range input handles equal-width steps regardless of the non-uniform data.
 */
export default function ThresholdSlider({ value, onChange }) {
  const idx = Math.max(0, POINTS.indexOf(value))
  return (
    <div className="threshold-slider" style={{ marginBottom: 12 }}>
      <div className="threshold-row">
        <label style={{
          fontSize: 12,
          color: '#94a3b8',
          fontFamily: '"DM Sans", sans-serif',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}>
          Firmness Threshold
          <InfoIcon tooltip={TOOLTIP} />
        </label>
        <span className="threshold-value">{POINTS[idx]}%</span>
      </div>
      <input
        type="range"
        min={0} max={POINTS.length - 1} step={1}
        value={idx}
        onChange={e => onChange(POINTS[parseInt(e.target.value, 10)])}
      />
      <div className="threshold-ticks">
        {POINTS.map(p => <span key={p}>{p}</span>)}
      </div>
      <style>{`
        .threshold-slider { display: flex; flex-direction: column; gap: 4px; }
        .threshold-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .threshold-value {
          font-family: "JetBrains Mono", monospace;
          font-size: 13px;
          font-weight: 600;
          color: #7dd3fc;
        }
        .threshold-ticks {
          display: flex; justify-content: space-between;
          font-size: 0.7rem; color: rgba(255,255,255,0.5);
        }
      `}</style>
    </div>
  )
}
