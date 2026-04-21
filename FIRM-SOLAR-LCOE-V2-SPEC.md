# Firm(ish) Solar+Storage LCOE — v2 Design Spec

**Status:** design spec, pre-implementation. Supersedes `FIRM-SOLAR-LCOE-TOOL-INSTRUCTIONS.md` as the authoritative design for v2.

---

## 1. What v2 changes vs. v1

v1 uses country-level monthly solar averages and a worst-month heuristic to size a system that is always 100% firm. v2 replaces this with location-specific hourly dispatch simulation over multi-year historical data, plus a user-controlled firmness threshold that turns the binary "firm / not firm" into a continuous economic tradeoff.

**Changes:**

| # | v1 | v2 |
|---|---|---|
| 1 | Country-level monthly averages (Solargis) | City-level hourly data (PVGIS seriescalc 2005–2023) |
| 2 | Worst-month heuristic sizing | Hourly dispatch simulation, bisection solver |
| 3 | Implicit 100% firm | User-set firmness threshold (e.g. 95%) |
| 4 | Generic 88% round-trip efficiency | DC-coupled: PV→Grid 96.24%, PV→Batt 98.2%, Batt→Grid 96.24% |
| 5 | 2-part CAPEX (solar + battery) | 4-part CAPEX: solar, battery, grid connection, inverter + soft-cost markup |
| 6 | Flat O&M | Escalating O&M (2.5%/yr default) |
| 7 | Single LCOE output | System LCOE + blended LCOE (system + priced-backup for the unfirm tail) |

**Kept from v1:**

- Solar repowering schedule (% of turnkey at future cost)
- Battery augmentation schedule (partial capacity replenish at future cost)
- Forward projection chart with declining solar + battery costs
- Conventional benchmark comparison

---

## 2. Data pipeline

### 2.1 Source

PVGIS v5.3 non-interactive API: `https://re.jrc.ec.europa.eu/api/v5_3/seriescalc`

Parameters:
- `lat`, `lon` per city
- `pvcalculation=1`, `peakpower=1`, `loss=0` (we apply losses downstream)
- `optimalangles=1`, `mountingplace=free`
- `startyear=2005`, `endyear=2023`
- `outputformat=json`

No auth. Rate limit 30 calls/sec/IP. A full build of ~180 cities runs in under a minute.

### 2.2 Build-time preprocessing

Node script `scripts/fetch-pvgis.mjs` iterates the city list, fetches raw JSON, extracts the `P` (W output per kWp installed) hourly series across 2005–2023, and writes a compact per-city file:

```
src/data/pvgis/<ISO3>-<slug>.json
```

Format (scaled int16 for compactness):

```json
{
  "name": "Jaipur",
  "country": "IND",
  "lat": 26.91, "lon": 75.79, "elevation": 431,
  "startYear": 2005, "endYear": 2023,
  "hoursPerYear": [8760, 8760, 8784, ...],
  "scale": 0.1,
  "hourly": [0, 0, 0, 125, 450, ...]
}
```

Size: ~166,000 hourly values × 2 bytes = 332 KB raw, ~100 KB gzipped per city. Lazy-loaded on city selection.

### 2.3 City list

Launch: one city per country (~180 cities). Prefer solar-relevant site (e.g. Jaipur over Delhi for India). Curated in `src/data/cities.json`:

```json
[{"iso3": "IND", "city": "Jaipur", "lat": 26.91, "lon": 75.79}, ...]
```

Later: add secondary cities per country.

---

## 3. Inputs (UI)

### 3.1 Site & Target

- **City selector** — searchable dropdown grouped by country. Default: Jaipur.
- **Firm generation target (MW)** — slider 10–2000, default 100.
- **Firmness threshold (%)** — NEW. Slider 70–100, default 95, step 0.5.
  - Tooltip: *"Percentage of hours the system meets the firm delivery target on its own. The shortfall is priced at the backup cost below."*
- **Backup energy cost ($/MWh)** — NEW. Slider 50–500, default 150.
  - Tooltip: *"Cost per MWh of grid or peaker energy that covers the unfirm tail. Drives blended LCOE."*

### 3.2 Solar Asset

- Turnkey installed solar cost ($/Wdc) — default **0.388** (Ember: modules + BoS + installation)
- Annual degradation (%) — default **0.5**
- Solar repowering cycle (years) — default 12
- Solar repowering fraction (%) — default 35
- Solar fixed O&M ($/kWdc/yr) — default **12.5** (Ember/Lazard)

### 3.3 Storage Asset

