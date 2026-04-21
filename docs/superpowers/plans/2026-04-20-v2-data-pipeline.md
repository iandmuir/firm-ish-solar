# V2 Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the static data artifacts (cities.json + per-city hourly PVGIS data) that Plan B's engine and Plan C's UI will consume. Produces ~180 cities, one per country (most populous), each with a compact JSON file of ~19 years × 8,760 hourly PV output values.

**Architecture:** Node scripts in `/scripts` produce JSON files committed to `/src/data/`. Runtime loader in `/src/data/loader.js` lazy-loads + decodes a city's hourly series into a `Float32Array`. No runtime API calls — all PVGIS fetching happens at build time.

**Tech Stack:** Node 20+, Vitest (unit tests), `adm-zip` (one-time GeoNames parsing), native `fetch`. No new runtime dependencies.

**Related spec:** `FIRM-SOLAR-LCOE-V2-SPEC.md` §2 (data pipeline) and §7 decisions 1, 2.

---

## File structure

```
/scripts
  build-city-list.mjs          # cities.json builder
  build-city-list.test.js
  fetch-pvgis.mjs              # PVGIS seriescalc fetcher with cache
  fetch-pvgis.test.js
  build-city-data.mjs          # Raw PVGIS JSON → compact int16 JSON
  build-city-data.test.js
  .cache/                      # gitignored; raw PVGIS responses
/src
  /data
    cities.json                # Generated: ~180 entries
    /pvgis/                    # Generated: one file per city
      IND-mumbai.json
      KEN-nairobi.json
      ...
    loader.js                  # Runtime decoder
    loader.test.js
vitest.config.js
```

---

## Task 1: Set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Modify: `.gitignore` (add `scripts/.cache/`)

- [ ] **Step 1: Install Vitest**

```bash
npm install --save-dev vitest@^1.6.0
```

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.{js,jsx}', 'scripts/**/*.test.{js,mjs}'],
  },
})
```

- [ ] **Step 3: Add test scripts to `package.json`**

Replace the `scripts` block in `package.json`:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest run",
  "test:watch": "vitest",
  "data:cities": "node scripts/build-city-list.mjs",
  "data:fetch": "node scripts/fetch-pvgis.mjs",
  "data:build": "node scripts/build-city-data.mjs",
  "data:all": "npm run data:cities && npm run data:fetch && npm run data:build"
}
```

- [ ] **Step 4: Update `.gitignore`**

Append to `.gitignore`:

```
scripts/.cache/
```

- [ ] **Step 5: Verify Vitest runs**

