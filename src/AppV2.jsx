import React, { useState } from 'react'
import Header from './components/Header.jsx'
import InputPanelV2 from './components/v2/InputPanelV2.jsx'
import ResultsPanelV2 from './components/v2/ResultsPanelV2.jsx'
import { V2_DEFAULTS } from './engine/constants-v2.js'
import { useCityData } from './hooks/useCityData.js'
import { useCalculateV2 } from './hooks/useCalculateV2.js'

const INITIAL = {
  firmCapacityMW: V2_DEFAULTS.firmCapacityMW,
  firmnessThresholdPct: V2_DEFAULTS.firmnessThresholdPct,
  backupCostPerMWh: V2_DEFAULTS.backupCostPerMWh,
  solarCostPerWdc: V2_DEFAULTS.solarCostPerWdc,
  solarDegradationPct: V2_DEFAULTS.solarDegradationPct,
  solarRepowerCycle: V2_DEFAULTS.solarRepowerCycle,
  solarRepowerFraction: V2_DEFAULTS.solarRepowerFraction,
  solarOmPerKwdcYear: V2_DEFAULTS.solarOmPerKwdcYear,
  batteryCostPerWh: V2_DEFAULTS.batteryCostPerWh,
  pvToBatteryEffPct: V2_DEFAULTS.pvToBatteryEffPct,
  inverterEffPct: V2_DEFAULTS.inverterEffPct,
  batteryDodPct: V2_DEFAULTS.batteryDodPct,
  batteryDegradationPct: V2_DEFAULTS.batteryDegradationPct,
  batteryAugCycle: V2_DEFAULTS.batteryAugCycle,
  batteryOmPerKwhYear: V2_DEFAULTS.batteryOmPerKwhYear,
  gridCostPerWac: V2_DEFAULTS.gridCostPerWac,
  inverterCostPerWac: V2_DEFAULTS.inverterCostPerWac,
  softCostPct: V2_DEFAULTS.softCostPct,
  waccPct: V2_DEFAULTS.waccPct,
  projectLifetime: V2_DEFAULTS.projectLifetime,
  opexEscalationPct: V2_DEFAULTS.opexEscalationPct,
  annualSolarCostDeclinePct: V2_DEFAULTS.annualSolarCostDeclinePct,
  annualBatteryCostDeclinePct: V2_DEFAULTS.annualBatteryCostDeclinePct,
}

const DEFAULT_CITY = 'USA-new-york-city'  // matches public/data/pvgis/USA-new-york-city.json.gz

export default function AppV2() {
  const [inputs, setInputs] = useState(INITIAL)
  const [citySlug, setCitySlug] = useState(DEFAULT_CITY)
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
          />
        </div>
      </div>
    </div>
  )
}