- Turnkey installed storage cost ($/kWh) — default **0.165** (i.e. $165/kWh) (Ember 2024)
- **PV→Battery efficiency (%)** — NEW, default **98.2** (DC-DC)
- **Inverter efficiency, both directions (%)** — NEW, default **96.24** (DC-DC × DC-AC). Applies to PV→Grid and Battery→Grid.
- Usable fraction / DoD (%) — default **90** (5% min SoC, 95% max)
- Battery degradation (%/yr) — default **2.6** (Ember)
- Battery augmentation cycle (yr) — default 8
- Battery fixed O&M ($/kWh-nameplate/yr) — default **5.9** (Ember/Lazard)

### 3.4 Grid & Inverter (NEW section)

- Grid connection cost ($/Wac-delivered) — default **0.076** ($76M/GW, Ember)
- Inverter cost ($/Wac-delivered) — default **0.048** ($48M/GW, Ember)
- Soft-cost markup (%) — default **10** (applied to sum of solar + battery + grid + inverter)

Both grid and inverter scale with **firm target** (delivery capacity), not with solar MW. This is the key modeling improvement: in a 3× oversized firm system, grid/inverter costs are not 3× higher.

### 3.5 Project Finance

- WACC (%) — default **7.7** (Lazard LCOE+)
- Project lifetime (yr) — default 25
- **OPEX escalation (%/yr)** — NEW, default 2.5
- **Discount backup cost at WACC** — implicit (same as system costs).

### 3.6 Market Comparison — unchanged from v1

### 3.7 Forward Projection — unchanged from v1

---

## 4. Calculation engine

### 4.1 Two-layer architecture (performance-critical)

**Layer 1 — Sizing** (expensive, ~0.5–2s):
Re-runs only when inputs affecting dispatch change: city, firm target, threshold, efficiencies, DoD, degradation, augmentation cycles, project lifetime.

**Layer 2 — Costing** (cheap, <1ms):
Re-runs on any cost/finance input change. Takes `(solarMW, batteryMWh, deliveredByYear[], unmetByYear[], excessByYear[])` from Layer 1 and returns LCOE, blended LCOE, cost breakdown, projection.

Separation makes slider drags on CAPEX/OPEX/WACC/projection inputs feel instant.

### 4.2 Hourly dispatch simulator (pure)

Takes hourly PV profile (W/kWp), solar MW, battery MWh, firm MW, efficiencies, DoD, degradation schedule (repower/augment years). Returns met-hours, delivered/unmet/excess per year.

Logic per hour:

1. PV output at the array (DC), after solar degradation: `pvDc = hourly[h] × solarKw × solarDegFactor`
2. Direct to grid via inverter, capped at firm target:  
   `directAc = min(pvDc × invEff, firmMW × 1000)`;  
   `pvRemainingDc = pvDc - directAc / invEff`
3. Charge battery from excess, subject to PV→Batt efficiency, battery usable capacity (times battery deg factor), and headroom to max SoC. Any DC not absorbed = curtailed.
4. If direct solar < firm target, discharge battery via inverter to close the gap, limited by SoC above min and battery→grid efficiency.
5. Update SoC; record delivered, unmet, excess.

Degradation resets at repower year (solar) / augment year (battery) to match v1's asset-replenish logic.

Per-hour cost: ~20 float ops. Across 19 × 8,760 ≈ 166,000 hours in a `Float32Array` tight loop: **~10 ms per full-sim**.

### 4.3 Multi-year handling

**Decision (locking in):** concatenate all years into one continuous sequence. SoC carries across year boundaries. This captures end-of-year / start-of-year transitions realistically. First-hour SoC = full (95%).

### 4.4 Sizing solver

The core optimization:

> Find `(solarMW, batteryMWh)` minimizing total CAPEX, subject to:  
> `metHours / totalHours ≥ threshold/100`

**Algorithm — monotone bisection on cost frontier:**

For a given `solarMW`, the minimum `batteryMWh` that meets the threshold is monotone decreasing in solar. So the cost-optimal frontier can be traced by a 1D sweep over solar with nested bisection on battery.

1. Outer: 15 solar points, log-spaced from 1.5× to 8× firm target.
2. Inner: for each solar, bisect battery in [0, 36 × firm MWh] to find min-battery meeting threshold (or declare infeasible).
3. For each feasible pair, compute initial CAPEX (Layer 2 first slice).
4. Pick min-cost pair. Optionally refine around winner with narrower bisection.

~15 outer × ~8 inner bisection steps × 10 ms dispatch = **~1.2 s worst case**. Debounce sizing inputs at 300 ms.

If this is too slow: offer a "Solver: fast (1D) / precise (2D)" toggle where fast mode fixes solar overbuild ratio (user-set) and only bisects battery.

### 4.5 Cost calculation (Layer 2)

