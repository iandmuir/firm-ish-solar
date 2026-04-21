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

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
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
