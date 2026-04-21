import React from 'react'
import SliderInput from '../SliderInput.jsx'
import LocationPicker from './LocationPicker.jsx'
import ThresholdSlider from './ThresholdSlider.jsx'

/**
 * v2 input panel. `inputs` holds the full input set (see AppV2.jsx initial state).
 * Each handler calls setInputs with a shallow merge.
 */
export default function InputPanelV2({ inputs, citySlug, setCitySlug, onChange }) {
  const set = (key) => (v) => onChange(prev => ({ ...prev, [key]: v }))

  return (
    <div className="v2-input-panel" style={{ padding: 16, overflowY: 'auto' }}>
      <h3 style={{ marginTop: 0 }}>Site</h3>
      <LocationPicker value={citySlug} onChange={setCitySlug} />

      <h3>Target</h3>
      <SliderInput label="Firm capacity (MW)" min={10} max={1000} step={10}
        value={inputs.firmCapacityMW} onChange={set('firmCapacityMW')} />
      <ThresholdSlider value={inputs.firmnessThresholdPct} onChange={set('firmnessThresholdPct')} />
      <SliderInput label="Backup cost ($/MWh)" min={50} max={500} step={10}
        value={inputs.backupCostPerMWh} onChange={set('backupCostPerMWh')} />

      <h3>Solar</h3>
      <SliderInput label="Solar CAPEX ($/Wdc)" min={0.1} max={1.5} step={0.01}
        value={inputs.solarCostPerWdc} onChange={set('solarCostPerWdc')} />
      <SliderInput label="Degradation (%/yr)" min={0} max={2} step={0.1}
        value={inputs.solarDegradationPct} onChange={set('solarDegradationPct')} />
      <SliderInput label="Repower cycle (yrs)" min={5} max={25} step={1}
        value={inputs.solarRepowerCycle} onChange={set('solarRepowerCycle')} />
      <SliderInput label="Repower fraction (%)" min={0} max={100} step={5}
        value={inputs.solarRepowerFraction} onChange={set('solarRepowerFraction')} />
      <SliderInput label="Solar O&M ($/kWdc/yr)" min={0} max={30} step={0.5}
        value={inputs.solarOmPerKwdcYear} onChange={set('solarOmPerKwdcYear')} />

      <h3>Storage</h3>
      <SliderInput label="Battery CAPEX ($/Wh)" min={0.05} max={0.50} step={0.005}
        value={inputs.batteryCostPerWh} onChange={set('batteryCostPerWh')} />
      <SliderInput label="PV→Battery efficiency (%)" min={90} max={100} step={0.1}
        value={inputs.pvToBatteryEffPct} onChange={set('pvToBatteryEffPct')} />
      <SliderInput label="Inverter efficiency (%)" min={90} max={100} step={0.01}
        value={inputs.inverterEffPct} onChange={set('inverterEffPct')} />
      <SliderInput label="DoD (%)" min={70} max={100} step={1}
        value={inputs.batteryDodPct} onChange={set('batteryDodPct')} />
      <SliderInput label="Battery degradation (%/yr)" min={0} max={5} step={0.1}
        value={inputs.batteryDegradationPct} onChange={set('batteryDegradationPct')} />
      <SliderInput label="Augmentation cycle (yrs)" min={3} max={20} step={1}
        value={inputs.batteryAugCycle} onChange={set('batteryAugCycle')} />
      <SliderInput label="Battery O&M ($/kWh/yr)" min={0} max={15} step={0.1}
        value={inputs.batteryOmPerKwhYear} onChange={set('batteryOmPerKwhYear')} />

      <h3>Grid + Inverter</h3>
      <SliderInput label="Grid ($/Wac)" min={0.01} max={0.30} step={0.005}
        value={inputs.gridCostPerWac} onChange={set('gridCostPerWac')} />
      <SliderInput label="Inverter ($/Wac)" min={0.01} max={0.20} step={0.002}
        value={inputs.inverterCostPerWac} onChange={set('inverterCostPerWac')} />
      <SliderInput label="Soft cost (%)" min={0} max={30} step={0.5}
        value={inputs.softCostPct} onChange={set('softCostPct')} />

      <h3>Finance</h3>
      <SliderInput label="WACC (%)" min={3} max={15} step={0.1}
        value={inputs.waccPct} onChange={set('waccPct')} />
      <SliderInput label="Project lifetime (yrs)" min={10} max={40} step={1}
        value={inputs.projectLifetime} onChange={set('projectLifetime')} />
      <SliderInput label="OPEX escalation (%/yr)" min={0} max={10} step={0.1}
        value={inputs.opexEscalationPct} onChange={set('opexEscalationPct')} />
      <SliderInput label="Solar cost decline (%/yr)" min={0} max={10} step={0.1}
        value={inputs.annualSolarCostDeclinePct} onChange={set('annualSolarCostDeclinePct')} />
      <SliderInput label="Battery cost decline (%/yr)" min={0} max={10} step={0.1}
        value={inputs.annualBatteryCostDeclinePct} onChange={set('annualBatteryCostDeclinePct')} />
    </div>
  )
}
