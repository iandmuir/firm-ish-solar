# Firm Solar+Storage LCOE Calculator — Claude Code Build Instructions

## Project Overview

Build a single-page web tool that calculates the Levelized Cost of Energy (LCOE) for firm solar+storage power systems. "Firm" means dispatchable 24/7 — the system must generate a guaranteed minimum amount of power every day using a combination of solar panels and battery storage.

The tool's purpose is to demonstrate that as solar and battery costs decline, firm renewable power is approaching (or has reached) cost parity with traditional baseload generation (gas, coal, nuclear). This is a utility-scale tool, not a rooftop or mini-grid calculator.

### Target Users
Energy analysts, developers, investors, and policymakers who want a quick but credible estimate of firm solar+storage costs without running a full Homer simulation.

---

## Tech Stack

- **Framework**: React (with Vite for build tooling)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Hosting**: GitHub Pages (static site — no backend)
- **Solar data**: Embedded static dataset (CSV/JSON, provided by user — see below)
- **No backend, no API calls, no database**

The entire app runs client-side. All data is embedded in the build.

---

## Solar Resource Data

The user will provide a CSV/XLS file with one row per country containing:
- **Column A**: ISO-3 country code (e.g., KEN, ZAF, IND)
- **Columns B–M**: Average daily practical potential (kWh/kWp/day) for each month (January–December)

**Critical**: This data already accounts for year-1 system losses (soiling, mismatch, wiring, etc.), so do NOT apply a separate performance ratio. The values can be treated as equivalent to "usable peak sun hours per day for an installed kWp."

Convert this file to a JSON object keyed by ISO-3 code at build time or embed it directly. Example structure:

```json
{
  "KEN": { "name": "Kenya", "monthly": [5.2, 5.5, 5.3, 4.8, 4.3, 3.9, 3.7, 4.0, 4.8, 5.0, 4.9, 5.1] },
  "ZAF": { "name": "South Africa", "monthly": [6.1, 5.8, 5.2, 4.3, 3.5, 3.0, 3.2, 3.8, 4.5, 5.2, 5.8, 6.2] }
}
```

You will need a mapping from ISO-3 codes to readable country names. Use a standard library or embed a small lookup.

---

## UI Layout

Single-page, reactive layout. No multi-step wizard.

### Structure

```
┌──────────────────────────────────────────────────────────────┐
│  HEADER: Tool title + brief description                      │
├────────────────────────┬─────────────────────────────────────┤
│                        │                                     │
│   INPUT PANEL          │   RESULTS PANEL                     │
│   (left, ~40%)         │   (right, ~60%)                     │
│                        │                                     │
│   Section 1: Site &    │   - Headline LCOE (large number)    │
│     Target             │   - Cost waterfall/breakdown chart  │
│   Section 2: Solar     │   - Monthly generation profile      │
│     Asset              │   - Augmentation schedule timeline  │
│   Section 3: Storage   │   - Comparison with conventional    │
│     Asset              │   - Forward projection chart        │
│   Section 4: Project   │   - System sizing summary           │
│     Finance (Advanced) │                                     │
│   Section 5: Market    │                                     │
│     Comparison (Adv.)  │                                     │
│   Forward Projection   │                                     │
│     Assumptions        │                                     │
│                        │                                     │
└────────────────────────┴─────────────────────────────────────┘
```

On mobile, stack vertically: inputs on top, results below.

### Design Direction

This is a professional analytical tool. The aesthetic should be **clean, data-dense, and editorial** — think energy industry white paper or Bloomberg terminal, not a consumer SaaS product. Use:
- A dark or deep navy background with high-contrast data elements
- A distinctive sans-serif display font (not Inter/Roboto/Arial) paired with a clean body font
- Accent color for key outputs (LCOE number, cost-parity crossing point)
- Generous use of whitespace within the results panel
- Subtle grid lines and muted chart colors that let the data speak

---

## Input Panel — Detailed Specification

All inputs should have sensible **global defaults** pre-populated so the user sees a working result on page load. Every change to any input should trigger an **immediate recalculation** of all outputs.

