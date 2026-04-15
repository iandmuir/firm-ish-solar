import React, { useState, useMemo } from 'react'
import Header from './components/Header.jsx'
import InputPanel from './components/InputPanel.jsx'
import ResultsPanel from './components/ResultsPanel.jsx'
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
  benchmarkSource: DEFAULTS.benchmarkSource,
  benchmarkLcoe: DEFAULTS.benchmarkLcoe,
  annualSolarCostDeclinePct: DEFAULTS.annualSolarCostDeclinePct,
  annualBatteryCostDeclinePct: DEFAULTS.annualBatteryCostDeclinePct,
}

export default function App() {
  const [inputs, setInputs] = useState(initialInputs)

  const results = useMemo(() => {
    const countryData = solarData[inputs.country]
    if (!countryData) return null
    try {
      return calculateResults({ ...inputs, countryData })
    } catch (e) {
      console.error('Calculation error:', e)
      return null
    }
  }, [inputs])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--navy-950)',
      overflow: 'hidden',
    }}>
      <Header />

      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        gap: 0,
      }}>
        {/* Input Panel — 40% */}
        <div style={{
          width: '40%',
          minWidth: 320,
          borderRight: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <InputPanel inputs={inputs} onChange={setInputs} results={results} />
        </div>

        {/* Results Panel — 60% */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <ResultsPanel results={results} inputs={inputs} />
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .app-layout {
            flex-direction: column !important;
          }
          .input-panel {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.07) !important;
            max-height: 55vh;
          }
          .results-panel {
            flex: 1;
          }
        }
      `}</style>
    </div>
  )
}
