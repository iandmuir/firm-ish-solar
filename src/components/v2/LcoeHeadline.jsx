import React from 'react'

export default function LcoeHeadline({ systemLcoe, blendedLcoe, solarMW, batteryMWh, firmMW }) {
  return (
    <div className="lcoe-headline">
      <div className="lcoe-main">
        <div className="lcoe-label">Blended LCOE</div>
        <div className="lcoe-number">${blendedLcoe.toFixed(0)}<span className="lcoe-unit">/MWh</span></div>
        <div className="lcoe-system">System-only: ${systemLcoe.toFixed(0)}/MWh</div>
      </div>
      <div className="sizing">
        <div>{solarMW.toFixed(0)} MW solar</div>
        <div>{batteryMWh.toFixed(0)} MWh battery</div>
        <div className="firm">for {firmMW} MW firm</div>
      </div>
      <style>{`
        .lcoe-headline { display: flex; justify-content: space-between; gap: 24px; padding: 16px; }
        .lcoe-label { font-size: 0.85rem; color: rgba(255,255,255,0.6); }
        .lcoe-number { font-size: 2.5rem; font-weight: 700; color: #7dd3fc; line-height: 1; }
        .lcoe-unit { font-size: 1rem; color: rgba(255,255,255,0.6); margin-left: 4px; }
        .lcoe-system { font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-top: 4px; }
        .sizing { text-align: right; display: flex; flex-direction: column; gap: 2px; }
        .firm { font-size: 0.8rem; color: rgba(255,255,255,0.5); }
      `}</style>
    </div>
  )
}
