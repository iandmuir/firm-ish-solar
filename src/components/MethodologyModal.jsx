import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Modal overlay with the Firm(ish) methodology write-up. Dismiss via close
 * button, ESC key, or backdrop click. Scroll-locked body while open.
 */
export default function MethodologyModal({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal((
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Firm(ish) methodology"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 8, 20, 0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0b1628',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 10,
          maxWidth: 860,
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          color: '#e2e8f0',
          fontFamily: '"DM Sans", sans-serif',
          fontSize: 13.5,
          lineHeight: 1.55,
          padding: '24px 32px 32px',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close methodology"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8',
            borderRadius: 6,
            width: 28,
            height: 28,
            cursor: 'pointer',
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>

        <h2 style={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: 22,
          margin: '0 0 4px',
          letterSpacing: '-0.02em',
        }}>
          Methodology
        </h2>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8' }}>
          How Firm(ish) sizes and costs a solar + battery build.
        </p>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: '#64748b' }}>
          Built by{' '}
          <a
            href="https://iandmuir.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#7dd3fc', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
          >
            Ian Muir
          </a>
          , Head of Insights at{' '}
          <a
            href="https://www.catalyst-advisors.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#7dd3fc', fontWeight: 600, textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
          >
            Catalyst Energy Advisors
          </a>
          .
        </p>

        <div style={{
          background: 'rgba(125, 211, 252, 0.06)',
          border: '1px solid rgba(125, 211, 252, 0.25)',
          borderRadius: 8,
          padding: '12px 14px',
          margin: '0 0 8px',
          fontSize: 12.5,
          lineHeight: 1.55,
        }}>
          <div style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 11,
            fontWeight: 600,
            color: '#7dd3fc',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 4,
          }}>
            Inspired by Ember
          </div>
          This tool is inspired by <b>Ember's</b> analysis{' '}
          <a
            href="https://ember-energy.org/latest-insights/solar-electricity-every-hour-of-every-day-is-here-and-it-changes-everything/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#7dd3fc', textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
          >
            <i>Solar electricity every hour of every day is here and it changes everything</i>
          </a>
          {' '}— specifically their framing of "firm(ish)" capacity, their use of
          hourly irradiance data, and their decomposition of the efficiency chain
          and cost stack. Firm(ish) adds a multi-year stochastic weather solve,
          a user-tunable firmness threshold, and forward LCOE projection.
        </div>

        <div style={{
          background: 'rgba(234, 179, 8, 0.06)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          borderRadius: 8,
          padding: '12px 14px',
          marginTop: 8,
          fontSize: 12.5,
          lineHeight: 1.55,
        }}>
          <div style={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 11,
            fontWeight: 600,
            color: '#fde68a',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 4,
          }}>
            Disclaimer
          </div>
          The default inputs here lean toward best-case or near-best-case
          assumptions, particularly on installed costs, reflecting what's
          achievable in the most mature, low-friction markets. In
          higher-friction contexts (higher labor costs, significant risk
          premia, permitting and interconnection delays, supply-chain premiums,
          etc.), real-world numbers can land meaningfully above these defaults
          and LCOE will be higher. This tool is designed for users
          to override the defaults with their own assumptions for a specific
          geographic and commercial context.
        </div>

        <Section title="Purpose">
          <p>
            Firm(ish) solves for the least-cost utility-scale solar + battery build that meets
            a round-the-clock capacity target for a user-specified fraction of hours across
            19 years of historical weather data. The remaining hours are covered by a user-priced
            backup power source.
          </p>
        </Section>

        <Section title="Weather data">
          <ul>
            <li><b>Source:</b> PVGIS (European Commission Joint Research Centre), SARAH-3 satellite-derived irradiance.</li>
            <li><b>Years:</b> 2005–2023 (19 calendar years).</li>
            <li><b>Resolution:</b> Hourly, per location. Fixed-tilt at optimum angle assumed.</li>
            <li><b>Coverage:</b> Global, ~5 km spatial resolution.</li>
          </ul>
        </Section>

        <Section title="Sizing solver">
          <p>For each firmness threshold in {'{70, 80, 85, 90, 95, 97, 98, 99}'} %:</p>
          <ol>
            <li><b>Outer sweep</b> — 15 log-spaced solar sizes from 3× to 12× the firm capacity target (MW).</li>
            <li><b>Inner bisection</b> — at each solar size, bisect over battery capacity (8 to 72× firm MW·hours) to find the minimum battery that clears the firmness threshold across all 19 years.</li>
            <li>Pick the (solar, battery) pair with the lowest combined CAPEX. Points where the firmness target is not achievable even at maximum battery are returned as infeasible.</li>
          </ol>
          <p>
            Because hourly dispatch is monotone in both solar and battery capacity, the bisection
            is well-posed and converges quickly.
          </p>
        </Section>

        <Section title="Dispatch simulation">
          <p>
            Hour-by-hour across all 19 years, without resetting battery state of charge across
            year boundaries:
          </p>
          <ol>
            <li><b>Direct PV → Grid.</b> PV strings feed field-side DC-DC optimizers onto a regulated DC bus, then through the central DC-AC inverter. The lesser of (PV output × DC-DC × DC-AC efficiency) and the firm target is delivered to grid.</li>
            <li><b>Surplus PV → Battery.</b> Remaining DC-side PV pays the DC-DC loss to reach the bus, then pays a one-way chemical loss (√RTE) as it's converted into stored energy in the cells. Further surplus is curtailed.</li>
            <li><b>Battery → Grid.</b> If direct PV falls short of the firm target, the battery — already sitting on the regulated bus — pays the other √RTE chemical leg as stored energy leaves the cells, then the DC-AC inverter on the way to grid (no additional DC-DC hit).</li>
            <li><b>Unmet.</b> Any residual shortfall is tallied as unmet energy and priced at the user-set backup cost.</li>
          </ol>
          <p>
            Solar capacity degrades continuously year-over-year at the user-set rate —
            there is no repowering reset. The battery also degrades year-over-year, but
            augmentation events restore usable capacity to year-1 levels at each cycle.
            Inverter skids are replaced on their own cycle as a CAPEX event (no dispatch
            effect). Events scheduled within 3 years of project end are skipped.
          </p>
        </Section>

        <Section title="Efficiency chain">
          <p>
            Standard utility-scale central-inverter topology breaks down at the extreme
            overbuild ratios this tool targets (8–10× the AC cap is routine for high
            firmness). At those ratios, developers move to <b>PV-centric DC coupling</b>:
            hundreds of field-side DC-DC optimizers (e.g. Ampt, Alencon SPOT) perform MPPT
            locally and feed a tightly regulated common DC bus. The battery then sits
            directly on that bus, and a single (much smaller) DC-AC inverter sips off the
            top. Consequence: every PV electron pays the DC-DC loss to reach the bus,
            while the battery — already on the bus — only pays DC-AC on the way to grid.
          </p>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 12.5,
            marginTop: 8,
          }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '6px 8px', fontWeight: 600 }}>Path</th>
                <th style={{ padding: '6px 8px', fontWeight: 600 }}>Composition</th>
                <th style={{ padding: '6px 8px', fontWeight: 600 }}>Default</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '6px 8px' }}>PV → Battery (stored)</td>
                <td style={{ padding: '6px 8px' }}>DC-DC × √RTE</td>
                <td style={{ padding: '6px 8px' }}>98.2% × 97.47% ≈ 95.72%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '6px 8px' }}>PV → Grid</td>
                <td style={{ padding: '6px 8px' }}>DC-DC × DC-AC</td>
                <td style={{ padding: '6px 8px' }}>98.2% × 98% = 96.24%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '6px 8px' }}>Battery → Grid</td>
                <td style={{ padding: '6px 8px' }}>√RTE × DC-AC</td>
                <td style={{ padding: '6px 8px' }}>97.47% × 98% ≈ 95.52%</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 8px' }}>PV → Battery → Grid (round-trip)</td>
                <td style={{ padding: '6px 8px' }}>DC-DC × RTE × DC-AC</td>
                <td style={{ padding: '6px 8px' }}>98.2% × 95% × 98% ≈ 91.44%</td>
              </tr>
            </tbody>
          </table>

          <div style={{
            marginTop: 14,
            fontSize: 12,
            color: '#cbd5e1',
            borderLeft: '2px solid rgba(125, 211, 252, 0.4)',
            paddingLeft: 12,
            lineHeight: 1.55,
          }}>
            <div style={{
              fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 10.5,
              fontWeight: 600,
              color: '#7dd3fc',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}>
              Footnote — round-trip efficiency & architecture
            </div>
            <p style={{ margin: '4px 0' }}>
              While Firm(ish) draws heavy inspiration from the Ember report, our
              power-electronics efficiency model intentionally diverges from Ember's
              94.4% round-trip assumption.
            </p>
            <p style={{ margin: '4px 0' }}>
              Standard utility-scale plants (with low overbuild ratios) use a central
              inverter that holds the DC bus rigid, requiring a <b>bi-directional DC-DC
              converter</b> to manage the battery's fluctuating voltage. That produces a
              "double penalty" where electrons pay a DC-DC loss on both charge and
              discharge — Ember's 94.4% figure.
            </p>
            <p style={{ margin: '4px 0' }}>
              But standard central-inverter topology breaks down at the extreme DC
              overbuild ratios (8×–10×) targeted by this tool. At those scales,
              developers use <b>PV-centric DC coupling</b>: field-side string optimizers
              (e.g. Ampt, Alencon) actively float the common bus voltage to match the
              battery's current state of charge. Because the solar array dynamically
              adapts to the battery, the battery connects directly to the DC bus with no
              bi-directional DC-DC stage of its own.
            </p>
            <p style={{ margin: '4px 0' }}>
              Consequently, electrons pay the <b>98.2% DC-DC loss</b> to reach the bus
              from the solar panels, but stored energy only pays the <b>98.0% DC-AC
              loss</b> to reach the grid — yielding a power-electronics round-trip
              efficiency of <b>96.24%</b>.
            </p>
            <p style={{ margin: '4px 0' }}>
              Separately, the lithium-ion cells themselves lose energy as heat during
              charge and discharge. This <b>chemical round-trip efficiency</b> (default
              <b> 95%</b>) is split symmetrically — √RTE ≈ 97.47% per leg — and applied
              independently of the silicon losses above. Combining the two yields a true
              full-path round-trip of <b>98.2% × 95% × 98% ≈ 91.44%</b>: closer to
              Ember's 94.4% headline than the silicon-only number alone suggests, but
              arrived at through a very different architectural decomposition.
            </p>
          </div>
        </Section>

        <Section title="Cost model">
          <ul>
            <li><b>CAPEX.</b> Solar ($/Wdc × solar MW), battery ($/kWh × battery MWh), inverter ($/Wac × firm MW), grid interconnect ($/Wac × firm MW). Paid up-front in year 0.</li>
            <li><b>Fixed O&amp;M.</b> Solar ($/kWdc/yr) and battery ($/kWh/yr) costs escalate at the user-set OPEX escalation rate and are discounted at the WACC.</li>
            <li><b>Inverter replacement.</b> At each cycle (default 15 years), pay a fraction of the inverter turnkey cost (default 100%) to swap the skids. Future pricing declines at the annual solar cost decline rate.</li>
            <li><b>Augmentation (battery).</b> At each cycle (default 8 years), add enough new cells to restore year-1 usable capacity, priced at that year's projected battery cost.</li>
            <li><b>Backup.</b> Unmet MWh × backup cost, escalated with OPEX escalation, discounted at WACC.</li>
          </ul>
        </Section>

        <Section title="LCOE">
          <p style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 12.5,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 12px',
            borderRadius: 6,
            margin: '6px 0 10px',
          }}>
            LCOE = (PV of all costs over project lifetime) / (PV of delivered energy)
          </p>
          <p>
            The <b>RE-system LCOE</b> counts only the solar + storage system costs and the
            energy it delivers. The <b>blended LCOE</b> folds unmet-energy backup cost into
            the numerator so the two builds are compared on equal 24/7 terms.
          </p>
        </Section>

        <Section title="Forward cost projection">
          <p>
            Solar and battery CAPEX are projected forward at user-set annual decline rates
            over a 10-year horizon. Each future year is re-solved from scratch against the
            declined CAPEX inputs to produce the Forward LCOE Projection curve. Inverter
            replacement and augmentation events within each scenario also use the
            projected future pricing in the year they occur.
          </p>
        </Section>

        <Section title="References">
          <ul>
            <li>
              <b>Ember</b> —{' '}
              <a
                href="https://ember-energy.org/latest-insights/solar-electricity-every-hour-of-every-day-is-here-and-it-changes-everything/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#7dd3fc', textDecoration: 'none' }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline' }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none' }}
              >
                <i>Solar electricity every hour of every day is here and it changes everything</i>
              </a>
              {' '}(June 2025). Methodological inspiration for firm renewables
              analysis, efficiency-chain decomposition, and the 2024–25 cost
              benchmarks for inverter and grid interconnection.
            </li>
            <li>
              <b>PVGIS</b> — European Commission Joint Research Centre, SARAH-3 hourly
              irradiance (2005–2023).
            </li>
            <li>
              <b>Dufo-López et al. (2024)</b> — Optimising Grid-Connected PV-Battery
              Systems for Energy Arbitrage and Frequency Containment Reserve.{' '}
              <i>Batteries</i>, 10(12), 427. DC-DC conversion losses for PV-to-battery
              charging.
            </li>
            <li>
              <b>Sungrow Power Supply Co., Ltd. (2024)</b> — SG1100UD-20 Datasheet –
              PV Inverter for 1500 Vdc System, Version 13. DC-AC inverter efficiency.
            </li>
            <li>
              <b>Lazard LCOE</b> — conventional-plant comparison benchmarks.
            </li>
          </ul>
        </Section>

        <style>{`
          .methodology-section h3 {
            font-family: "Space Grotesk", sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: #7dd3fc;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin: 22px 0 8px;
          }
          .methodology-section p { margin: 6px 0; }
          .methodology-section ul, .methodology-section ol { margin: 6px 0 6px 22px; padding: 0; }
          .methodology-section li { margin: 3px 0; }
          .methodology-section b { color: #e2e8f0; font-weight: 600; }
        `}</style>
      </div>
    </div>
  ), document.body)
}

function Section({ title, children }) {
  return (
    <div className="methodology-section">
      <h3>{title}</h3>
      {children}
    </div>
  )
}