```
solarCapex   = solarMW  × 1e6 × solarCostPerWdc
batteryCapex = batteryMWh × 1e3 × batteryCostPerKwh
gridCapex    = firmMW × 1e6 × gridCostPerWac
invCapex     = firmMW × 1e6 × invCostPerWac
subtotal     = solarCapex + batteryCapex + gridCapex + invCapex
initialCapex = subtotal × (1 + softCostPct/100)
```

Augmentation CAPEX inherits the same soft-cost markup.

O&M escalates: `opex(y) = opex(0) × (1 + escalation)^y`.

### 4.6 Blended LCOE

```
annualFirmTargetMWh = firmMW × 8760
annualUnmetMWh(y)   = max(0, annualFirmTargetMWh − deliveredByYear[y])
annualBackupCost(y) = unmetMWh(y) × backupCostPerMWh

NPV(system) = initialCapex + Σ (opex + aug + repower) / (1+WACC)^y
NPV(backup) = Σ annualBackupCost(y) / (1+WACC)^y
NPV(firmEnergy) = Σ annualFirmTargetMWh / (1+WACC)^y   [denominator uses FIRM target, not delivered]

systemLcoe  = NPV(system) / NPV(firmEnergy)         ($/MWh)
blendedLcoe = (NPV(system) + NPV(backup)) / NPV(firmEnergy)
```

Using firm-target in denominator (not delivered) keeps LCOE comparable across thresholds — otherwise a lower threshold with less delivery would show a misleadingly lower system LCOE.

### 4.7 Forward projection

Re-run Layer 2 only with future-year starting costs; **freeze sizing from Year 0**. Rationale: re-optimising sizing at each of 10 projection years would cost ~10s. The approximation is small because the relative solar/battery cost ratio shift across 10 years doesn't dramatically move the optimum; and the user's `(solarMW, batteryMWh)` is the key physical decision, not a per-year revisit.

If the user wants to see "if I build it in 2030, what's the optimum sizing?" we can add that as a separate deep-dive view later.

---

## 5. Results panel additions

Keep all v1 panels. Add:

1. **Firmness gauge** — headline: *"95% firm → 438 MWh/yr shortfall, $65K/yr backup cost"*.
2. **Blended LCOE** — shown alongside system LCOE, labeled *"inc. backup @ $150/MWh"*.
3. **Threshold sweep chart** — NEW. x-axis: firmness threshold (70–100%), y-axis: blended LCOE. Highlights user's chosen threshold and the cost-minimising threshold. **This is the new money chart** — shows the economic optimum.
4. **Residual load by month** — small histogram of annual unmet MWh by month of year. Reveals seasonal weakness (monsoon, winter).

---

## 6. File structure (planned)

```
/scripts
  fetch-pvgis.mjs            # Fetch + cache raw PVGIS JSON per city
  build-city-data.mjs        # Transform raw → compact per-city JSON
/src
  /data
    cities.json              # Curated lat/lon per city
    /pvgis/                  # One compact JSON per city (lazy-loaded)
    conventional-defaults.json
  /engine
    dispatch.js              # Pure hourly dispatch simulator
    solver.js                # 1D+bisect sizing solver
    costing.js               # Layer 2: CAPEX, OPEX, LCOE, projection
    augmentation.js          # (kept)
    calculate.js             # Orchestrator
    constants.js             # Updated defaults
  /components
    (v1 kept, new:)
    ThresholdSweepChart.jsx
    ResidualLoadByMonthChart.jsx
    FirmnessGauge.jsx
    CitySelector.jsx         # Replaces CountrySelector
```

---

## 7. Locked design decisions

1. **City list v0** — one city per country, the most populous city per country (~180 total). Curated via a world-cities dataset filter.
2. **Data format** — JSON with int16 scaling (scale = 0.1). Simpler, debuggable, ~100 KB/city gzipped.
3. **Solver** — 2D solver with threshold-sweep caching. When any non-threshold sizing input changes, pre-compute sizing at ~8 threshold points (e.g. 70, 80, 85, 90, 93, 95, 97, 99%) in one pass. The threshold slider then reads from the cached sweep curve for instant response. ~1.2s lag only on city/firm-MW/efficiency/degradation/lifetime changes.
4. **Degradation under hourly dispatch** — step function at year boundaries (not continuous hourly compounding). Resets at repower year (solar) / augment year (battery).
5. **Forward projection** — freeze `(solarMW, batteryMWh)` sizing from Year 0. Only costs change across the projection horizon. Runs Layer 2 only.
6. **Backup cost** — escalates at the OPEX escalation rate (default 2.5%/yr). User sets Year 0 value.
