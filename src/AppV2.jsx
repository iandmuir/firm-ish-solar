import React, { useState } from 'react'
import Header from './components/Header.jsx'
import InputPanelV2 from './components/v2/InputPanelV2.jsx'
import ResultsPanelV2 from './components/v2/ResultsPanelV2.jsx'
import { V2_DEFAULTS } from './engine/constants-v2.js'
import { useCityData } from './hooks/useCityData.js'
import { useCalculateV2 } from './hooks/useCalculateV2.js'
import cities from './data/cities.json'
import { buildOptions } from './components/v2/locationPicker.logic.js'

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
}

// Picked fresh on each page load so the user sees a different country each visit.
function randomCitySlug() {
  const opts = buildOptions(cities)
  return opts[Math.floor(Math.random() * opts.length)].slug
}

export default function AppV2() {
  const [inputs, setInputs] = useState(INITIAL)
  const [citySlug, setCitySlug] = useState(randomCitySlug)
  const { data: cityData, loading: cityLoading, error: cityError } = useCityData(citySlug)
  const { results, calculating, error: calcError } = useCalculateV2(inputs, cityData)

  return (
    <div className="app-root">
      <Header />
      <div className="app-body">
        <div className="app-input">
          <InputPanelV2
            inputs={inputs}
            citySlug={citySlug}
            setCitySlug={setCitySlug}
            onChange={setInputs}
          />
        </div>
        <div className="app-results">
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
            projectLifetime={inputs.projectLifetime}
            inverterReplacementCycle={inputs.inverterReplacementCycle}
            batteryAugCycle={inputs.batteryAugCycle}
          />
        </div>
      </div>
    </div>
  )
}