```bash
npm test
```
Expected: "No test files found matching your filter" (or similar) — exits with code 0 or 1, confirming Vitest is wired up.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js .gitignore
git commit -m "chore: set up Vitest and data-pipeline npm scripts"
```

---

## Task 2: City list builder — pure function

**Files:**
- Create: `scripts/build-city-list.mjs`
- Create: `scripts/build-city-list.test.js`

This task builds only the pure filter/sort/map logic and unit-tests it. Task 3 wires it to a real data source and produces the actual `cities.json`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/build-city-list.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { pickMostPopulousPerCountry, ISO2_TO_3 } from './build-city-list.mjs'

describe('pickMostPopulousPerCountry', () => {
  it('returns one entry per country', () => {
    const cities = [
      { iso2: 'IN', name: 'Mumbai',  lat: 19.07, lon: 72.87, pop: 20400000 },
      { iso2: 'IN', name: 'Delhi',   lat: 28.61, lon: 77.21, pop: 18500000 },
      { iso2: 'KE', name: 'Nairobi', lat: -1.28, lon: 36.82, pop:  4400000 },
    ]
    const out = pickMostPopulousPerCountry(cities)
    expect(out).toHaveLength(2)
  })

  it('picks the most populous city per country', () => {
    const cities = [
      { iso2: 'IN', name: 'Mumbai', lat: 19.07, lon: 72.87, pop: 20400000 },
      { iso2: 'IN', name: 'Delhi',  lat: 28.61, lon: 77.21, pop: 18500000 },
    ]
    const [pick] = pickMostPopulousPerCountry(cities)
    expect(pick.city).toBe('Mumbai')
  })

  it('converts ISO-2 to ISO-3 country codes', () => {
    const cities = [{ iso2: 'IN', name: 'Mumbai', lat: 19.07, lon: 72.87, pop: 20400000 }]
    const [pick] = pickMostPopulousPerCountry(cities)
    expect(pick.iso3).toBe('IND')
  })

  it('emits the expected shape', () => {
    const cities = [{ iso2: 'KE', name: 'Nairobi', lat: -1.28, lon: 36.82, pop: 4400000 }]
    const [pick] = pickMostPopulousPerCountry(cities)
    expect(pick).toEqual({
      iso3: 'KEN', city: 'Nairobi', lat: -1.28, lon: 36.82, pop: 4400000,
    })
  })

  it('skips entries with no ISO-3 mapping', () => {
    const cities = [
      { iso2: 'XX', name: 'Nowhere', lat: 0, lon: 0, pop: 1000 },
      { iso2: 'IN', name: 'Mumbai',  lat: 19.07, lon: 72.87, pop: 20400000 },
    ]
    const out = pickMostPopulousPerCountry(cities)
    expect(out).toHaveLength(1)
    expect(out[0].iso3).toBe('IND')
  })

  it('sorts output by ISO-3 code', () => {
    const cities = [
      { iso2: 'KE', name: 'Nairobi', lat: -1.28, lon: 36.82, pop:  4400000 },
      { iso2: 'IN', name: 'Mumbai',  lat: 19.07, lon: 72.87, pop: 20400000 },
    ]
    const out = pickMostPopulousPerCountry(cities)
    expect(out.map(c => c.iso3)).toEqual(['IND', 'KEN'])
  })
})

describe('ISO2_TO_3', () => {
  it('covers at least 200 countries', () => {
    expect(Object.keys(ISO2_TO_3).length).toBeGreaterThanOrEqual(200)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test -- scripts/build-city-list
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `build-city-list.mjs` (pure functions only)**

Create `scripts/build-city-list.mjs`:

```js
// ISO-3166-1 alpha-2 to alpha-3 mapping. Covers all 249 assigned codes.
// Source: Wikipedia / ISO 3166 (public data).
export const ISO2_TO_3 = {
  AD:'AND', AE:'ARE', AF:'AFG', AG:'ATG', AI:'AIA', AL:'ALB', AM:'ARM', AO:'AGO',
  AQ:'ATA', AR:'ARG', AS:'ASM', AT:'AUT', AU:'AUS', AW:'ABW', AX:'ALA', AZ:'AZE',
  BA:'BIH', BB:'BRB', BD:'BGD', BE:'BEL', BF:'BFA', BG:'BGR', BH:'BHR', BI:'BDI',
  BJ:'BEN', BL:'BLM', BM:'BMU', BN:'BRN', BO:'BOL', BQ:'BES', BR:'BRA', BS:'BHS',
  BT:'BTN', BV:'BVT', BW:'BWA', BY:'BLR', BZ:'BLZ', CA:'CAN', CC:'CCK', CD:'COD',
  CF:'CAF', CG:'COG', CH:'CHE', CI:'CIV', CK:'COK', CL:'CHL', CM:'CMR', CN:'CHN',
  CO:'COL', CR:'CRI', CU:'CUB', CV:'CPV', CW:'CUW', CX:'CXR', CY:'CYP', CZ:'CZE',
  DE:'DEU', DJ:'DJI', DK:'DNK', DM:'DMA', DO:'DOM', DZ:'DZA', EC:'ECU', EE:'EST',
  EG:'EGY', EH:'ESH', ER:'ERI', ES:'ESP', ET:'ETH', FI:'FIN', FJ:'FJI', FK:'FLK',
  FM:'FSM', FO:'FRO', FR:'FRA', GA:'GAB', GB:'GBR', GD:'GRD', GE:'GEO', GF:'GUF',
  GG:'GGY', GH:'GHA', GI:'GIB', GL:'GRL', GM:'GMB', GN:'GIN', GP:'GLP', GQ:'GNQ',
  GR:'GRC', GS:'SGS', GT:'GTM', GU:'GUM', GW:'GNB', GY:'GUY', HK:'HKG', HM:'HMD',
  HN:'HND', HR:'HRV', HT:'HTI', HU:'HUN', ID:'IDN', IE:'IRL', IL:'ISR', IM:'IMN',
  IN:'IND', IO:'IOT', IQ:'IRQ', IR:'IRN', IS:'ISL', IT:'ITA', JE:'JEY', JM:'JAM',
  JO:'JOR', JP:'JPN', KE:'KEN', KG:'KGZ', KH:'KHM', KI:'KIR', KM:'COM', KN:'KNA',
  KP:'PRK', KR:'KOR', KW:'KWT', KY:'CYM', KZ:'KAZ', LA:'LAO', LB:'LBN', LC:'LCA',
  LI:'LIE', LK:'LKA', LR:'LBR', LS:'LSO', LT:'LTU', LU:'LUX', LV:'LVA', LY:'LBY',
  MA:'MAR', MC:'MCO', MD:'MDA', ME:'MNE', MF:'MAF', MG:'MDG', MH:'MHL', MK:'MKD',
  ML:'MLI', MM:'MMR', MN:'MNG', MO:'MAC', MP:'MNP', MQ:'MTQ', MR:'MRT', MS:'MSR',
  MT:'MLT', MU:'MUS', MV:'MDV', MW:'MWI', MX:'MEX', MY:'MYS', MZ:'MOZ', NA:'NAM',
  NC:'NCL', NE:'NER', NF:'NFK', NG:'NGA', NI:'NIC', NL:'NLD', NO:'NOR', NP:'NPL',
  NR:'NRU', NU:'NIU', NZ:'NZL', OM:'OMN', PA:'PAN', PE:'PER', PF:'PYF', PG:'PNG',
  PH:'PHL', PK:'PAK', PL:'POL', PM:'SPM', PN:'PCN', PR:'PRI', PS:'PSE', PT:'PRT',
  PW:'PLW', PY:'PRY', QA:'QAT', RE:'REU', RO:'ROU', RS:'SRB', RU:'RUS', RW:'RWA',
  SA:'SAU', SB:'SLB', SC:'SYC', SD:'SDN', SE:'SWE', SG:'SGP', SH:'SHN', SI:'SVN',
  SJ:'SJM', SK:'SVK', SL:'SLE', SM:'SMR', SN:'SEN', SO:'SOM', SR:'SUR', SS:'SSD',
  ST:'STP', SV:'SLV', SX:'SXM', SY:'SYR', SZ:'SWZ', TC:'TCA', TD:'TCD', TF:'ATF',
  TG:'TGO', TH:'THA', TJ:'TJK', TK:'TKL', TL:'TLS', TM:'TKM', TN:'TUN', TO:'TON',
  TR:'TUR', TT:'TTO', TV:'TUV', TW:'TWN', TZ:'TZA', UA:'UKR', UG:'UGA', UM:'UMI',
  US:'USA', UY:'URY', UZ:'UZB', VA:'VAT', VC:'VCT', VE:'VEN', VG:'VGB', VI:'VIR',
  VN:'VNM', VU:'VUT', WF:'WLF', WS:'WSM', YE:'YEM', YT:'MYT', ZA:'ZAF', ZM:'ZMB',
  ZW:'ZWE',
}

