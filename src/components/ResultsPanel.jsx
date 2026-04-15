import React from 'react'
import ComparisonIndicator from './ComparisonIndicator.jsx'
import SystemSummary from './SystemSummary.jsx'
import CostBreakdownChart from './CostBreakdownChart.jsx'
import MonthlyProfileChart from './MonthlyProfileChart.jsx'
import AugmentationTimeline from './AugmentationTimeline.jsx'
import ForwardProjectionChart from './ForwardProjectionChart.jsx'
import solarData from '../data/solar-data.json'

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '22px 0' }} />
}

export default function ResultsPanel({ results, inputs }) {
  if (!results) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155' }}>
      Calculating…
    </div>
  )

  const { lcoeKwh, lcoeMWh } = results
  const countryData = solarData[inputs.country]

  // Color coding
  const ratio = lcoeKwh / inputs.benchmarkLcoe
  const lcoeColor = ratio <= 1 ? '#10b981' : ratio <= 1.2 ? '#f59e0b' : '#ef4444'

  return (
    <div style={{
      overflowY: 'auto',
      height: '100%',
      padding: '20px 24px 40px',
    }}>
      {/* Headline LCOE */}
      <div>
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: '"Space Grotesk", sans-serif' }}>
          Levelized Cost of Energy
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <span style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 52,
              fontWeight: 700,
              color: lcoeColor,
              letterSpacing: '-0.04em',
              lineHeight: 1,
            }}>
              ${lcoeKwh.toFixed(3)}
            </span>
            <span style={{ fontSize: 18, color: '#475569', marginLeft: 4 }}>/kWh</span>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '6px 14px',
          }}>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 20,
              color: lcoeColor,
              fontWeight: 500,
            }}>
              ${lcoeMWh.toFixed(1)}
            </span>
            <span style={{ fontSize: 13, color: '#475569', marginLeft: 4 }}>/MWh</span>
          </div>
        </div>
        <ComparisonIndicator
          lcoeKwh={lcoeKwh}
          benchmarkLcoe={inputs.benchmarkLcoe}
          benchmarkSource={inputs.benchmarkSource}
        />
      </div>

      <Divider />

      <SystemSummary results={results} firmCapacityMW={inputs.firmCapacityMW} />

      <Divider />

      <CostBreakdownChart
        costBreakdown={results.costBreakdown}
        benchmarkLcoe={inputs.benchmarkLcoe}
        benchmarkSource={inputs.benchmarkSource}
      />

      <Divider />

      <MonthlyProfileChart
        countryData={countryData}
        worstMonthIdx={results.worstMonthIdx}
      />

      <Divider />

      <AugmentationTimeline
        solarRepowerEvents={results.solarRepowerEvents}
        batteryAugEvents={results.batteryAugEvents}
        solarSkipped={results.solarSkipped}
        batterySkipped={results.batterySkipped}
        projectLifetime={inputs.projectLifetime}
      />

      <Divider />

      <ForwardProjectionChart
        projectionData={results.projectionData}
        benchmarkLcoe={inputs.benchmarkLcoe}
        benchmarkSource={inputs.benchmarkSource}
        parityYear={results.parityYear}
      />
    </div>
  )
}