### Section 1: Site & Target

**Country Selector**
- Searchable dropdown populated from the embedded dataset. Default: a prominent solar country (e.g., India or South Africa).
- On selection, display the monthly solar profile for that country as a small sparkline or mini bar chart in the input panel.
- Show the **worst month** value highlighted (this is the binding constraint).

**Firm Generation Target**
- Let the user choose EITHER:
  - **Firm capacity (MW)**: e.g., "I want a 50 MW firm plant" — meaning 50 MW delivered 24/7
  - **Daily energy (MWh/day)**: e.g., "I want 1,200 MWh/day guaranteed"
- Provide a toggle to switch between these two modes. When one is set, auto-calculate and display the other (firm MW × 24h = MWh/day).
- Default: 100 MW firm capacity

### Section 2: Solar Asset

- **Turnkey Installed Solar Cost ($/Wdc)**: Slider, range 0.20–2.00, default 0.50, step 0.01
  - Tooltip: "Fully installed EPC cost per watt DC, including modules, racking, inverters, wiring, and installation labor."
- **Annual Degradation (%)**: Slider, range 0.0–1.5, default 0.5, step 0.1
  - Tooltip: "Annual reduction in solar panel output. Typical crystalline silicon panels degrade ~0.5%/year."
- **Solar Augmentation Cycle (Years)**: Slider, range 5–25, default 12, step 1
  - Tooltip: "How often new solar panels are added to restore the array to its original Year 1 capacity. Augmentation events within 3 years of project end are skipped."
- **Fixed O&M ($/kWdc/year)**: Slider, range 5–30, default 10, step 1
  - Tooltip: "Annual operations & maintenance cost per kW of installed solar DC capacity. Covers cleaning, monitoring, vegetation management, and component repairs."

### Section 3: Storage Asset

- **Turnkey Installed Storage Cost ($/kWh)**: Slider, range 50–500, default 200, step 5
  - Tooltip: "Fully installed EPC cost per kWh of battery nameplate capacity, including cells, battery management system, thermal management, enclosures, and installation."
- **Round-Trip Efficiency (%)**: Slider, range 70–95, default 88, step 1
  - Tooltip: "Percentage of energy recovered from storage relative to energy put in. Accounts for charging and discharging losses."
- **Depth of Discharge (%)**: Slider, range 50–100, default 90, step 1
  - Tooltip: "Usable fraction of battery nameplate capacity. Limiting DoD extends battery life."
- **Annual Degradation (%)**: Slider, range 0–5, default 2, step 0.5
  - Tooltip: "Annual reduction in battery usable capacity due to cycling and calendar aging."
- **Battery Augmentation Cycle (Years)**: Slider, range 3–20, default 8, step 1
  - Tooltip: "How often new battery cells are added to restore storage to its original Year 1 capacity. Augmentation events within 3 years of project end are skipped."
- **Fixed O&M ($/kWh-nameplate/year)**: Slider, range 2–20, default 5, step 1
  - Tooltip: "Annual operations & maintenance cost per kWh of installed battery nameplate capacity. Covers monitoring, thermal management, and cell balancing."

### Section 4: Project Finance (Advanced — collapsed by default)

- **Discount Rate / WACC (%)**: Slider, range 2–20, default 8, step 0.5
  - Tooltip: "Weighted average cost of capital. Reflects the blended cost of debt and equity financing for the project."
- **Project Lifetime (Years)**: Slider, range 15–35, default 25, step 1
  - Tooltip: "Total operational life of the project for LCOE calculation."

### Section 5: Market Comparison (Advanced — collapsed by default)

- **Conventional Benchmark ($/kWh)**: Slider, range 0.02–0.30, default 0.07, step 0.005
- **Benchmark Source**: Dropdown — presets for "Gas CCGT", "Coal", "Nuclear", "Diesel", "Custom" each with a suggested default LCOE:
  - Gas CCGT: $0.07/kWh
  - Coal: $0.085/kWh
  - Nuclear: $0.07/kWh
  - Diesel: $0.15/kWh
  - Custom: user sets value
