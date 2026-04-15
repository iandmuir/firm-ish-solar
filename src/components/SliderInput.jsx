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
          border: '1px solid #475569',
          color: '#475569',
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

  const handleSlider = useCallback((e) => {
    const v = parseFloat(e.target.value)
    onChange(v)
    setInputText(null)
  }, [onChange])

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

  const pct = ((displayVal - min) / (max - min)) * 100

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
            value={inputText !== null ? inputText : displayVal}
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
            <span style={{ fontSize: 11, color: '#475569', minWidth: 40 }}>{unit}</span>
          )}
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={displayVal}
          onChange={handleSlider}
          style={{
            width: '100%',
            background: `linear-gradient(to right, #10b981 ${pct}%, #162d58 ${pct}%)`,
          }}
        />
      </div>
    </div>
  )
}
