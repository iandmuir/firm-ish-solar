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
    <>
      <style>{`
        .app-root {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--navy-950);
          overflow: hidden;
        }
        .app-body {
          display: flex;
          flex-direction: row;
          flex: 1;
          overflow: hidden;
          min-height: 0;
        }
        .app-input {
          width: 40%;
          min-width: 300px;
          border-right: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .app-results {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        /* Portrait mobile: stack vertically, 50/50 split */
        @media (max-width: 768px), (orientation: portrait) and (max-width: 1024px) {
          .app-body {
            flex-direction: column;
          }
          .app-input {
            width: 100%;
            min-width: unset;
            height: 50%;
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }
          .app-results {
            height: 50%;
            flex: unset;
          }
        }
      `}</style>

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