- When a preset is selected, auto-fill the benchmark slider but allow the user to override it.

### Forward Projection Assumptions (always visible)

- **Annual solar cost decline**: Slider, %/year, range 0–15, default 5, step 0.5
- **Annual battery cost decline**: Slider, %/year, range 0–20, default 8, step 0.5
- **Projection horizon**: Fixed at 10 years
- These assumptions drive the forward projection chart AND determine the cost of augmentation CAPEX within any scenario (see calculation engine below).

---

## Calculation Engine — Detailed Specification

### Step 1: Identify Worst Month
From the country's 12 monthly values (kWh/kWp/day), find the minimum. Call this `worst_month_yield`. This is the binding constraint for system sizing.

### Step 2: Derive Solar Generation Profile and Storage Requirement

The key insight: we know total daily yield but need to figure out what portion of 24hr demand solar serves directly vs. what must be stored.

**Simplified approach for v1**:
- Assume solar generation follows a symmetrical profile over daylight hours. Use a simplified model: assume effective generation occurs over a window roughly equal to `worst_month_yield / peak_capacity_factor` hours, where peak_capacity_factor ≈ 0.75 (i.e., if yield is 4.5 kWh/kWp/day, effective generation window ≈ 6 hours).
- **However, for simplicity in v1**, use this approximation:
  - Solar directly serves load during generation hours
  - Battery serves load during non-generation hours
  - **Direct solar fraction** = (effective sun hours) / 24
  - **Battery fraction** = 1 - direct solar fraction
  - This determines the required battery capacity in hours of storage

### Step 3: Build Augmentation Schedules

Before sizing the system, compute the augmentation schedule for each asset independently. Extract this into a reusable pure function.

**Augmentation schedule function** (inputs: augmentation_cycle, project_lifetime, end_of_life_buffer=3):

```
function buildAugmentationSchedule(cycle, lifetime, buffer=3):
    augmentation_years = []
    year = cycle
    while year < lifetime:
        if (lifetime - year) >= buffer:
            augmentation_years.append(year)
        year += cycle

    # Calculate intervals between events (including start-to-first and last-to-end)
    intervals = []
    prev = 0
    for aug_year in augmentation_years:
        intervals.append(aug_year - prev)
        prev = aug_year
    intervals.append(lifetime - prev)  # final stretch to end of life

    max_degradation_interval = max(intervals)

    return {
        augmentation_years,    # e.g., [8, 16, 24]
        intervals,             # e.g., [8, 8, 8, 1]  (for 25yr life, 8yr cycle)
        max_degradation_interval  # e.g., 8
    }
```

Compute separately:
```
solar_schedule = buildAugmentationSchedule(solar_augmentation_cycle, project_lifetime)
battery_schedule = buildAugmentationSchedule(battery_augmentation_cycle, project_lifetime)
```

### Step 4: Size the Solar Array

Size the array so that even at the end of its longest degradation interval, output in the worst month still meets demand:

```
daily_firm_demand = firm_capacity_MW × 24  (MWh/day)

# Account for battery round-trip losses on the stored portion
effective_daily_demand = (direct_solar_fraction × daily_firm_demand) +
                         (battery_fraction × daily_firm_demand / battery_rte)

# Base solar capacity needed if there were no degradation
base_solar_capacity_kWp = (effective_daily_demand × 1000) / worst_month_yield

# Oversize to account for maximum degradation interval
solar_deg_factor = (1 - solar_degradation_pct / 100) ^ solar_schedule.max_degradation_interval
required_solar_capacity_kWp = base_solar_capacity_kWp / solar_deg_factor

required_solar_capacity_MW = required_solar_capacity_kWp / 1000
```

### Step 5: Size the Battery

Same pattern — oversize so that at the end of the longest degradation interval, the battery still meets overnight demand:

```
# Energy the battery must deliver each night/non-sun period
battery_energy_delivered = battery_fraction × daily_firm_demand  (MWh)

# Account for depth of discharge
base_battery_nameplate = battery_energy_delivered / (battery_dod / 100)  (MWh)

# Oversize to account for maximum degradation interval
battery_deg_factor = (1 - battery_degradation_pct / 100) ^ battery_schedule.max_degradation_interval
required_battery_nameplate = base_battery_nameplate / battery_deg_factor  (MWh)
```

### Step 6: Calculate Initial Capital Costs

```
solar_capex = required_solar_capacity_MW × 1000 × 1000 × solar_cost_per_Wdc
  (convert MW → kW → W, multiply by $/Wdc)

battery_capex = required_battery_nameplate × 1000 × battery_cost_per_kWh
  (convert MWh → kWh, multiply by $/kWh)

total_initial_capex = solar_capex + battery_capex
```

Note: There is no separate BOS line item. The solar and battery costs are **turnkey EPC costs** that include all balance-of-system components.

### Step 7: Calculate Lifetime Costs (Year-by-Year Cash Flow with Augmentation)

Build a year-by-year cash flow over the project lifetime.

**O&M Calculation (every year) — anchored to installed physical capacity:**
```
annual_solar_om = required_solar_capacity_MW × 1000 × solar_om_per_kWdc_year
  (installed kWdc × $/kWdc/year)

annual_battery_om = required_battery_nameplate × 1000 × battery_om_per_kWh_year
  (installed kWh × $/kWh-nameplate/year)

annual_om = annual_solar_om + annual_battery_om
```

**Augmentation CAPEX — uses projected future costs, not Year 0 costs:**

At each augmentation year, calculate the cost to add enough new capacity to restore the system to its original Year 1 nameplate. The cost of new equipment at that future year is determined by applying the annual cost decline rates.

```
For each year in solar_schedule.augmentation_years:
  # How many years since last augmentation (or Year 0)?
  years_since_last = year - previous_solar_aug_year  (or year if first augmentation)

  # What fraction of original capacity has been lost?
  capacity_lost_fraction = 1 - (1 - solar_degradation_pct / 100) ^ years_since_last

  # What does solar cost at this future year?
  solar_cost_at_year = solar_cost_per_Wdc × (1 - annual_solar_cost_decline / 100) ^ year

  # CAPEX to restore lost capacity
  solar_aug_capex = capacity_lost_fraction × required_solar_capacity_MW × 1000 × 1000 × solar_cost_at_year

For each year in battery_schedule.augmentation_years:
  years_since_last = year - previous_battery_aug_year  (or year if first augmentation)

  capacity_lost_fraction = 1 - (1 - battery_degradation_pct / 100) ^ years_since_last

  battery_cost_at_year = battery_cost_per_kWh × (1 - annual_battery_cost_decline / 100) ^ year

  battery_aug_capex = capacity_lost_fraction × required_battery_nameplate × 1000 × battery_cost_at_year
```

**Full year-by-year cash flow:**
```
total_discounted_costs = 0

For each year (1 to project_lifetime):
  costs_this_year = annual_om

  if year in solar_schedule.augmentation_years:
      costs_this_year += solar_aug_capex_for_this_year

  if year in battery_schedule.augmentation_years:
      costs_this_year += battery_aug_capex_for_this_year

  total_discounted_costs += costs_this_year / (1 + wacc) ^ year

total_lifetime_cost = total_initial_capex + total_discounted_costs
```

### Step 8: Calculate Lifetime Energy Production

Since the system is designed (via initial oversizing and periodic augmentation) to always meet its firm capacity rating, the plant delivers its rated output every hour of every year:

```
total_discounted_energy = 0

For each year (1 to project_lifetime):
  annual_energy = firm_capacity_MW × 8760  (MWh)
  total_discounted_energy += annual_energy / (1 + wacc) ^ year
```

### Step 9: Calculate LCOE

```
LCOE = total_lifetime_cost / total_discounted_energy  ($/MWh)

Also express as $/kWh (divide by 1000) for comparison with conventional sources.
```

### Step 10: Forward Projection

