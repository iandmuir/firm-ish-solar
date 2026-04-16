import React, { useState } from 'react'
import SliderInput from './SliderInput.jsx'
import CountrySelector from './CountrySelector.jsx'
import conventionalDefaults from '../data/conventional-defaults.json'

function SectionHeader({ title, collapsible, open, onToggle }) {
  return (
    <div
      className={collapsible ? 'section-header' : ''}
      onClick={collapsible ? onToggle : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: open ? 12 : 0,
        paddingBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginTop: 20,
      }}
    >
      <span style={{
        fontFamily: '"Space Grotesk", sans-serif',
        fontSize: 12,
        fontWeight: 600,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
      }}>
        {title}
      </span>
      {collapsible && (
        <span style={{ fontSize: 10, color: '#64748b' }}>{open ? '▲' : '▼'}</span>
      )}
    </div>
  )
}

export default function InputPanel({ inputs, onChange, results }) {
  const [financeOpen, setFinanceOpen] = useState(true)
  const [marketOpen, setMarketOpen] = useState(true)

  const set = (key) => (val) => onChange({ ...inputs, [key]: val })

  const handleBenchmarkSource = (e) => {
    const src = e.target.value
    const lcoe = conventionalDefaults[src]
    onChange({ ...inputs, benchmarkSource: src, benchmarkLcoe: lcoe })
  }

  const handleTargetModeToggle = () => {
    const newMode = inputs.targetMode === 'mw' ? 'mwh' : 'mw'
    onChange({ ...inputs, targetMode: newMode })
  }

  const firmMWhDay = inputs.firmCapacityMW * 24

  return (
    <div style={{
      overflowY: 'auto',
      height: '100%',
      padding: '16px 18px 32px',
    }}>

      {/* Section 1: Site & Target */}
      <SectionHeader title="Site & Target" open />
      <CountrySelector
        value={inputs.country}
        onChange={val => onChange({ ...inputs, country: val })}
        worstMonthIdx={results?.worstMonthIdx}
        worstMonthYield={results?.worstMonthYield}
      />

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Firm Generation Target</span>
          <button
            onClick={handleTargetModeToggle}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 4,
              padding: '3px 10px',
              color: '#94a3b8',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: '"DM Sans", sans-serif',
            }}
          >
            {inputs.targetMode === 'mw' ? 'Switch to MWh/day' : 'Switch to MW'}
          </button>
        </div>

        {inputs.targetMode === 'mw' ? (
          <SliderInput
            label="Firm Capacity"
            unit="MW"
            min={10}
            max={1000}
            step={1}
            value={inputs.firmCapacityMW}
            onChange={set('firmCapacityMW')}
            tooltip="The guaranteed minimum average monthly power output delivered around the clock. The system is designed to consistently meet this capacity target on a monthly basis."
          />
        ) : (
          <SliderInput
            label="Monthly Energy Target"
            unit="MWh/day avg"
            min={240}
            max={24000}
            step={24}
            value={firmMWhDay}
            onChange={(v) => onChange({ ...inputs, firmCapacityMW: v / 24 })}
            tooltip="Average daily energy the system must deliver each month. Equivalent to Firm Capacity × 24."
          />
        )}
        <div style={{ fontSize: 11, color: '#64748b', marginTop: -4, marginBottom: 6 }}>
          = {inputs.targetMode === 'mw'
            ? `${(firmMWhDay).toLocaleString('en-US', { maximumFractionDigits: 0 })} MWh/day average`
            : `${inputs.firmCapacityMW.toFixed(1)} MW firm capacity`}
        </div>
      </div>

      {/* Section 2: Solar Asset */}
      <SectionHeader title="Solar Asset" open />
      <SliderInput
        label="Turnkey Installed Cost"
        unit="$/Wdc"
        min={0.20} max={2.00} step={0.01}
        value={inputs.solarCostPerWdc}
        onChange={set('solarCostPerWdc')}
        tooltip="Fully installed EPC cost per watt DC, including modules, racking, inverters, wiring, and installation labor."
      />
      <SliderInput
        label="Annual Degradation"
        unit="%/yr"
        min={0.0} max={1.5} step={0.1}
        value={inputs.solarDegradationPct}
        onChange={set('solarDegradationPct')}
        tooltip="Annual reduction in solar panel output. Typical crystalline silicon panels degrade ~0.5%/year."
      />
      <SliderInput
        label="Repowering Cycle"
        unit="years"
        min={5} max={25} step={1}
        value={inputs.solarRepowerCycle}
        onChange={set('solarRepowerCycle')}
        tooltip="How often the solar array is repowered — key components replaced to restore capacity to 100%. Events within 3 years of project end are skipped."
      />
      <SliderInput
        label="Repowering Cost"
        unit="% of turnkey"
        min={25} max={50} step={1}
        value={inputs.solarRepowerFraction}
        onChange={set('solarRepowerFraction')}
        tooltip="Cost of a repowering event as a percentage of the full turnkey installed cost in that future year. Covers module replacement and associated labor, using projected future prices."
      />
      <SliderInput
        label="Fixed O&M"
        unit="$/kWdc/yr"
        min={5} max={30} step={1}
        value={inputs.solarOmPerKwdcYear}
        onChange={set('solarOmPerKwdcYear')}
        tooltip="Annual operations & maintenance cost per kW of installed solar DC capacity. Covers cleaning, monitoring, vegetation management, and component repairs."
      />

      {/* Section 3: Storage Asset */}
      <SectionHeader title="Storage Asset" open />
      <SliderInput
        label="Turnkey Installed Cost"
        unit="$/kWh"
        min={50} max={500} step={5}
        value={inputs.batteryCostPerKwh}
        onChange={set('batteryCostPerKwh')}
        tooltip="Fully installed EPC cost per kWh of battery nameplate capacity, including cells, BMS, thermal management, enclosures, and installation."
      />
      <SliderInput
        label="Round-Trip Efficiency"
        unit="%"
        min={70} max={95} step={1}
        value={inputs.batteryRtePct}
        onChange={set('batteryRtePct')}
        tooltip="Percentage of energy recovered from storage relative to energy put in. Accounts for charging and discharging losses."
      />
      <SliderInput
        label="Depth of Discharge"
        unit="%"
        min={80} max={100} step={1}
        value={inputs.batteryDodPct}
        onChange={set('batteryDodPct')}
        tooltip="Usable fraction of battery nameplate capacity. Modern LFP batteries can sustain 100% DoD without significant life penalty."
      />
      <SliderInput
        label="Annual Degradation"
        unit="%/yr"
        min={0} max={5} step={0.5}
        value={inputs.batteryDegradationPct}
        onChange={set('batteryDegradationPct')}
        tooltip="Annual reduction in battery usable capacity due to cycling and calendar aging."
      />
      <SliderInput
        label="Augmentation Cycle"
        unit="years"
        min={3} max={20} step={1}
        value={inputs.batteryAugCycle}
        onChange={set('batteryAugCycle')}
        tooltip="How often new battery cells are added to restore storage to its original Year 1 capacity. Events within 3 years of project end are skipped."
      />
      <SliderInput
        label="Fixed O&M"
        unit="$/kWh/yr"
        min={2} max={20} step={1}
        value={inputs.batteryOmPerKwhYear}
        onChange={set('batteryOmPerKwhYear')}
        tooltip="Annual operations & maintenance cost per kWh of installed battery nameplate capacity."
      />

      {/* Section 4: Project Finance (collapsed) */}
      <SectionHeader title="Project Finance" collapsible open={financeOpen} onToggle={() => setFinanceOpen(o => !o)} />
      {financeOpen && (
        <>
          <SliderInput
            label="Discount Rate / WACC"
            unit="%"
            min={2} max={20} step={0.5}
            value={inputs.waccPct}
            onChange={set('waccPct')}
            tooltip="Weighted average cost of capital. Reflects the blended cost of debt and equity financing for the project."
          />
          <SliderInput
            label="Project Lifetime"
            unit="years"
            min={15} max={35} step={1}
            value={inputs.projectLifetime}
            onChange={set('projectLifetime')}
            tooltip="Total operational life of the project for LCOE calculation."
          />
          <SliderInput
            label="Value of Excess Power"
            unit="$/kWh"
            min={0} max={0.10} step={0.005}
            value={inputs.excessPowerValuePerKwh}
            onChange={set('excessPowerValuePerKwh')}
            tooltip="Price at which excess solar generation (beyond firm-delivery needs) can be sold. Used to estimate potential annual revenue from surplus energy. Set to 0 to treat excess as curtailed."
          />
        </>
      )}

      {/* Section 5: Comparison with Traditional Plants (collapsed) */}
      <SectionHeader title="Comparison with Traditional Plants" collapsible open={marketOpen} onToggle={() => setMarketOpen(o => !o)} />
      {marketOpen && (
        <>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
              Benchmark Source
            </label>
            <select
              value={inputs.benchmarkSource}
              onChange={handleBenchmarkSource}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                padding: '6px 10px',
                color: '#e2e8f0',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {Object.keys(conventionalDefaults).map(src => (
                <option key={src} value={src} style={{ background: '#0f2040' }}>{src}</option>
              ))}
            </select>
          </div>
          <SliderInput
            label="Conventional Benchmark LCOE"
            unit="$/kWh"
            min={0.02} max={0.30} step={0.005}
            value={inputs.benchmarkLcoe}
            onChange={set('benchmarkLcoe')}
            tooltip="Levelized cost of energy for the selected conventional generation source."
          />
        </>
      )}

      {/* Future Cost Projections */}
      <SectionHeader title="Future Cost Projections" open />
      <SliderInput
        label="Annual Solar Cost Decline"
        unit="%/yr"
        min={0} max={15} step={0.5}
        value={inputs.annualSolarCostDeclinePct}
        onChange={set('annualSolarCostDeclinePct')}
        tooltip="Expected annual reduction in solar module and installation costs. Also used to price repowering events within each scenario."
      />
      <SliderInput
        label="Annual Battery Cost Decline"
        unit="%/yr"
        min={0} max={20} step={0.5}
        value={inputs.annualBatteryCostDeclinePct}
        onChange={set('annualBatteryCostDeclinePct')}
        tooltip="Expected annual reduction in battery storage costs. Also used to price augmentation events within each scenario."
      />
      <div style={{ fontSize: 11, color: '#64748b', marginTop: -4 }}>
        Projection horizon: 10 years
      </div>
    </div>
  )
}
