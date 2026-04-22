import React from 'react'
import SliderInput from '../SliderInput.jsx'
import LocationPicker from './LocationPicker.jsx'
import ThresholdSlider from './ThresholdSlider.jsx'
import conventionalDefaults from '../../data/conventional-defaults.json'

// Backup power type → default $/kWh. User can still slide/type freely after picking.
const BACKUP_DEFAULTS_PER_KWH = {
  'Gas Peaker': 0.15,
  'Virtual Peaker': 0.25,
  'Diesel Genset': 0.30,
}

function Section({ title, children }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 8,
      padding: '12px 14px 14px',
      marginTop: 14,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 12,
          fontWeight: 600,
          color: '#cbd5e1',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

/**
 * v2 input panel. `inputs` holds the full input set (see AppV2.jsx initial state).
 * Each handler calls setInputs with a shallow merge.
 */
export default function InputPanelV2({ inputs, citySlug, setCitySlug, onChange }) {
  const set = (key) => (v) => onChange(prev => ({ ...prev, [key]: v }))

  const handleBenchmarkSource = (e) => {
    const src = e.target.value
    const lcoe = conventionalDefaults[src]
    onChange(prev => ({ ...prev, benchmarkSource: src, benchmarkLcoe: lcoe }))
  }

  const handleBackupType = (e) => {
    const type = e.target.value
    const kwh = BACKUP_DEFAULTS_PER_KWH[type]
    onChange(prev => ({ ...prev, backupType: type, backupCostPerMWh: kwh * 1000 }))
  }

  // Engine stores $/MWh; UI shows $/kWh
  const backupCostPerKwh = inputs.backupCostPerMWh / 1000
  const setBackupCostPerKwh = (v) =>
    onChange(prev => ({ ...prev, backupCostPerMWh: v * 1000 }))

  return (
    <div className="v2-input-panel" style={{ overflowY: 'auto', height: '100%', padding: '16px 18px 32px' }}>

      <Section title="Site & Target">
      <LocationPicker value={citySlug} onChange={setCitySlug} />
      <div style={{ marginTop: 14 }} />
      <SliderInput
        label="Firm Capacity"
        unit="MW"
        min={10} max={1000} step={10}
        value={inputs.firmCapacityMW}
        onChange={set('firmCapacityMW')}
        tooltip="The round-the-clock power output the system targets. The solver sizes solar + storage to meet or exceed this for at least the firmness threshold fraction of hours across all years of weather data; the rest is covered by backup."
      />
      <ThresholdSlider
        value={inputs.firmnessThresholdPct}
        onChange={set('firmnessThresholdPct')}
      />
      <SliderInput
        label="Project Lifetime"
        unit="years"
        min={10} max={40} step={1}
        value={inputs.projectLifetime}
        onChange={set('projectLifetime')}
        tooltip="Total operational life of the project for LCOE calculation. This defines the financial horizon for all OPEX, degradation, and lifecycle CapEx events."
      />
      <SliderInput
        label="Discount Rate / WACC"
        unit="%"
        min={3} max={15} step={0.1}
        value={inputs.waccPct}
        onChange={set('waccPct')}
        tooltip="Weighted average cost of capital. Reflects the blended cost of debt and equity financing for the project."
      />

      </Section>

      <Section title="Solar Asset">
      <SliderInput
        label="Turnkey Installed Cost"
        unit="$/Wdc"
        min={0.10} max={1.50} step={0.01}
        value={inputs.solarCostPerWdc}
        onChange={set('solarCostPerWdc')}
        tooltip="Fully installed EPC cost per watt DC, including modules, racking, wiring, installation labor, and the field-side DC-DC optimizers that scale one-to-one with PV capacity. The central DC-AC inverter scales with firm AC capacity and is priced separately."
      />
      <SliderInput
        label="Fixed O&M"
        unit="$/kWdc/yr"
        min={0} max={30} step={0.5}
        value={inputs.solarOmPerKwdcYear}
        onChange={set('solarOmPerKwdcYear')}
        tooltip="Annual operations & maintenance cost per kW of installed solar DC capacity. Covers cleaning, monitoring, vegetation management, and component repairs."
      />
      <SliderInput
        label="Annual Degradation"
        unit="%/yr"
        min={0.0} max={2.0} step={0.1}
        value={inputs.solarDegradationPct}
        onChange={set('solarDegradationPct')}
        tooltip="Annual reduction in solar panel output, applied continuously across the full project lifetime (no reset events). Typical crystalline silicon panels degrade ~0.5%/yr."
      />

      </Section>

      <Section title="Storage Asset">
      <SliderInput
        label="Turnkey Installed Cost"
        unit="$/kWh"
        min={50} max={500} step={5}
        value={inputs.batteryCostPerKwh}
        onChange={set('batteryCostPerKwh')}
        tooltip="Fully installed EPC cost per kWh of battery nameplate capacity, including cells, BMS, thermal management, enclosures, and installation."
      />
      <SliderInput
        label="Fixed O&M"
        unit="$/kWh/yr"
        min={0} max={15} step={0.1}
        value={inputs.batteryOmPerKwhYear}
        onChange={set('batteryOmPerKwhYear')}
        tooltip="Annual operations & maintenance cost per kWh of installed battery nameplate capacity."
      />
      <SliderInput
        label="DC-DC Efficiency"
        unit="%"
        min={90} max={100} step={0.1}
        value={inputs.pvToBatteryEffPct}
        onChange={set('pvToBatteryEffPct')}
        tooltip="The efficiency of the field-side string optimizers required to step the raw solar PV power onto the regulated DC bus. Because the battery sits directly on this regulated bus, it does not pay this DC-DC conversion loss."
      />
      <SliderInput
        label="Depth of Discharge"
        unit="%"
        min={70} max={100} step={1}
        value={inputs.batteryDodPct}
        onChange={set('batteryDodPct')}
        tooltip="Usable fraction of battery nameplate capacity. Bankable utility-scale models typically limit DoD to 90%–95% to balance daily revenue generation with long-term cell degradation and warranty limits."
      />
      <SliderInput
        label="Battery Chemical RTE"
        unit="%"
        min={80} max={100} step={0.1}
        value={inputs.batteryChemicalRtePct}
        onChange={set('batteryChemicalRtePct')}
        tooltip="The internal chemical round-trip efficiency of the lithium-ion cells (heat loss during charge/discharge). This is applied symmetrically in the dispatch model (√RTE per leg) and is completely separate from the silicon power electronics losses."
      />
      <SliderInput
        label="Annual Degradation"
        unit="%/yr"
        min={0} max={5} step={0.1}
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

      </Section>

      <Section title="Power Conversion & Grid Interconnection">
      <SliderInput
        label="Inverter Installed Cost"
        unit="$/Wac"
        min={0.01} max={0.20} step={0.002}
        value={inputs.inverterCostPerWac}
        onChange={set('inverterCostPerWac')}
        tooltip="Fully installed inverter cost per watt AC. Sized to the firm capacity target since that's the AC cap on delivered power."
      />
      <SliderInput
        label="DC-AC Inverter Efficiency"
        unit="%"
        min={90} max={100} step={0.1}
        value={inputs.inverterEffPct}
        onChange={set('inverterEffPct')}
        tooltip="Pure DC-AC inverter efficiency. Applied alone on Battery→Grid (the battery sits on the regulated DC bus) and composed with the PV-side DC-DC stage on PV→Grid — e.g. 98.2% × 98% ≈ 96.24%."
      />
      <SliderInput
        label="Grid Interconnect"
        unit="$/Wac"
        min={0.01} max={0.30} step={0.005}
        value={inputs.gridCostPerWac}
        onChange={set('gridCostPerWac')}
        tooltip="Cost of grid interconnection hardware (transformers, switchgear, protection) per watt AC delivered to the grid. Scales with firm capacity."
      />
      <SliderInput
        label="Inverter Replacement Cycle"
        unit="years"
        min={5} max={25} step={1}
        value={inputs.inverterReplacementCycle}
        onChange={set('inverterReplacementCycle')}
        tooltip="How often the inverter skids are replaced. Events within 3 years of project end are skipped."
      />
      <SliderInput
        label="Inverter Replacement Cost"
        unit="% of inverter turnkey"
        min={0} max={120} step={5}
        value={inputs.inverterReplacementFraction}
        onChange={set('inverterReplacementFraction')}
        tooltip="Cost of each replacement as a percentage of the inverter turnkey installed cost (not the whole plant). Priced at that future year's inverter cost, declining at the annual solar cost decline rate."
      />

      </Section>

      <Section title="Future Cost Projections">
      <SliderInput
        label="OPEX Escalation"
        unit="%/yr"
        min={0} max={10} step={0.1}
        value={inputs.opexEscalationPct}
        onChange={set('opexEscalationPct')}
        tooltip="Annual escalation rate applied to O&M and backup costs over the project lifetime."
      />
      <SliderInput
        label="Annual Solar & Inverter Cost Decline"
        unit="%/yr"
        min={0} max={10} step={0.1}
        value={inputs.annualSolarCostDeclinePct}
        onChange={set('annualSolarCostDeclinePct')}
        tooltip="Expected annual reduction in solar module, installation, and inverter costs. Applied to future-build CAPEX in the projection chart and to inverter replacement events priced at the year of the event."
      />
      <SliderInput
        label="Annual Battery Cost Decline"
        unit="%/yr"
        min={0} max={10} step={0.1}
        value={inputs.annualBatteryCostDeclinePct}
        onChange={set('annualBatteryCostDeclinePct')}
        tooltip="Expected annual reduction in battery storage costs. Also used to price augmentation events within each scenario."
      />
      <div style={{ fontSize: 11, color: '#64748b', marginTop: -4 }}>
        Projection horizon: 10 years
      </div>

      </Section>

      <Section title="Backup Power Options">
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
          Backup Type
        </label>
        <select
          value={inputs.backupType || 'Gas Peaker'}
          onChange={handleBackupType}
          style={{
            width: '100%',
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            padding: '6px 10px',
            color: '#e2e8f0',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {Object.keys(BACKUP_DEFAULTS_PER_KWH).map(t => (
            <option key={t} value={t} style={{ background: '#0f172a', color: '#fff' }}>{t}</option>
          ))}
        </select>
      </div>
      <SliderInput
        label="Backup Power Cost"
        unit="$/kWh"
        min={0.05} max={0.50} step={0.01}
        value={backupCostPerKwh}
        onChange={setBackupCostPerKwh}
        tooltip="Cost per kWh of unmet energy during hours where solar + battery fall short of the firm target. Selecting a backup type above sets a sensible default; you can still override manually."
      />

      </Section>

      <Section title="Comparison with Traditional Plants">
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
          Benchmark Source
        </label>
        <select
          value={inputs.benchmarkSource}
          onChange={handleBenchmarkSource}
          style={{
            width: '100%',
            background: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            padding: '6px 10px',
            color: '#e2e8f0',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          {Object.keys(conventionalDefaults).map(src => (
            <option key={src} value={src} style={{ background: '#0f172a', color: '#fff' }}>{src}</option>
          ))}
        </select>
      </div>
      <SliderInput
        label="Conventional Benchmark LCOE"
        unit="$/kWh"
        min={0.02} max={0.30} step={0.005}
        value={inputs.benchmarkLcoe}
        onChange={set('benchmarkLcoe')}
        tooltip="Levelized cost of energy for the selected conventional generation source. Used for the comparison badge and projection-chart reference line."
      />
      <SliderInput
        label="Traditional Plant LCOE Trend"
        unit="%/yr"
        min={-2} max={5} step={0.1}
        value={inputs.benchmarkEscalationPct}
        onChange={set('benchmarkEscalationPct')}
        tooltip="Year-over-year drift in the LCOE of new-build traditional plants, reflecting fuel price trajectory, O&M inflation, and CAPEX trends rolled into one figure. Applied to the benchmark reference line in the projection chart. 0% holds it flat; positive values tilt it upward as fuel/O&M costs outpace any CAPEX savings."
      />
      </Section>
    </div>
  )
}