For each year in the 10-year projection horizon (years 0–10):
- Calculate what solar and battery costs would be if the plant were built in that future year:
  - `future_solar_cost = solar_cost_per_Wdc × (1 - annual_solar_cost_decline/100) ^ projection_year`
  - `future_battery_cost = battery_cost_per_kWh × (1 - annual_battery_cost_decline/100) ^ projection_year`
- Re-run the full LCOE calculation (Steps 1–9) with these future costs as the **starting** costs
- **Important**: Augmentation costs within each projected scenario also use these reduced starting costs, declining further from there. If the projection is "what if I built this plant in Year 5," then Year 5's costs become the new baseline, and augmentation costs decline further from that baseline using the same annual decline rates.
- Store the resulting LCOE for that projection year

---

## Results Panel — Detailed Specification

### 1. Headline LCOE
- Large, prominent number: e.g., **$0.072/kWh** or **$72/MWh**
- Show both $/kWh and $/MWh
- Color-coded: green if below comparison LCOE, amber if within 20%, red if above

### 2. System Sizing Summary
- Required solar array: XXX MW (and ratio to firm capacity, e.g., "3.2× overbuild")
- Required battery storage: XXX MWh (and hours of storage equivalent)
- Total initial CAPEX: $XXX million
- Show a compact breakdown: Solar $XX M | Battery $XX M

### 3. Cost Breakdown Chart
- Stacked bar or waterfall chart showing LCOE composition:
  - Solar initial CAPEX contribution to LCOE
  - Battery initial CAPEX contribution to LCOE
  - Solar augmentation CAPEX (total NPV over lifetime)
  - Battery augmentation CAPEX (total NPV over lifetime)
  - Solar O&M (total NPV over lifetime)
  - Battery O&M (total NPV over lifetime)
- Draw a horizontal reference line at the conventional benchmark LCOE, labeled with the selected source (e.g., "Gas CCGT: $0.07/kWh")
- This lets users see which component dominates cost and how the total compares to conventional

### 4. Monthly Generation Profile
- Small bar chart showing the 12 monthly kWh/kWp/day values for the selected country
- Highlight the worst month (the binding constraint) in a different color
- Annotate it: "System sized to this month"

### 5. Augmentation Schedule Timeline
- Simple timeline or Gantt-style visual showing:
  - Solar augmentation events (e.g., at years 12, 24) with their CAPEX amounts
  - Battery augmentation events (e.g., at years 8, 16, 24) with their CAPEX amounts
  - Skipped events (those within 3 years of end of life) shown as greyed-out or dashed
  - Project lifetime span clearly shown
- This gives the user a clear picture of lifetime capital deployment

### 6. Forward Projection Chart
- Line chart, x-axis = years from now (0–10), y-axis = LCOE ($/kWh)
- Line 1: Projected firm solar+storage LCOE declining over time
- Line 2: Horizontal line for conventional benchmark LCOE
- If/where the lines cross, highlight the crossover point with an annotation: "Cost parity in Year X"
- This is the money chart for the tool's core argument

---

## State Management

Use React state (useState/useReducer). All inputs live in a single state object. The calculation engine is a pure function: `calculateResults(inputs) → results`. Recalculate on every input change. The calculation is lightweight enough that debouncing should not be necessary.

---

## File Structure

```
/src
  /components
    Header.jsx
    InputPanel.jsx
    ResultsPanel.jsx
    SliderInput.jsx              # Reusable slider+label+value component
    CountrySelector.jsx
    CostBreakdownChart.jsx
    MonthlyProfileChart.jsx
    ForwardProjectionChart.jsx
    AugmentationTimeline.jsx     # Augmentation schedule visualization
    SystemSummary.jsx
    ComparisonIndicator.jsx
  /data
    solar-data.json               # Embedded country solar resource data
    country-names.json            # ISO-3 to country name mapping
    conventional-defaults.json    # Default LCOE values for gas/coal/nuclear/diesel
  /engine
    calculate.js                  # Pure calculation engine — all math lives here
    augmentation.js               # Augmentation schedule builder (used by calculate.js)
    constants.js                  # Default values for all inputs
  App.jsx
  main.jsx
  index.css                       # Tailwind + custom styles
/public
  index.html
vite.config.js
tailwind.config.js
package.json
```

