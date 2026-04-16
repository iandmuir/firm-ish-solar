import React from 'react'

function Metric({ label, value, sub }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8,
      padding: '10px 14px',
    }}>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, fontFamily: '"DM Sans", sans-serif' }}>
        {label}
      </div>
      <div style={{
        fontSize: 18,
        fontWeight: 600,
        fontFamily: '"Space Grotesk", sans-serif',
        color: '#e2e8f0',
        letterSpacing: '-0.02em',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}

function fmt(n, decimals = 1) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })
}

function fmtM(n) {
  return '$' + (n / 1e6).toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + 'M'
}

export default function SystemSummary({ results, firmCapacityMW }) {
  if (!results) return null
  const { requiredSolarMW, requiredBatteryMWh, solarOverBuildRatio, batteryHoursStorage, solarCapex, batteryCapex, totalInitialCapex } = results

  return (
    <div>
      <h3 style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 13,
        fontWeight: 600,
        color: '#cbd5e1',
        margin: '0 0 10px',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        System Sizing
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Metric
          label="Solar Array"
          value={`${fmt(requiredSolarMW)} MW`}
          sub={`${fmt(solarOverBuildRatio, 2)}× firm capacity target`}
        />
        <Metric
          label="Battery Storage"
          value={`${fmt(requiredBatteryMWh)} MWh`}
          sub={`${fmt(batteryHoursStorage, 1)}h storage`}
        />
      </div>
      <div style={{
        marginTop: 8,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: '10px 14px',
      }}>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>Initial CAPEX Breakdown</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#10b981', marginBottom: 2 }}>Solar</div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#e2e8f0' }}>
                {fmtM(solarCapex)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#60a5fa', marginBottom: 2 }}>Battery</div>
              <div style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14, color: '#e2e8f0' }}>
                {fmtM(batteryCapex)}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#cbd5e1', marginBottom: 2 }}>Total</div>
            <div style={{ fontFamily: '"Space Grotesk", sans-serif', fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>
              {fmtM(totalInitialCapex)}
            </div>
          </div>
        </div>
        {/* CAPEX bar */}
        <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: '#162d58', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(solarCapex / totalInitialCapex) * 100}%`,
            background: '#10b981',
            borderRadius: 2,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>Solar {((solarCapex / totalInitialCapex) * 100).toFixed(0)}%</span>
          <span style={{ fontSize: 10, color: '#94a3b8' }}>Battery {((batteryCapex / totalInitialCapex) * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
}
