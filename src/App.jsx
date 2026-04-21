import React, { useState, useMemo } from 'react'
import Header from './components/Header.jsx'
import InputPanel from './components/InputPanel.jsx'
import ResultsPanel from './components/ResultsPanel.jsx'
import AppV2 from './AppV2.jsx'
import { DEFAULTS } from './engine/constants.js'
import { calculateResults } from './engine/calculate.js'
import solarData from './data/solar-data.json'

const initialInputs = {
  country: DEFAULTS.country,
  firmCapacityMW: DEFAULTS.firmCapacityMW,
  targetMode: DEFAULTS.targetMode,
  solarCostPerWdc: DEFAULTS.solarCostPerWdc,
  solarDegradationPct: DEFAULTS.solarDegradationPct,
  solarRepowerCycle: DEFAULTS.solarRepowerCycle,
  solarRepowerFraction: DEFAULTS.solarRepowerFraction,
  solarOmPerKwdcYear: DEFAULTS.solarOmPerKwdcYear,
  batteryCostPerKwh: DEFAULTS.batteryCostPerKwh,
  batteryRtePct: DEFAULTS.batteryRtePct,
  batteryDodPct: DEFAULTS.batteryDodPct,
  batteryDegradationPct: DEFAULTS.batteryDegradationPct,
  batteryAugCycle: DEFAULTS.batteryAugCycle,
  batteryOmPerKwhYear: DEFAULTS.batteryOmPerKwhYear,
  waccPct: DEFAULTS.waccPct,
  projectLifetime: DEFAULTS.projectLifetime,
  excessPowerValuePerKwh: DEFAULTS.excessPowerValuePerKwh,
  benchmarkSource: DEFAULTS.benchmarkSource,
  benchmarkLcoe: DEFAULTS.benchmarkLcoe,
  annualSolarCostDeclinePct: DEFAULTS.annualSolarCostDeclinePct,
  annualBatteryCostDeclinePct: DEFAULTS.annualBatteryCostDeclinePct,
}

function readInitialMode() {
  const params = new URLSearchParams(globalThis.location?.search ?? '')
  if (params.get('v') === '2') return 'v2'
  return 'v1'
}

export default function App() {
  const [mode, setMode] = useState(readInitialMode)
  const [inputs, setInputs] = useState(initialInputs)

  const results = useMemo(() => {
    if (mode !== 'v1') return null
    const countryData = solarData[inputs.country]
    if (!countryData) return null
    try {
      return calculateResults({ ...inputs, countryData })
    } catch (e) {
      console.error('Calculation error:', e)
      return null
    }
  }, [inputs, mode])

  const toggle = (
    <button
      onClick={() => setMode(m => (m === 'v1' ? 'v2' : 'v1'))}
      style={{
        position: 'fixed', top: 12, right: 12, zIndex: 50,
        background: 'rgba(255,255,255,0.08)', color: '#fff',
        border: '1px solid rgba(255,255,255,0.15)', padding: '4px 10px',
        borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem',
      }}
      title="Toggle v1/v2 UI"
    >
      {mode === 'v1' ? '→ v2 (city-based, threshold)' : '→ v1 (country-based)'}
    </button>
  )

  if (mode === 'v2') {
    return <>{toggle}<AppV2 /></>
  }

  return (
    <>
      {toggle}
      <div className="app-root">
        <Header />
        <div className="app-body">
          <div className="app-input">
            <InputPanel inputs={inputs} onChange={setInputs} results={results} />
          </div>
          <div className="app-results">
            <ResultsPanel results={results} inputs={inputs} />
          </div>
        </div>
      </div>
    </>
  )
}
