# Shortfall hotspots overlay on Daily Solar Resource chart

## Problem

The "Daily Solar Resource — Typical Year" chart sits prominently directly under the headline panel, but its information value is mostly weather context — median solar yield + P10–P90 spread, no system performance data. The visual prominence is disproportionate to the payoff, and a user reviewing results scrolls past it without learning anything actionable.

## Goal

Layer output-linked information onto the chart so its prominence is justified: flag the calendar weeks where this design's firmness most often falls short, aggregated across all weather years.

## Non-goals

- No full monthly firmness overlay across the whole year (too noisy, dilutes the resource curve).
- No per-year drill-down (the chart is "typical year" — output is also a typical-year signal).
- No reframing of the chart's primary purpose; resource curve stays the headline visual.

## User-facing change

Card title gains a small second-line subtitle:

```
Daily Solar Resource — Typical Year
3 worst weeks · 64% of unmet hours
```

Inside the chart:
- **Three semi-transparent red vertical bands** at the worst 7-day windows (fill `rgba(239,68,68,0.13)`, no border, behind the resource curve).
- **Numbered chips** (`①` `②` `③`) anchored to the top of each band.
- **Tooltip enhancement**: hovering a date inside a band appends a window callout to the date label.

If the system meets firmness perfectly (or near-perfectly), the chart looks identical to today — bands, chips, and subtitle are all suppressed.

## Pareto metric

Anchored on **unmet hours** (count, not MWh) so the percentage stays consistent with the firmness % shown in the headline panel.

```
paretoPct = (unmet hours inside top-N windows) / (total unmet hours across all calendar days) × 100
```

Per-window severity (used in tooltip):

```
window.paretoPct = (window.unmetHours / totalUnmetHours) × 100
```

## Window-selection algorithm

Given `unmetHoursByDoy[365]` (sum across weather years of hours where shortfall occurred on that calendar day):

1. Compute `windowUnmet[d] = sum(unmetHoursByDoy[d..d+6])` for `d ∈ [0, 358]`.
2. Pick `argmax(windowUnmet)` → window 1.
3. Mask out indices `[d − 6 .. d + 6]` (inclusive) so subsequent picks can't overlap.
4. Repeat for window 2, window 3.
5. Return windows sorted ascending by `startDoy` so chips read ① ② ③ left-to-right by calendar order, not severity.

No calendar wraparound: a Dec→Jan event splits cleanly into two features. This is honest.

## Engine plumbing

### `src/engine/dispatch.js`
Add `unmetHoursByDoy[365]` array, populated inside the existing per-hour loop.
- New per-hour computation: `calendarDay = (h / 24) | 0`. Map to non-leap day-of-year (Feb 29 in leap years skips bucketing — consistent with `solar-resource.js`).
- Increment `unmetHoursByDoy[doy]` whenever `deliveredAc < firmW − FIRM_MET_EPS_W` (the inverse of the existing `metHours` gate).
- Returned in the result object alongside `unmetByMonth`, `firmnessByYear`, etc.

### `src/engine/calculate-v2.js`
Propagate `unmetHoursByDoy` through `results.current.dispatch` (same pattern as the existing `firmnessByYear`).

### `src/engine/hotspots.js` (new)
Pure transform — no engine internals.

```js
findHotspots(unmetHoursByDoy, { n = 3, windowDays = 7 }) → {
  windows: [{ startDoy, endDoy, unmetHours, paretoPct }],
  paretoPct,            // aggregate across all windows
  totalUnmetHours,
}
```

## UI changes

### `src/components/v2/ResultsPanelV2.jsx`
Extend `Card` with optional `subtitle` prop. Subtitle renders below the existing card title at 13px, `rgba(255,255,255,0.55)`, no uppercase, no letter-spacing — visually quiet pull-quote.

Compute hotspots and pass to `SolarResourceChart`:
```jsx
const hotspots = useMemo(
  () => findHotspots(current.dispatch.unmetHoursByDoy),
  [current.dispatch.unmetHoursByDoy]
)
```

### `src/components/v2/SolarResourceChart.jsx`
Accept `hotspots` prop. For each window, render a Recharts `<ReferenceArea>` with `x1=startDoy`, `x2=endDoy`, fill `rgba(239,68,68,0.13)`, plus a `label` for the numbered chip.

Augment `Tooltip.labelFormatter` to detect when the hovered DoY falls inside a hotspot window and append a window callout.

## Edge cases

| Condition | Behavior |
| --- | --- |
| `totalUnmetHours == 0` | No bands, no chips, no subtitle. Chart looks identical to today. |
| `totalUnmetHours < 12` (~½ day across 19 years) | Same as above — treat as noise floor. |
| Pareto < 25% (shortfall too uniform to call out) | Still render bands + subtitle. The diluted concentration is informative in itself ("not a hotspot problem; uniform shortfall"). |
| Fewer than `N` distinct hotspots possible (extremely rare; `unmetHoursByDoy` has < N non-zero entries) | Render however many are available. |

## Defaults

| Parameter | Value | Rationale |
| --- | --- | --- |
| `N` | 3 | Top 3 typically captures 50–70% of unmet hours; more adds clutter, less doesn't tell a story. |
| `windowDays` | 7 | Matches the physics — extended low-irradiance stretches drain SoC over many days. |
| `minSeparation` | 7 | No overlap between windows. |
| Band fill | `rgba(239,68,68,0.13)` | Red 500 at 13% — visible but doesn't dominate. |
| Chip text | `#ef4444` | Same red, full saturation. |
| Chip background | `rgba(239,68,68,0.18)` | Slightly stronger than band so chip reads as anchor. |
| Subtitle copy | `N worst weeks · X% of unmet hours` | Mid-dot separator matches the LcoeHeadline pattern. |

## Testing notes (informal)

- Existing `dispatch.test.js` should still pass unchanged. The new `unmetHoursByDoy` field is purely additive.
- `findHotspots` is a pure function — easy to add a small smoke test verifying ordering and non-overlap if desired.
- Visual: pick a marginal-firmness site (e.g., a high-latitude European city with the default 95% threshold) and confirm 3 bands cluster around the expected dim-season weeks.
