import React from 'react'
import { V2_DEFAULTS } from '../../engine/constants-v2.js'

const POINTS = V2_DEFAULTS.thresholdSweepPoints  // [70, 80, 85, 90, 93, 95, 97, 99]

/**
 * Snap-to-point slider. `value` must be one of POINTS; `onChange(pct)` fires
 * with the selected point. Uses an integer index internally so the browser's
 * range input handles equal-width steps regardless of the non-uniform data.
 */
export default function ThresholdSlider({ value, onChange }) {
  const idx = Math.max(0, POINTS.indexOf(value))
  return (
    <div className="threshold-slider">
      <div className="threshold-row">
        <label>Firmness threshold</label>
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
        .threshold-slider { display: flex; flex-direction: column; gap: 6px; }
        .threshold-row { display: flex; justify-content: space-between; align-items: baseline; }
        .threshold-value { font-weight: 600; color: #7dd3fc; }
        .threshold-ticks {
          display: flex; justify-content: space-between;
          font-size: 0.7rem; color: rgba(255,255,255,0.5);
        }
      `}</style>
    </div>
  )
}
