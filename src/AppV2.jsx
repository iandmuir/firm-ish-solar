import React, { useMemo, useRef, useState } from 'react'
import Header from './components/Header.jsx'
import InputPanelV2 from './components/v2/InputPanelV2.jsx'
import ResultsPanelV2 from './components/v2/ResultsPanelV2.jsx'
import { V2_DEFAULTS } from './engine/constants-v2.js'
import { useCityData } from './hooks/useCityData.js'
import { useCalculateV2 } from './hooks/useCalculateV2.js'
import cities from './data/cities.json'
import { buildOptions } from './components/v2/locationPicker.logic.js'
import { exportScenarioPdf, buildExportFilename } from './utils/exportPdf.js'

const INITIAL = {
  firmCapacityMW: V2_DEFAULTS.firmCapacityMW,
  firmnessThresholdPct: V2_DEFAULTS.firmnessThresholdPct,
  backupCostPerMWh: V2_DEFAULTS.backupCostPerMWh,
  backupType: 'Gas Peaker',
  solarCostPerWdc: V2_DEFAULTS.solarCostPerWdc,
  solarDegradationPct: V2_DEFAULTS.solarDegradationPct,
  solarOmPerKwdcYear: V2_DEFAULTS.solarOmPerKwdcYear,
  batteryCostPerKwh: V2_DEFAULTS.batteryCostPerKwh,
  pvToBatteryEffPct: V2_DEFAULTS.pvToBatteryEffPct,
  inverterEffPct: V2_DEFAULTS.inverterEffPct,
  batteryDodPct: V2_DEFAULTS.batteryDodPct,
  batteryChemicalRtePct: V2_DEFAULTS.batteryChemicalRtePct,
  batteryDegradationPct: V2_DEFAULTS.batteryDegradationPct,
  batteryAugCycle: V2_DEFAULTS.batteryAugCycle,
  batteryOmPerKwhYear: V2_DEFAULTS.batteryOmPerKwhYear,
  gridCostPerWac: V2_DEFAULTS.gridCostPerWac,
  inverterCostPerWac: V2_DEFAULTS.inverterCostPerWac,
  inverterReplacementCycle: V2_DEFAULTS.inverterReplacementCycle,
  inverterReplacementFraction: V2_DEFAULTS.inverterReplacementFraction,
  waccPct: V2_DEFAULTS.waccPct,
  projectLifetime: V2_DEFAULTS.projectLifetime,
  opexEscalationPct: V2_DEFAULTS.opexEscalationPct,
  annualSolarCostDeclinePct: V2_DEFAULTS.annualSolarCostDeclinePct,
  annualBatteryCostDeclinePct: V2_DEFAULTS.annualBatteryCostDeclinePct,
  benchmarkSource: V2_DEFAULTS.benchmarkSource,
  benchmarkLcoe: V2_DEFAULTS.benchmarkLcoe,
  benchmarkEscalationPct: V2_DEFAULTS.benchmarkEscalationPct,
}

// Picked fresh on each page load so the user sees a different country each visit.
function randomCitySlug() {
  const opts = buildOptions(cities)
  return opts[Math.floor(Math.random() * opts.length)].slug
}

export default function AppV2() {
  const [inputs, setInputs] = useState(INITIAL)
  const [citySlug, setCitySlug] = useState(randomCitySlug)
  const [exporting, setExporting] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const resultsRef = useRef(null)
  const { data: cityData, loading: cityLoading, error: cityError } = useCityData(citySlug)
  const { results, calculating, error: calcError } = useCalculateV2(inputs, cityData)

  // Resolve the active city's display metadata (country + city + coords + iso3)
  // from the picker options, so the export can label & filename correctly.
  const allOptions = useMemo(() => buildOptions(cities), [])
  const activeCity = useMemo(
    () => allOptions.find(o => o.slug === citySlug) ?? null,
    [allOptions, citySlug]
  )

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      await exportScenarioPdf({
        node: resultsRef.current,
        inputs,
        city: activeCity,
        filename: buildExportFilename({
          iso3: activeCity?.iso3,
          cityName: activeCity?.city,
          firmCapacityMW: inputs.firmCapacityMW,
          firmnessAchievedPct: results?.thresholdAchieved,
        }),
      })
    } catch (err) {
      console.error('Export failed:', err)
      alert('Sorry — couldn\'t generate the PDF. See console for details.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="app-root">
      <Header onExport={handleExport} exporting={exporting} />
      <div className={`app-body${panelCollapsed ? ' panel-collapsed' : ''}`}>
        <div className="app-input">
          <button
            className="panel-toggle panel-toggle--hide"
            onClick={() => setPanelCollapsed(true)}
            aria-label="Hide inputs panel"
            title="Hide inputs (more room for charts)"
          >
            <span className="panel-toggle-icon">‹</span>
          </button>
          <InputPanelV2
            inputs={inputs}
            citySlug={citySlug}
            setCitySlug={setCitySlug}
            onChange={setInputs}
          />
        </div>
        <div className="app-results">
          <button
            className="panel-toggle panel-toggle--show"
            onClick={() => setPanelCollapsed(false)}
            aria-label="Show inputs panel"
            title="Show inputs"
          >
            <span className="panel-toggle-icon">›</span>
          </button>
          <ResultsPanelV2
            cityData={cityData}
            cityLoading={cityLoading}
            cityError={cityError}
            results={results}
            calculating={calculating}
            calcError={calcError}
            firmMW={inputs.firmCapacityMW}
            threshold={inputs.firmnessThresholdPct}
            benchmarkLcoe={inputs.benchmarkLcoe}
            benchmarkSource={inputs.benchmarkSource}
            benchmarkEscalationPct={inputs.benchmarkEscalationPct}
            projectLifetime={inputs.projectLifetime}
            opexEscalationPct={inputs.opexEscalationPct}
            waccPct={inputs.waccPct}
            backupType={inputs.backupType}
            backupCostPerMWh={inputs.backupCostPerMWh}
            countryName={activeCity?.country}
            cityName={activeCity?.city}
            exportRef={resultsRef}
          />
        </div>
      </div>
    </div>
  )
}
