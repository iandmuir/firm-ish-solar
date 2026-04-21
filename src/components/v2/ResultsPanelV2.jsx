import React from 'react'
import FirmnessGauge from './FirmnessGauge.jsx'
import LcoeHeadline from './LcoeHeadline.jsx'
import CostBreakdownV2 from './CostBreakdownV2.jsx'
import ProjectionChartV2 from './ProjectionChartV2.jsx'

export default function ResultsPanelV2({ cityData, cityLoading, cityError, results, calculating, calcError, firmMW, threshold }) {
  if (!cityData && !cityLoading) {
    return <Placeholder>Pick a city to get started.</Placeholder>
  }
  if (cityLoading) {
    return <Placeholder>Loading city data…</Placeholder>
  }
  if (cityError) {
    return <Placeholder error>Couldn't load city: {String(cityError.message ?? cityError)}</Placeholder>
  }
  if (!results && !calculating) {
    return <Placeholder>Waiting for inputs…</Placeholder>
  }
  if (calculating && !results) {
    return <Placeholder>Calculating (~1s)…</Placeholder>
  }
  if (calcError) {
    return <Placeholder error>Calculation error: {String(calcError.message ?? calcError)}</Placeholder>
  }
  if (!results.current) {
    return <Placeholder error>No feasible sizing found. Try a larger firm capacity or lower threshold.</Placeholder>
  }

  const { current, projectionCurve, thresholdRequested, thresholdAchieved } = results
  return (
    <div className="v2-results" style={{ padding: 16, overflowY: 'auto', opacity: calculating ? 0.6 : 1, transition: 'opacity 150ms' }}>
      <LcoeHeadline
        systemLcoe={current.costs.systemLcoePerMWh}
        blendedLcoe={current.costs.blendedLcoePerMWh}
        solarMW={current.solarMW}
        batteryMWh={current.batteryMWh}
        firmMW={firmMW}
      />
      <FirmnessGauge requested={thresholdRequested} achieved={thresholdAchieved} />
      <h4 style={{ marginTop: 20 }}>Cost breakdown</h4>
      <CostBreakdownV2 breakdown={current.costs.costBreakdownPerKWh} />
      <h4 style={{ marginTop: 20 }}>Forward projection (10-year)</h4>
      <ProjectionChartV2 curve={projectionCurve} />
    </div>
  )
}

function Placeholder({ children, error }) {
  return (
    <div style={{
      padding: 32, color: error ? '#fca5a5' : 'rgba(255,255,255,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
    }}>
      {children}
    </div>
  )
}
