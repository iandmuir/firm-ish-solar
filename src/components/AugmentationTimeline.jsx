import React from 'react'

function fmtM(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M'
  return '$' + (n / 1e3).toFixed(0) + 'K'
}

export default function AugmentationTimeline({ solarRepowerEvents, batteryAugEvents, solarSkipped, batterySkipped, projectLifetime }) {
  if (!solarRepowerEvents) return null

  const allYears = projectLifetime
  const pct = y => (y / allYears) * 100

  return (
    <div>
      <h3 style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 13,
        fontWeight: 600,
        color: '#cbd5e1',
        margin: '0 0 12px',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        Repowering & Augmentation Schedule
      </h3>

      {/* Solar row */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: '#10b981', marginBottom: 6, fontWeight: 500 }}>Solar Array — Repowering Events</div>
        <div style={{ position: 'relative', height: 36 }}>
          {/* Track */}
          <div style={{
            position: 'absolute',
            top: 14,
            left: 0,
            right: 0,
            height: 3,
            background: '#0f2040',
            borderRadius: 2,
          }}>
            {/* Filled lifetime */}
            <div style={{ width: '100%', height: '100%', background: 'rgba(16,185,129,0.2)', borderRadius: 2 }} />
          </div>

          {/* Year 0 dot */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 10,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#10b981',
            border: '2px solid #060d1a',
          }} />

          {/* End dot */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: 10,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#475569',
            border: '2px solid #060d1a',
          }} />

          {/* Repowering events */}
          {solarRepowerEvents.map(evt => (
            <div key={evt.year} style={{
              position: 'absolute',
              left: `${pct(evt.year)}%`,
              top: 0,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{
                fontSize: 9,
                color: '#10b981',
                fontFamily: '"JetBrains Mono", monospace',
                marginBottom: 2,
                whiteSpace: 'nowrap',
              }}>
                {fmtM(evt.capex)}
              </div>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #060d1a',
                marginTop: 9,
              }} />
            </div>
          ))}

          {/* Skipped events */}
          {solarSkipped.map(yr => (
            <div key={yr} style={{
              position: 'absolute',
              left: `${pct(yr)}%`,
              top: 9,
              transform: 'translateX(-50%)',
            }}>
              <div style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                border: '1.5px dashed #334155',
                background: 'transparent',
              }} />
            </div>
          ))}
        </div>
        {/* Year labels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 9, color: '#334155', fontFamily: '"JetBrains Mono"' }}>Y0</span>
          <span style={{ fontSize: 9, color: '#334155', fontFamily: '"JetBrains Mono"' }}>Y{projectLifetime}</span>
        </div>
      </div>

      {/* Battery row */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: '#3b82f6', marginBottom: 6, fontWeight: 500 }}>Battery Storage – Augmentation Events</div>
        <div style={{ position: 'relative', height: 36 }}>
          <div style={{
            position: 'absolute',
            top: 14,
            left: 0,
            right: 0,
            height: 3,
            background: 'rgba(59,130,246,0.2)',
            borderRadius: 2,
          }} />
          <div style={{
            position: 'absolute',
            left: 0,
            top: 10,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#3b82f6',
            border: '2px solid #060d1a',
          }} />
          <div style={{
            position: 'absolute',
            right: 0,
            top: 10,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#475569',
            border: '2px solid #060d1a',
          }} />
          {batteryAugEvents.map(evt => (
            <div key={evt.year} style={{
              position: 'absolute',
              left: `${pct(evt.year)}%`,
              top: 0,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <div style={{
                fontSize: 9,
                color: '#3b82f6',
                fontFamily: '"JetBrains Mono", monospace',
                marginBottom: 2,
                whiteSpace: 'nowrap',
              }}>
                {fmtM(evt.capex)}
              </div>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#3b82f6',
                border: '2px solid #060d1a',
                marginTop: 9,
              }} />
            </div>
          ))}
          {batterySkipped.map(yr => (
            <div key={yr} style={{
              position: 'absolute',
              left: `${pct(yr)}%`,
              top: 9,
              transform: 'translateX(-50%)',
            }}>
              <div style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                border: '1.5px dashed #334155',
                background: 'transparent',
              }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
          <span style={{ fontSize: 9, color: '#334155', fontFamily: '"JetBrains Mono"' }}>Y0</span>
          <span style={{ fontSize: 9, color: '#334155', fontFamily: '"JetBrains Mono"' }}>Y{projectLifetime}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          <span style={{ fontSize: 10, color: '#475569' }}>Repowering / augmentation event</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px dashed #334155' }} />
          <span style={{ fontSize: 10, color: '#475569' }}>Skipped (within 3yr of end)</span>
        </div>
      </div>
    </div>
  )
}