---

## Key Implementation Notes

1. **Pre-populated on load**: The app should render with all defaults filled in and a complete result showing. The user's first experience is seeing a working calculation, not a blank form.

2. **Slider component**: Build a reusable `SliderInput` component that takes: label, unit, min, max, step, value, onChange, and optionally a tooltip/info icon with explanatory text. Every slider should show its current value in an editable number input beside it so users can type exact values.

3. **Responsive**: Two-column on desktop (≥1024px), single column stacked on mobile.

4. **No API calls**: Everything is client-side. The solar data is embedded in the bundle.

5. **Formatting**: Use sensible number formatting throughout — commas for thousands, 2–3 decimal places for LCOE, round MW/MWh to 1 decimal.

6. **Tooltips/Info**: Add small info icons (?) next to non-obvious inputs (WACC, DoD, round-trip efficiency, augmentation cycles) with brief explanations on hover or click.

7. **URL state (nice to have)**: Encode input state in URL query parameters so users can share specific scenarios via link. Low priority for v1 but architecturally easy if state is centralized.

8. **Augmentation engine**: Extract the augmentation schedule logic into its own module (`augmentation.js`). It should be a pure function: given (degradation rate, augmentation cycle, project lifetime, 3-year end-of-life buffer), return the array of augmentation years, the intervals between them, and the maximum degradation interval. This function is used for both solar and battery independently.

9. **Cost projection consistency**: The annual cost decline rates serve double duty — they drive the Forward Projection chart AND determine the cost of augmentation CAPEX within any given scenario. This must be handled consistently. The `calculate.js` engine should accept the decline rates as inputs and use them both for augmentation costing and for the forward projection loop.

---

## What the User Will Provide

Before starting the build, you need from the user:
1. **The solar resource CSV/XLS file** — to convert to the embedded JSON dataset
2. **Confirmation of the country list** — whether it covers all countries or a subset

Everything else (defaults, calculation logic, UI) is specified above.

---

## Testing the Build

After building, verify:
- [ ] Page loads with defaults and shows a complete result
- [ ] Changing country updates the monthly profile and recalculates everything
- [ ] Changing any slider immediately updates all results
- [ ] Solar augmentation schedule is correctly computed (e.g., 25yr life, 12yr cycle → augments at 12 and 24; but 14yr cycle with 25yr life → augment at 14, skip 28 because >lifetime, and skip anything within 3yr of end)
- [ ] Battery augmentation schedule is correctly computed (e.g., 25yr life, 8yr cycle → augments at 8, 16, 24; skip anything within 3yr of end)
- [ ] 3-year end-of-life buffer correctly skips late augmentations (e.g., 25yr life, 12yr cycle: year 24 IS included because 25-24=1 < 3... wait, that should be SKIPPED. Verify: augmentation at year 24 with 25yr life means only 1 year remaining, which is < 3, so it IS skipped)
- [ ] Augmentation CAPEX uses projected future costs, not Year 0 costs
- [ ] O&M is based on installed solar kWdc and battery kWh-nameplate, NOT on firm capacity
- [ ] Forward projection shows declining LCOE curve
- [ ] Forward projection scenarios correctly compound cost declines for augmentation within each scenario
- [ ] Comparison line appears correctly on both the breakdown and projection charts
- [ ] Mobile layout stacks correctly
- [ ] MW ↔ MWh/day toggle works and values are consistent
- [ ] Worst month is correctly identified and highlighted
- [ ] LCOE is in a plausible range (roughly $0.04–0.20/kWh for reasonable inputs)
- [ ] No BOS line item appears anywhere in the UI or calculations
- [ ] Augmentation timeline visualization correctly shows scheduled and skipped events with CAPEX amounts
- [ ] Cost breakdown chart shows 6 components: solar CAPEX, battery CAPEX, solar augmentation, battery augmentation, solar O&M, battery O&M