/**
 * Given an array of city records `{ iso2, name, lat, lon, pop }`, return a
 * single entry per country — the most populous — mapped to final output shape.
 */
export function pickMostPopulousPerCountry(cities) {
  const byCountry = new Map()
  for (const c of cities) {
    const existing = byCountry.get(c.iso2)
    if (!existing || c.pop > existing.pop) byCountry.set(c.iso2, c)
  }
  return [...byCountry.values()]
    .map(c => ({
      iso3: ISO2_TO_3[c.iso2],
      city: c.name,
      lat: c.lat, lon: c.lon, pop: c.pop,
    }))
    .filter(c => c.iso3)
    .sort((a, b) => a.iso3.localeCompare(b.iso3))
}
```

- [ ] **Step 4: Verify tests pass**

```bash
npm test -- scripts/build-city-list
```
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-city-list.mjs scripts/build-city-list.test.js
git commit -m "feat(data): add pickMostPopulousPerCountry + ISO mapping"
```

---

## Task 3: Wire city-list builder to GeoNames + produce `cities.json`

**Files:**
- Modify: `scripts/build-city-list.mjs` (add main() that fetches + writes)
- Create: `src/data/cities.json` (generated, committed)

- [ ] **Step 1: Install `adm-zip`**

```bash
npm install --save-dev adm-zip@^0.5.0
```

- [ ] **Step 2: Extend `build-city-list.mjs` with a main() function**

Append to `scripts/build-city-list.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'

const GEONAMES_URL = 'http://download.geonames.org/export/dump/cities15000.zip'

/** Parse a tab-separated GeoNames cities file into city records. */
export function parseGeoNamesTsv(tsv) {
  const out = []
  for (const line of tsv.split('\n')) {
    if (!line) continue
    const f = line.split('\t')
    const pop = parseInt(f[14], 10)
    if (!pop) continue
    out.push({
      iso2: f[8],
      name: f[1],
      lat: parseFloat(f[4]),
      lon: parseFloat(f[5]),
      pop,
    })
  }
  return out
}

async function fetchGeoNames() {
  const res = await fetch(GEONAMES_URL)
  if (!res.ok) throw new Error(`GeoNames fetch failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const zip = new AdmZip(buf)
  return zip.readAsText('cities15000.txt')
}

