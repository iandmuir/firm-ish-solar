import React from 'react'
import LcoeHeadline from './LcoeHeadline.jsx'
import InitialCapexBreakdown from './InitialCapexBreakdown.jsx'
import CostBreakdownV2 from './CostBreakdownV2.jsx'
import ProjectionChartV2 from './ProjectionChartV2.jsx'
import SolarResourceChart from './SolarResourceChart.jsx'
import AugmentationTimeline from '../AugmentationTimeline.jsx'
import { findHotspots } from '../../engine/hotspots.js'

function skippedYears(cycle, lifetime, buffer = 3) {
  const skipped = []
  for (let y = cycle; y < lifetime; y += cycle) {
    if ((lifetime - y) < buffer) skipped.push(y)
  }
  return skipped
}

export default function ResultsPanelV2({ cityData, cityLoading, cityError, results, calculating, calcError, firmMW, threshold, benchmarkLcoe, benchmarkSource, benchmarkEscalationPct, projectLifetime, inverterReplacementCycle, batteryAugCycle, waccPct, backupType, backupCostPerMWh, countryName, cityName, exportRef }) {
  if (cityError) {
    return <Placeholder error>Couldn't load city: {String(cityError.message ?? cityError)}</Placeholder>
  }
  if (cityLoading) {
    return <Placeholder>Loading city data…</Placeholder>
  }
  if (!cityData) {
    return <Placeholder>Pick a city to get started.</Placeholder>
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
    return <Placeholder error>No feasible sizing found. Try a lower threshold or a sunnier site.</Placeholder>
  }

  const { current, projectionCurve, thresholdRequested, thresholdAchieved } = results
  const locationStr = cityName && countryName ? `${cityName}, ${countryName}` : (countryName ?? cityName ?? '—')
  // All-in non-storage $/Wdc = (solar + inverter + grid-interconnect capex) ÷ (solar MW · 1e6).
  // Scales with firm:solar ratio because inverter/grid are priced per Wac of firm capacity.
  const nonStorageCapex = current.costs.initialCapex.solar + current.costs.initialCapex.inverter + current.costs.initialCapex.grid
  const allInPerWdc = nonStorageCapex / (current.solarMW * 1e6)
  const batteryPerKwh = current.costs.initialCapex.battery / (current.batteryMWh * 1000)

  // Shortfall hotspots: top-3 7-day windows where firmness most often falls
  // short across all weather years. Anchor for the chart overlay + subtitle.
  // Hidden entirely when totalUnmetHours is below the noise floor (~12h).
  const hotspots = findHotspots(current.dispatch.unmetHoursByDoy, { n: 5 })
  const showHotspots = hotspots.totalUnmetHours >= 12 && hotspots.windows.length > 0
  const resourceSubtitle = showHotspots
    ? `${hotspots.windows.length} worst week${hotspots.windows.length === 1 ? '' : 's'} · ${Math.round(hotspots.paretoPct)}% of unmet hours`
    : null
  return (
    <div ref={exportRef} className="v2-results" style={{ padding: 16, overflowY: 'auto', overflowX: 'hidden', opacity: calculating ? 0.6 : 1, transition: 'opacity 150ms', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ScenarioStrip
        location={locationStr}
        firmMW={firmMW}
        firmnessAchieved={thresholdAchieved}
        allInPerWdc={allInPerWdc}
        batteryPerKwh={batteryPerKwh}
        backupType={backupType}
        backupCostPerMWh={backupCostPerMWh}
        waccPct={waccPct}
        projectLifetime={projectLifetime}
      />
      <LcoeHeadline
        systemLcoe={current.costs.systemLcoePerMWh}
        blendedLcoe={current.costs.blendedLcoePerMWh}
        solarMW={current.solarMW}
        batteryMWh={current.batteryMWh}
        firmMW={firmMW}
        benchmarkLcoe={benchmarkLcoe}
        benchmarkSource={benchmarkSource}
        firmnessRequested={thresholdRequested}
        firmnessAchieved={thresholdAchieved}
        firmnessByYear={current.dispatch.firmnessByYear}
        startYear={cityData.startYear}
      />
      <div className="results-cost-row">
        <Card title="Initial CAPEX Breakdown">
          <InitialCapexBreakdown initialCapex={current.costs.initialCapex} />
        </Card>
        <Card title="LCOE Breakdown">
          <CostBreakdownV2 breakdown={current.costs.costBreakdownPerKWh} />
        </Card>
      </div>
      <Card title="Daily Solar Resource — Typical Year" subtitle={resourceSubtitle}>
        <SolarResourceChart cityData={cityData} hotspots={showHotspots ? hotspots : null} />
      </Card>
      <Card>
        <AugmentationTimeline
          inverterReplacementEvents={current.costs.inverterReplacementEvents}
          batteryAugEvents={current.costs.batteryAugEvents}
          inverterSkipped={skippedYears(inverterReplacementCycle, projectLifetime)}
          batterySkipped={skippedYears(batteryAugCycle, projectLifetime)}
          projectLifetime={projectLifetime}
        />
      </Card>
      <Card title="Forward LCOE Projection (10-year)">
        <ProjectionChartV2 curve={projectionCurve} benchmarkLcoe={benchmarkLcoe} benchmarkSource={benchmarkSource} benchmarkEscalationPct={benchmarkEscalationPct} />
      </Card>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 14,
        fontSize: 11,
        color: '#64748b',
        fontFamily: '"JetBrains Mono", monospace',
        padding: '4px 2px 0',
        flexWrap: 'wrap',
      }}>
        <span>Site GHI map · NASA POWER annual climatology</span>
        <span aria-hidden="true">|</span>
        <span>PVGIS hourly irradiance · 2005–2023 · EU JRC</span>
      </div>
    </div>
  )
}

