import React, { useState, useCallback } from 'react'

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

export default function SliderInput({
  label,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  tooltip,
  formatValue,
}) {
  const fmt = formatValue || ((v) => v)
  const displayVal = typeof value === 'number' ? value : parseFloat(value)

  const [inputText, setInputText] = useState(null)
  // Local "while dragging" value — commit to parent only on release so
  // expensive recalcs don't fire on every pixel of movement.
  const [dragValue, setDragValue] = useState(null)

  const handleSliderInput = useCallback((e) => {
    setDragValue(parseFloat(e.target.value))
  }, [])

  const commitSlider = useCallback(() => {
    if (dragValue === null) return
    onChange(dragValue)
    setDragValue(null)
    setInputText(null)
  }, [dragValue, onChange])

  const handleNumberInput = useCallback((e) => {
    setInputText(e.target.value)
  }, [])

  const handleNumberBlur = useCallback(() => {
    if (inputText === null) return
    const v = parseFloat(inputText)
    if (!isNaN(v)) {
      const clamped = Math.min(max, Math.max(min, v))
      onChange(clamped)
    }
    setInputText(null)
  }, [inputText, min, max, onChange])

  const handleNumberKeyDown = useCallback((e) => {
    if (e.key === 'Enter') e.target.blur()
  }, [])

  const sliderVal = dragValue !== null ? dragValue : displayVal
  const pct = ((sliderVal - min) / (max - min)) * 100

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <label style={{
          fontSize: 12,
          color: '#94a3b8',
          fontFamily: '"DM Sans", sans-serif',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}>
          {label}
          {tooltip && <InfoIcon tooltip={tooltip} />}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            value={inputText !== null ? inputText : sliderVal}
            onChange={handleNumberInput}
            onBlur={handleNumberBlur}
            onKeyDown={handleNumberKeyDown}
            min={min}
            max={max}
            step={step}
            style={{
              width: 60,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              color: '#e2e8f0',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 12,
              padding: '2px 6px',
              textAlign: 'right',
            }}
          />
          {unit && (
            <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 40 }}>{unit}</span>
          )}
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderVal}
          onChange={handleSliderInput}
          onMouseUp={commitSlider}
          onTouchEnd={commitSlider}
          onKeyUp={commitSlider}
          onBlur={commitSlider}
          style={{
            width: '100%',
            background: `linear-gradient(to right, #10b981 ${pct}%, #162d58 ${pct}%)`,
          }}
        />
      </div>
    </div>
  )
}