async function main() {
  console.log('Fetching GeoNames cities15000...')
  const tsv = await fetchGeoNames()
  const raw = parseGeoNamesTsv(tsv)
  console.log(`Parsed ${raw.length} cities`)

  const picked = pickMostPopulousPerCountry(raw)
  console.log(`Picked ${picked.length} (one per country)`)

  const outPath = path.resolve('src/data/cities.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(picked, null, 2) + '\n')
  console.log(`Wrote ${outPath}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1) })
}
```

- [ ] **Step 3: Add test for the TSV parser**

Append to `scripts/build-city-list.test.js`:

```js
import { parseGeoNamesTsv } from './build-city-list.mjs'

describe('parseGeoNamesTsv', () => {
  it('parses a single line correctly', () => {
    const line = [
      '1275339',                  // geonameid
      'Mumbai',                   // name
      'Mumbai',                   // asciiname
      '',                         // alt names
      '19.07283', '72.88261',     // lat, lon
      'P', 'PPL',                 // feature class, code
      'IN', '',                   // country code, cc2
      '16', '', '', '',           // admin codes
      '12691836',                 // population
      '',                         // elevation
      '14', 'Asia/Kolkata',       // dem, timezone
      '2024-01-01',               // mod date
    ].join('\t')
    const [city] = parseGeoNamesTsv(line)
    expect(city).toEqual({
      iso2: 'IN', name: 'Mumbai', lat: 19.07283, lon: 72.88261, pop: 12691836,
    })
  })

  it('skips entries with no population', () => {
    const line = [
      '1', 'Nowhere', 'Nowhere', '',
      '0', '0', 'P', 'PPL', 'XX', '',
      '', '', '', '', '0', '', '', '', '',
    ].join('\t')
    expect(parseGeoNamesTsv(line)).toHaveLength(0)
  })
})
```

- [ ] **Step 4: Verify tests pass**

```bash
npm test -- scripts/build-city-list
```
Expected: PASS (9 tests).

- [ ] **Step 5: Generate `cities.json`**

```bash
npm run data:cities
```
Expected: console output like "Picked 200 (one per country)" and `src/data/cities.json` created.

- [ ] **Step 6: Manually inspect output**

```bash
node -e "const c = require('./src/data/cities.json'); console.log(c.length, c.slice(0,5), c.filter(x => x.iso3==='IND'))"
```
Expected: ~180–210 entries. India's pick should be Mumbai or Delhi (whichever GeoNames lists as most populous).

- [ ] **Step 7: Commit**

```bash
git add scripts/build-city-list.mjs scripts/build-city-list.test.js src/data/cities.json package.json package-lock.json
git commit -m "feat(data): generate cities.json from GeoNames"
```

---

## Task 4: PVGIS fetcher with disk cache

**Files:**
- Create: `scripts/fetch-pvgis.mjs`
- Create: `scripts/fetch-pvgis.test.js`

- [ ] **Step 1: Write failing tests for URL construction**

Create `scripts/fetch-pvgis.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { buildPvgisUrl } from './fetch-pvgis.mjs'

describe('buildPvgisUrl', () => {
  it('includes required params', () => {
    const url = buildPvgisUrl({ lat: -1.28, lon: 36.82 })
    expect(url).toContain('lat=-1.28')
    expect(url).toContain('lon=36.82')
    expect(url).toContain('pvcalculation=1')
    expect(url).toContain('peakpower=1')
    expect(url).toContain('loss=0')
    expect(url).toContain('optimalangles=1')
    expect(url).toContain('outputformat=json')
    expect(url).toContain('startyear=2005')
    expect(url).toContain('endyear=2023')
  })

  it('targets the seriescalc endpoint on v5_3', () => {
    const url = buildPvgisUrl({ lat: 0, lon: 0 })
    expect(url).toContain('re.jrc.ec.europa.eu/api/v5_3/seriescalc')
  })

  it('accepts custom year range', () => {
    const url = buildPvgisUrl({ lat: 0, lon: 0, startyear: 2010, endyear: 2020 })
    expect(url).toContain('startyear=2010')
    expect(url).toContain('endyear=2020')
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test -- scripts/fetch-pvgis
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `fetch-pvgis.mjs`**

Create `scripts/fetch-pvgis.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import cities from '../src/data/cities.json' with { type: 'json' }

const CACHE_DIR = path.resolve('scripts/.cache')
const PVGIS_BASE = 'https://re.jrc.ec.europa.eu/api/v5_3/seriescalc'

export function buildPvgisUrl({ lat, lon, startyear = 2005, endyear = 2023 }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    startyear: String(startyear),
    endyear: String(endyear),
    pvcalculation: '1',
    peakpower: '1',
    loss: '0',
    optimalangles: '1',
    mountingplace: 'free',
    outputformat: 'json',
    browser: '0',
  })
  return `${PVGIS_BASE}?${params}`
}

function cacheKey(city) {
  return `${city.iso3}-${city.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`
}

async function fetchOne(city) {
  const cachePath = path.join(CACHE_DIR, cacheKey(city))
  if (fs.existsSync(cachePath)) {
    return { city, cached: true }
  }
  const url = buildPvgisUrl({ lat: city.lat, lon: city.lon })
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${city.iso3}/${city.city} → ${res.status}: ${body.slice(0, 200)}`)
  }
  const json = await res.text()  // keep as text to preserve byte-for-byte
  fs.writeFileSync(cachePath, json)
  return { city, cached: false }
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  let done = 0, failed = 0
  const failures = []

  // Rate-limit: PVGIS allows 30 req/sec; we go slower (≈5 req/sec) to be polite.
  for (const city of cities) {
    try {
      const { cached } = await fetchOne(city)
      done++
      process.stdout.write(`\r[${done}/${cities.length}] ${city.iso3}/${city.city} ${cached ? '(cached)' : 'fetched'}          `)
      if (!cached) await new Promise(r => setTimeout(r, 200))
    } catch (e) {
      failed++
      failures.push({ city, error: e.message })
      process.stdout.write(`\n  FAIL ${city.iso3}/${city.city}: ${e.message}\n`)
    }
  }
  console.log(`\nDone. ${done} OK, ${failed} failed.`)
  if (failures.length) {
    fs.writeFileSync(
      path.join(CACHE_DIR, '_failures.json'),
      JSON.stringify(failures, null, 2),
    )
    console.log(`Failures logged to scripts/.cache/_failures.json`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1) })
}
```

- [ ] **Step 4: Verify tests pass**

```bash
npm test -- scripts/fetch-pvgis
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-pvgis.mjs scripts/fetch-pvgis.test.js
git commit -m "feat(data): PVGIS fetcher with disk cache"
```

---

## Task 5: Preprocessor — raw PVGIS JSON → compact int16 JSON

**Files:**
- Create: `scripts/build-city-data.mjs`
- Create: `scripts/build-city-data.test.js`

- [ ] **Step 1: Write failing tests**

Create `scripts/build-city-data.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { extractHourlyFromPvgis, encodeToInt16, decodeFromInt16 } from './build-city-data.mjs'

const MOCK_PVGIS = {
  inputs: {
    location: { latitude: -1.28, longitude: 36.82, elevation: 1670 },
    meteo_data: { year_min: 2005, year_max: 2006 },
  },
  outputs: {
    hourly: [
      { time: '20050101:0010', P: 0 },
      { time: '20050101:0110', P: 0 },
      { time: '20050101:1210', P: 456.7 },  // midday
      { time: '20060101:0010', P: 0 },
    ],
  },
}

describe('extractHourlyFromPvgis', () => {
  it('returns P values in order', () => {
    const { hourly } = extractHourlyFromPvgis(MOCK_PVGIS)
    expect(hourly).toEqual([0, 0, 456.7, 0])
  })

  it('preserves year range metadata', () => {
    const meta = extractHourlyFromPvgis(MOCK_PVGIS)
    expect(meta.startYear).toBe(2005)
    expect(meta.endYear).toBe(2006)
    expect(meta.lat).toBe(-1.28)
    expect(meta.lon).toBe(36.82)
  })

  it('counts hours per year', () => {
    const { hoursPerYear } = extractHourlyFromPvgis(MOCK_PVGIS)
    expect(hoursPerYear).toEqual([3, 1])  // 3 in 2005, 1 in 2006
  })
})

describe('encodeToInt16 / decodeFromInt16', () => {
  it('round-trips within 0.05 W tolerance at scale 0.1', () => {
    const values = [0, 10.3, 456.7, 999.9, 0.05]
    const encoded = encodeToInt16(values, 0.1)
    const decoded = decodeFromInt16(encoded, 0.1)
    for (let i = 0; i < values.length; i++) {
      expect(decoded[i]).toBeCloseTo(values[i], 1)
    }
  })

  it('clamps negative values to zero', () => {
    const encoded = encodeToInt16([-5, 10], 0.1)
    const decoded = decodeFromInt16(encoded, 0.1)
    expect(decoded[0]).toBe(0)
    expect(decoded[1]).toBeCloseTo(10, 1)
  })

  it('produces Int16Array', () => {
    const encoded = encodeToInt16([100], 0.1)
    expect(encoded).toBeInstanceOf(Int16Array)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test -- scripts/build-city-data
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `build-city-data.mjs`**

Create `scripts/build-city-data.mjs`:

```js
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import cities from '../src/data/cities.json' with { type: 'json' }

const CACHE_DIR = path.resolve('scripts/.cache')
const OUT_DIR = path.resolve('src/data/pvgis')
const SCALE = 0.1  // 1 int16 unit = 0.1 W/kWp; max ≈ 3276 W (plenty of headroom)

/**
 * Extract hourly P values + metadata from a raw PVGIS seriescalc response.
 * Returns { hourly: number[], hoursPerYear: number[], startYear, endYear, lat, lon, elevation }.
 */
export function extractHourlyFromPvgis(raw) {
  const hourly = raw.outputs.hourly.map(h => h.P)
  const hoursPerYear = []
  let prevYear = null
  let count = 0
  for (const h of raw.outputs.hourly) {
    const y = parseInt(h.time.slice(0, 4), 10)
    if (prevYear === null) prevYear = y
    if (y !== prevYear) {
      hoursPerYear.push(count)
      count = 0
      prevYear = y
    }
    count++
  }
  hoursPerYear.push(count)

  return {
    startYear: raw.inputs.meteo_data.year_min,
    endYear: raw.inputs.meteo_data.year_max,
    lat: raw.inputs.location.latitude,
    lon: raw.inputs.location.longitude,
    elevation: raw.inputs.location.elevation,
    hourly,
    hoursPerYear,
  }
}

/** Encode float array → Int16Array (clamped non-negative). */
export function encodeToInt16(values, scale) {
  const out = new Int16Array(values.length)
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    const clamped = v < 0 ? 0 : v
    out[i] = Math.round(clamped / scale)
  }
  return out
}

/** Decode Int16Array → Float32Array. */
export function decodeFromInt16(encoded, scale) {
  const out = new Float32Array(encoded.length)
  for (let i = 0; i < encoded.length; i++) out[i] = encoded[i] * scale
  return out
}

function outputFilename(city) {
  const slug = city.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${city.iso3}-${slug}.json`
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  let done = 0, skipped = 0

  for (const city of cities) {
    const cacheFile = path.join(CACHE_DIR, outputFilename(city))
    if (!fs.existsSync(cacheFile)) {
      skipped++
      continue
    }
    const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    const meta = extractHourlyFromPvgis(raw)
    const encoded = encodeToInt16(meta.hourly, SCALE)

    const out = {
      name: city.city,
      country: city.iso3,
      lat: meta.lat, lon: meta.lon, elevation: meta.elevation,
      startYear: meta.startYear, endYear: meta.endYear,
      hoursPerYear: meta.hoursPerYear,
      scale: SCALE,
      hourly: Array.from(encoded),  // JSON-serialisable
    }

    const outPath = path.join(OUT_DIR, outputFilename(city))
    fs.writeFileSync(outPath, JSON.stringify(out))
    done++
  }

  console.log(`Preprocessed ${done} cities (${skipped} skipped — no cache).`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1) })
}
```

- [ ] **Step 4: Verify tests pass**

```bash
npm test -- scripts/build-city-data
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/build-city-data.mjs scripts/build-city-data.test.js
git commit -m "feat(data): preprocess raw PVGIS into compact int16 JSON"
```

---

## Task 6: Execute the full data pipeline end-to-end

**Files:**
- Create (generated): `src/data/pvgis/*.json` (~180 files)
- Modify: `src/data/pvgis/.gitkeep` (to keep directory tracked even if empty initially)

- [ ] **Step 1: Fetch all PVGIS data**

```bash
npm run data:fetch
```
Expected: prints progress for each city. Takes ~5–10 minutes for ~180 cities at ~200ms pacing. Any failures are logged to `scripts/.cache/_failures.json` — continue past them for now.

Some locations will be outside PVGIS coverage (SARAH3: Europe/Africa/Asia; NSRDB: Americas 60°N–20°S). Note any failures; these cities will be flagged as "no data" in the UI.

- [ ] **Step 2: Review failures**

```bash
ls scripts/.cache/
cat scripts/.cache/_failures.json 2>/dev/null || echo "No failures"
```

If more than ~15 cities failed, investigate whether there's a systematic issue (wrong URL params, rate limiting). Otherwise acceptable — these are likely coverage-gap locations.

- [ ] **Step 3: Preprocess into compact JSONs**

```bash
npm run data:build
```
Expected: "Preprocessed N cities" output.

- [ ] **Step 4: Sanity-check a city output**

```bash
node -e "
const c = require('./src/data/pvgis/KEN-nairobi.json');
console.log('Country:', c.country, 'Name:', c.name);
console.log('Years:', c.startYear, '-', c.endYear);
console.log('Hours per year:', c.hoursPerYear.slice(0,3), '...');
console.log('Total hours:', c.hourly.length);
console.log('First 24 values (W/kWp × 10):', c.hourly.slice(0,24));
console.log('Expected ~166k hours over 19 years:', c.hoursPerYear.reduce((s,h) => s+h, 0));
"
```
Expected: ~166,000 total hours, roughly zero values at night and peak values in the few hundreds to ~1000 units (i.e. ~100 W/kWp after scaling) during midday.

- [ ] **Step 5: Check file sizes**

```bash
du -sh src/data/pvgis/ && ls src/data/pvgis/ | wc -l
```
Expected: roughly 50–80 MB total uncompressed (≈300 KB × ~180 cities). Individual files ~300 KB raw, ~100 KB gzipped when served.

- [ ] **Step 6: Commit the generated data**

This is a large commit (~80 MB). It's static data and won't change unless we re-fetch.

```bash
git add src/data/pvgis/
git commit -m "data: add PVGIS hourly series for ~180 cities (2005-2023)"
```

---

## Task 7: Runtime data loader

**Files:**
- Create: `src/data/loader.js`
- Create: `src/data/loader.test.js`

- [ ] **Step 1: Write failing tests**

Create `src/data/loader.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { decodeCityData, loadCityData, __resetLoaderCache } from './loader.js'

describe('decodeCityData', () => {
  it('returns a Float32Array of the expected length', () => {
    const raw = {
      name: 'Test', country: 'TST', lat: 0, lon: 0, elevation: 0,
      startYear: 2020, endYear: 2021,
      hoursPerYear: [3, 2],
      scale: 0.1,
      hourly: [0, 100, 200, 300, 400],
    }
    const out = decodeCityData(raw)
    expect(out.hourly).toBeInstanceOf(Float32Array)
    expect(out.hourly.length).toBe(5)
  })

  it('applies scale correctly', () => {
    const raw = {
      name: 'Test', country: 'TST', lat: 0, lon: 0, elevation: 0,
      startYear: 2020, endYear: 2020,
      hoursPerYear: [3],
      scale: 0.1,
      hourly: [0, 1000, 4567],  // encoded
    }
    const out = decodeCityData(raw)
    expect(out.hourly[0]).toBe(0)
    expect(out.hourly[1]).toBeCloseTo(100, 5)
    expect(out.hourly[2]).toBeCloseTo(456.7, 5)
  })

  it('computes yearOffsets for fast per-year indexing', () => {
    const raw = {
      name: 'Test', country: 'TST', lat: 0, lon: 0, elevation: 0,
      startYear: 2020, endYear: 2022,
      hoursPerYear: [10, 20, 30],
      scale: 0.1,
      hourly: new Array(60).fill(0),
    }
    const out = decodeCityData(raw)
    expect(out.yearOffsets).toEqual([0, 10, 30, 60])
  })

  it('preserves metadata', () => {
    const raw = {
      name: 'Nairobi', country: 'KEN', lat: -1.28, lon: 36.82, elevation: 1670,
      startYear: 2005, endYear: 2023,
      hoursPerYear: [8760],
      scale: 0.1,
      hourly: [0],
    }
    const out = decodeCityData(raw)
    expect(out.name).toBe('Nairobi')
    expect(out.country).toBe('KEN')
    expect(out.lat).toBe(-1.28)
    expect(out.startYear).toBe(2005)
    expect(out.endYear).toBe(2023)
  })
})

describe('loadCityData', () => {
  beforeEach(() => { __resetLoaderCache() })

  it('fetches, decodes, and caches', async () => {
    const fakeRaw = {
      name: 'Fake', country: 'FAK', lat: 0, lon: 0, elevation: 0,
      startYear: 2020, endYear: 2020, hoursPerYear: [3],
      scale: 0.1, hourly: [0, 100, 200],
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeRaw,
    })
    globalThis.fetch = fetchMock

    const a = await loadCityData('FAK-fake')
    const b = await loadCityData('FAK-fake')
    expect(fetchMock).toHaveBeenCalledTimes(1)  // cached second call
    expect(a).toBe(b)
    expect(a.hourly[1]).toBeCloseTo(10, 5)
  })

  it('throws a useful error on fetch failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    await expect(loadCityData('NO-where')).rejects.toThrow(/404|not found/i)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

```bash
npm test -- src/data/loader
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `loader.js`**

Create `src/data/loader.js`:

```js
/**
 * Runtime loader for per-city PVGIS data. Lazy-fetches, decodes int16 → Float32,
 * and caches in module-level state. Safe to call repeatedly.
 */

const cache = new Map()  // slug → Promise<decoded>

/** Decode a raw city JSON record into runtime form with Float32Array + yearOffsets. */
export function decodeCityData(raw) {
  const { scale, hourly, hoursPerYear } = raw
  const decoded = new Float32Array(hourly.length)
  for (let i = 0; i < hourly.length; i++) decoded[i] = hourly[i] * scale

  const yearOffsets = [0]
  let running = 0
  for (const h of hoursPerYear) {
    running += h
    yearOffsets.push(running)
  }

  return {
    name: raw.name,
    country: raw.country,
    lat: raw.lat, lon: raw.lon, elevation: raw.elevation,
    startYear: raw.startYear, endYear: raw.endYear,
    hoursPerYear,
    yearOffsets,      // [0, 8760, 17520, ...]; length = nYears + 1
    hourly: decoded,  // Float32Array of W/kWp
  }
}

/** Lazy-load a city's data by slug (e.g. 'KEN-nairobi'). Cached in-memory. */
export function loadCityData(slug) {
  if (cache.has(slug)) return cache.get(slug)
  const promise = (async () => {
    // In production, /data/pvgis/*.json is served as a static asset by Vite.
    const res = await fetch(`/data/pvgis/${slug}.json`)
    if (!res.ok) throw new Error(`Failed to load ${slug}: ${res.status}`)
    const raw = await res.json()
    return decodeCityData(raw)
  })()
  cache.set(slug, promise)
  return promise
}

/** Test helper — resets in-memory cache. */
export function __resetLoaderCache() {
  cache.clear()
}
```

- [ ] **Step 4: Verify tests pass**

```bash
npm test -- src/data/loader
```
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/data/loader.js src/data/loader.test.js
git commit -m "feat(data): add runtime city-data loader with decode + cache"
```

---

## Task 8: Wire PVGIS data into Vite's static asset pipeline

**Files:**
- Modify: `vite.config.js` (if needed)

Vite serves files under `public/` as static assets at root URLs. For `/data/pvgis/*.json` to work at runtime, the JSON files either need to live under `public/`, or we need to move them under `src/assets/` and import-map them. The simplest thing: symlink or copy the `src/data/pvgis/` tree into `public/data/pvgis/` at build time.

- [ ] **Step 1: Read the current vite.config.js**

Inspect `vite.config.js`. If it's standard React setup, no changes are needed — we just need to place the files correctly.

- [ ] **Step 2: Move PVGIS files under `public/`**

```bash
mkdir -p public/data
git mv src/data/pvgis public/data/pvgis
```

- [ ] **Step 3: Update the preprocessor output path**

Edit `scripts/build-city-data.mjs`:

```js
const OUT_DIR = path.resolve('public/data/pvgis')
```

(Change the one line that currently reads `src/data/pvgis`.)

- [ ] **Step 4: Update loader.js fetch path (no change needed)**

`loader.js` already fetches from `/data/pvgis/...` which now maps to `public/data/pvgis/...`. ✓

- [ ] **Step 5: Verify loader tests still pass**

```bash
npm test -- src/data/loader
```
Expected: PASS (6 tests). (Tests mock `fetch`, so the actual path doesn't matter.)

- [ ] **Step 6: Spot-check a static fetch works in dev**

```bash
npm run dev &
# In another shell:
sleep 3
curl -s http://localhost:5173/data/pvgis/KEN-nairobi.json | head -c 200
kill %1 2>/dev/null
```
Expected: first 200 bytes of the Nairobi JSON. If 404, the file isn't in the right place.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-city-data.mjs public/data/pvgis/
git commit -m "chore(data): move pvgis JSONs under public/ for static serving"
```

---

## Done criteria

Plan A is complete when:

- [ ] `npm test` runs and all tests in `scripts/` and `src/data/` pass.
- [ ] `src/data/cities.json` exists with ~180–210 entries, one per country.
- [ ] `public/data/pvgis/` contains one JSON file per successfully-fetched city.
- [ ] `src/data/loader.js` decodes a city file into `{ hourly: Float32Array, yearOffsets, ... }`.
- [ ] `dev` server serves `/data/pvgis/<slug>.json` as static JSON.
- [ ] No regressions in the existing v1 UI (v1 still uses `src/data/solar-data.json`).

At this point Plan B (engine v2) can begin: it will import `loadCityData` from `loader.js` in dispatch-simulator tests.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-20-v2-data-pipeline.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