function ScenarioStrip({ location, firmMW, firmnessAchieved, allInPerWdc, batteryPerKwh, backupType, backupCostPerMWh, waccPct, projectLifetime }) {
  return (
    <div className="scenario-strip">
      <span className="scenario-dot pulse-slow" aria-hidden="true" />
      <span className="scenario-location">{location}</span>
      <span className="scenario-divider" />
      <span className="scenario-stat">
        <b className="scenario-val">{firmMW} MW</b>
        {firmnessAchieved != null && (
          <>
            <span className="scenario-lbl"> @ </span>
            <b className="scenario-val">{firmnessAchieved.toFixed(1)}%</b>
          </>
        )}
      </span>
      <span className="scenario-divider" />
      <span
        className="scenario-stat"
        title="All-in non-storage CAPEX (solar + inverter + grid interconnect) per Wdc of solar · battery per kWh"
      >
        <b className="scenario-cost">${allInPerWdc.toFixed(2)}</b>
        <span className="scenario-lbl">/Wdc · </span>
        <b className="scenario-cost">${Math.round(batteryPerKwh)}</b>
        <span className="scenario-lbl">/kWh</span>
      </span>
      <span className="scenario-divider" />
      <span
        className="scenario-stat"
        title="Backup resource filling the firmness gap"
      >
        <span className="scenario-lbl">{backupType} </span>
        <b className="scenario-backup">${Math.round(backupCostPerMWh)}</b>
        <span className="scenario-lbl">/MWh</span>
      </span>
      <span className="scenario-divider" />
      <span className="scenario-stat-muted">
        {waccPct?.toFixed(1) ?? '—'}% WACC · {projectLifetime} yr
      </span>
    </div>
  )
}

function Card({ title, subtitle, children }) {
  // Flex column with height:100% lets cards stretch to match a taller
  // neighbor (grid's default align-items: stretch). Children that want to
  // pin something to the bottom of the card can use margin-top: auto or
  // flex: 1 on an intermediate container.
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minWidth: 0,
    }}>
      {title && (
        <div style={{
          marginBottom: 10,
          flex: '0 0 auto',
        }}>
          <div style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 11,
            fontWeight: 600,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {title}
          </div>
          {subtitle && (
            // Quiet pull-quote: low-contrast, no caps, no letter-spacing.
            // Surfaces output-linked context (e.g. shortfall hotspot summary)
            // without competing with the eyebrow above or the chart below.
            <div style={{
              fontFamily: '"DM Sans", sans-serif',
              fontSize: 13,
              color: 'rgba(255,255,255,0.55)',
              marginTop: 2,
            }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
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
