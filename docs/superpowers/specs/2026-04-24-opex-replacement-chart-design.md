# OPEX & Replacement chart — annual spend over project life

## Problem

The `Replacement & Augmentation Schedule` card shows two horizontal event timelines with dollar labels at each replacement/augmentation spike. It does its narrow job (when do the big lumps land?) but it ignores the smooth ongoing OPEX streams entirely — solar O&M, battery O&M, and backup power are invisible. A user can't see "what's my actual cashflow shape over 25 years?" from this card.

## Goal

Replace the event-dot timeline with a year-by-year stacked bar chart of *all* recurring and event-driven cost streams, so the cashflow shape is legible at a glance and the replacement spikes read in proportion to the OPEX baseline they sit on.

## Non-goals

- No revenue/income side. This is cost-out only.
- No present-value view. The LCOE Breakdown card already serves the discounted-NPV story; this chart is the nominal-cashflow companion.
- No interactivity beyond hover tooltip (no zoom, no toggleable series).

## User-facing change

Card title: **OPEX & Replacement**
Subtitle: *Annual nominal spend over project life*

Inside the card: a Recharts stacked `<BarChart>` — one bar per project year (1 through `projectLifetime`, default 25), with five stacked series. Color palette matches the LCOE Breakdown card so the two views read as a paired set.

## Series

Stack order, bottom → top, with bottom-most being the most stable visual baseline:

| Series | Color | Group |
|---|---|---|
| Backup power | `#fcd34d` (amber-300) | OPEX |
| Solar O&M | `#fbbf24` (amber-400) | OPEX |
| Battery O&M | `#f59e0b` (amber-500) | OPEX |
| Inverter replacement | `#60a5fa` (blue-400) | REINVEST |
| Battery augmentation | `#3b82f6` (blue-500) | REINVEST |

OPEX ambers sit below REINVEST blues. Backup power is the bottom layer because the rate is fixed input and it acts as the stable baseline — even though the per-year *amount* still varies with the cycled weather year and escalation.

## Per-year computation

For year `y ∈ [1, projectLifetime]`, with `esc = opexEscalationPct/100`:

```js
backup        = unmetByYear[(y-1) % dispatchYears] * backupCostPerMWh * (1+esc)^(y-1)
solarOm       = annualOm.solar  * (1+esc)^(y-1)
batteryOm     = annualOm.battery * (1+esc)^(y-1)
inverterRepl  = inverterReplacementEvents.find(e => e.year === y)?.capex ?? 0
batteryAug    = batteryAugEvents.find(e => e.year === y)?.capex ?? 0
total         = sum of the five
```

All inputs are already on `current.costs` (`annualOm`, `inverterReplacementEvents`, `batteryAugEvents`) or on `current.dispatch` (`unmetByYear`) or on the input set (`backupCostPerMWh`, `opexEscalationPct`, `projectLifetime`). No engine changes required — pure transform inside the component.

## Axes

- **X-axis:** project year. Ticks every 5 years (1, 5, 10, 15, 20, 25 for default 25-year life). Label: `Project year`.
- **Y-axis:** dollars. Smart-formatted by magnitude: `$X.XK` below $1M, `$X.XM` ≥ $1M. Label: `Annual spend`.

## Tooltip

On hover over a bar, show the year and a stacked breakdown:

```
Year 8
─────────────────────
Battery aug.       $4.2M
Inverter repl.     —
Battery O&M        $0.6M
Solar O&M          $1.1M
Backup power       $1.4M
─────────────────────
Total              $7.3M
```

Order matches the visual stack (top of stack at top of tooltip), with `—` for any zero series so reading the row order is consistent across years.

## Legend

Five chips at the top of the chart, matching the LCOE Breakdown legend pattern (small color dot + label). Order matches the stack: top-of-stack first, so the legend reads in the same visual order as the bars.

## Component shape

New file: `src/components/v2/OpexReplacementChart.jsx`

```jsx
<OpexReplacementChart
  projectLifetime={number}
  costs={current.costs}            // for annualOm, replacement/aug events
  unmetByYear={current.dispatch.unmetByYear}
  backupCostPerMWh={number}
  opexEscalationPct={number}
/>
```

`AugmentationTimeline.jsx` is **removed** (no other callers — verified via grep). Its `inverterSkipped` / `batterySkipped` "skipped within 3yr of end" dashed dots are dropped; in the new chart, skipped events are simply absent, which is honest and readable.

## ResultsPanelV2 wiring

```jsx
<Card title="OPEX & Replacement" subtitle="Annual nominal spend over project life">
  <OpexReplacementChart
    projectLifetime={projectLifetime}
    costs={current.costs}
    unmetByYear={current.dispatch.unmetByYear}
    backupCostPerMWh={backupCostPerMWh}
    opexEscalationPct={opexEscalationPct}
  />
</Card>
```

`opexEscalationPct` and `backupCostPerMWh` need to be passed down from the parent. `backupCostPerMWh` is already a `ResultsPanelV2` prop; `opexEscalationPct` will need to be added to the prop list (it's already in the inputs object upstream).

The `skippedYears` helper and the `inverterReplacementCycle` / `batteryAugCycle` props on `ResultsPanelV2` become unused with this change and get removed.

## Edge cases

| Condition | Behavior |
|---|---|
| `projectLifetime` very long (40+) | Bars get thinner; ticks remain every 5 years. Recharts handles auto-spacing. |
| Zero unmet hours (perfect firmness) | Backup layer is 0 every year, bar starts at solar O&M. No special-casing needed. |
| No replacement events scheduled | Top blue layers are 0 every year. Chart still renders the OPEX ramp cleanly. |
| `dispatchYears < projectLifetime` | Existing cycling behavior in costing.js is preserved: `(y-1) % dispatchYears`. |

## Defaults / styling

- Bar gap: tight (Recharts `barCategoryGap="10%"`).
- Tooltip background: `#0f172a`, 1px border `rgba(255,255,255,0.1)` — matches existing chart tooltips.
- Y-axis grid: same dashed style as other v2 charts.
- Card height: matches the prior `AugmentationTimeline` card visual weight (~180px chart area).

## Testing notes (informal)

- Pure derivation — no engine changes — so no test churn in `dispatch.test.js` etc.
- Visual: pick a default scenario; confirm OPEX ramp is gentle, replacement spikes appear at the configured cycle years, and stacking order reads (amber bottom, blue top).
- Confirm at lifetime = 30 with backup at $200/MWh, OPEX escalation at 2.5%, the year-30 backup bar exceeds year-1 by `(1.025)^29 ≈ 2.05×`.
