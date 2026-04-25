# Benchmark crossover detection on Forward LCOE Projection

## Problem

The Forward LCOE Projection chart shows three lines: RE-System LCOE, Blended LCOE, and an escalating benchmark (e.g. Gas CCGT–LNG). When the LCOE lines decline (cost-decline rates) and the benchmark rises (escalation), they cross — and the year of crossover is the most actionable thing on the chart. The user has to eyeball the intersection today; the answer is buried.

## Goal

Detect each crossover point and surface it twice: as a small dot on the chart at the exact year, and as a green inline note in the Blended LCOE headline box (when applicable).

## Non-goals

- No frame-status modulation. The headline status frame (green/amber/red) reflects *today's* economics; future-parity is an additive signal, not a status override.
- No "doesn't reach parity" callout. Silence on no-crossover is more honest — extrapolating beyond the 10-year window invites overinterpretation.
- No "already at parity today" callout. The green frame and the existing comparison indicator already carry this.
- No construction-start-year input parameter (mentioned in the original feedback as a separate idea — out of scope for this spec).

## User-facing change

### On the chart

Up to two small filled dots, one per LCOE line that crosses below the benchmark within the projection window:
- **Position:** at `(yearsFromNow, lcoeAtCrossover)` — the LCOE value at the crossover year, which equals the benchmark value at that year by definition.
- **Visual:** 4px radius, line color (`#7dd3fc` cyan for RE-System, `#fbbf24` amber for Blended), 1.5px white stroke.
- **Label:** `4.3 yr` in 10px monospace, positioned just above the dot.

### In the headline panel

When the Blended LCOE crosses below the benchmark within the window, a small green note appears inside the Blended LCOE box, immediately below the existing `<ComparisonIndicator>`:

```
↓ Beats Gas CCGT–LNG in 6.7 yr
```

Style: 12px, `#4ade80` (green-400), 6px top margin. Stays silent when no Blended crossover exists.

## Crossover utility

New file: `src/engine/crossover.js`

```js
findBenchmarkCrossovers(curve, benchmarkLcoe, benchmarkEscalationPct) → {
  system:  { yearsFromNow: number, lcoeAtCrossover: number } | null,
  blended: { yearsFromNow: number, lcoeAtCrossover: number } | null,
}
```

**Algorithm (per line):**

1. If `benchmarkLcoe` is nullish, return `{ system: null, blended: null }`.
2. Walk consecutive curve points `(y_i, lcoe_i)` and `(y_{i+1}, lcoe_{i+1})`.
3. At each point, the benchmark is `benchmarkLcoe × (1 + esc)^y`.
4. Compute `delta_i = lcoe_i − benchmark_i` and `delta_{i+1} = lcoe_{i+1} − benchmark_{i+1}`.
5. **Skip the line entirely if `delta_0 ≤ 0`** (already at or below parity at year 0). Returns `null` for that line — handled by the green frame elsewhere.
6. Otherwise, find the first segment where `delta_i > 0` and `delta_{i+1} ≤ 0`. Linear-interpolate the crossover:

   ```
   t = delta_i / (delta_i − delta_{i+1})        // fraction along the segment
   yearsFromNow = y_i + t × (y_{i+1} − y_i)
   lcoeAtCrossover = lcoe_i + t × (lcoe_{i+1} − lcoe_i)
   ```

7. Return that crossover, or `null` if no segment flips sign within the window.

**Inputs the curve must carry:** `projectionYear`, `systemLcoePerMWh`, `blendedLcoePerMWh`. All already present on `results.projectionCurve` from `projectForward()` in `costing.js`.

## UI changes

### `src/components/v2/ProjectionChartV2.jsx`
- Accept new prop `crossovers: { system, blended }`.
- Compute crossovers internally is also fine, but passing them in keeps the component simple and lets the headline reuse the same values without recomputing.
- Render up to two `<ReferenceDot>` elements with year-label children.

### `src/components/v2/LcoeHeadline.jsx`
- Accept new prop `blendedCrossoverYears: number | null`.
- When non-null and `benchmarkSource` is present, render the green inline note below `<ComparisonIndicator>`.

### `src/components/v2/ResultsPanelV2.jsx`
- Compute crossovers once from `projectionCurve` + benchmark inputs.
- Pass to both the chart (full object) and the headline (just `blended.yearsFromNow`).

## Display formatting

- `yearsFromNow` displayed to 1 decimal place. Sub-year precision matches the linear-interpolation accuracy and reads as a real estimate (`4.3 yr` not `4 yr`).
- Year label glyph for chart dot: just the number plus `yr` (e.g. `4.3 yr`). No emoji or arrow on the chart — the dot itself is the marker.
- Headline note prefix: `↓` (Unicode down-arrow) — reinforces the "drops below" semantics in the absence of color-blind-safe redundancy on the green-only state.

## Edge cases

| Condition | Behavior |
|---|---|
| `benchmarkLcoe` not provided | No dots, no headline note. Whole feature silent. |
| Line starts ≤ benchmark at year 0 | That line is silent — return `null`. The headline status frame already conveys "already winning". |
| Line never crosses within projection window | That line is silent — return `null`. |
| Only RE-System crosses, not Blended | Chart shows the cyan dot; headline note suppressed. |
| Both cross | Both dots on chart; only Blended note in headline. |
| Benchmark escalation = 0 and LCOE flat | No crossover. Returns null cleanly (no division-by-zero). |
| Both `delta_i = 0` exactly | Edge case: treat as not-yet-crossed; skip and look at next segment. |

## Testing notes (informal)

- Pure utility — easy to add a smoke test:
  - Curve descending from $200 to $80, benchmark flat at $140 → blended crosses at year ~2.4.
  - Curve starting below benchmark → returns null.
  - Curve never reaching benchmark → returns null.
- Visual: pick a marginal-LCOE site at default settings; confirm cyan dot appears for RE-System within 10 yr but blended doesn't (typical with backup costs keeping blended elevated).
