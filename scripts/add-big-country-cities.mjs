#!/usr/bin/env node
// Extend src/data/cities.json with the 2nd and 3rd most populous cities of
// every country whose area is ≥ 300,000 km² (the "big country" list). Cities
// already present are skipped so the first-ranked city stays as-is.
//
// After running this: run `node scripts/fetch-pvgis.mjs` (slow — network),
// then `node scripts/build-city-data.mjs` to produce the public/data files.

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import AdmZip from 'adm-zip'
import { ISO2_TO_3, parseGeoNamesTsv } from './build-city-list.mjs'

const GEONAMES_URL = 'http://download.geonames.org/export/dump/cities15000.zip'
const CITIES_JSON = path.resolve('src/data/cities.json')
const GEO_CACHE = path.resolve('scripts/.cache/cities15000.txt')
const EXTRA_PER_COUNTRY = 2

// ISO3 codes for countries with area ≥ 300,000 km² (World Bank / CIA Factbook).
// Includes France (incl. overseas), Morocco (excl. Western Sahara), Philippines
// (exactly 300k, user specified ≥).
const BIG_COUNTRIES = new Set([
  'RUS','CAN','USA','CHN','BRA','AUS','IND','ARG','KAZ','DZA',
  'COD','SAU','MEX','IDN','SDN','LBY','IRN','MNG','PER','TCD',
  'NER','AGO','MLI','ZAF','COL','ETH','BOL','MRT','EGY','TZA',
  'NGA','VEN','PAK','NAM','MOZ','TUR','CHL','ZMB','MMR','AFG',
  'SSD','FRA','SOM','CAF','UKR','MDG','BWA','KEN','YEM','THA',
  'ESP','TKM','CMR','PNG','SWE','UZB','MAR','IRQ','PRY','ZWE',
  'JPN','DEU','COG','FIN','VNM','MYS','NOR','CIV','POL','OMN',
  'ITA','PHL',
])

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function citySlug(c) {
  return `${c.iso3}-${slugify(c.city)}`
}

async function ensureGeoNamesCache() {
  if (fs.existsSync(GEO_CACHE)) return fs.readFileSync(GEO_CACHE, 'utf8')
  console.log('Fetching GeoNames cities15000...')
  const res = await fetch(GEONAMES_URL)
  if (!res.ok) throw new Error(`GeoNames fetch failed: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const zip = new AdmZip(buf)
  const tsv = zip.readAsText('cities15000.txt')
  fs.mkdirSync(path.dirname(GEO_CACHE), { recursive: true })
  fs.writeFileSync(GEO_CACHE, tsv)
  return tsv
}

async function main() {
  const existing = JSON.parse(fs.readFileSync(CITIES_JSON, 'utf8'))
  const existingSlugs = new Set(existing.map(citySlug))
  console.log(`Loaded ${existing.length} existing cities.`)

  const tsv = await ensureGeoNamesCache()
  const raw = parseGeoNamesTsv(tsv)
  console.log(`Parsed ${raw.length} GeoNames cities.`)

  // Group GeoNames cities by ISO3 (only for big countries), sorted pop desc.
  const byIso3 = new Map()
  for (const c of raw) {
    const iso3 = ISO2_TO_3[c.iso2]
    if (!iso3 || !BIG_COUNTRIES.has(iso3)) continue
    if (!byIso3.has(iso3)) byIso3.set(iso3, [])
    byIso3.get(iso3).push(c)
  }
  for (const list of byIso3.values()) list.sort((a, b) => b.pop - a.pop)

  const newEntries = []
  const report = []
  for (const iso3 of [...BIG_COUNTRIES].sort()) {
    const candidates = byIso3.get(iso3) ?? []
    const picked = []
    for (const c of candidates) {
      const slug = `${iso3}-${slugify(c.name)}`
      if (existingSlugs.has(slug)) continue
      if (picked.some(p => citySlug(p) === slug)) continue
      picked.push({ iso3, city: c.name, lat: c.lat, lon: c.lon, pop: c.pop })
      if (picked.length >= EXTRA_PER_COUNTRY) break
    }
    if (picked.length < EXTRA_PER_COUNTRY) {
      report.push(`  ! ${iso3}: only ${picked.length} extra found (not enough GeoNames matches)`)
    }
    for (const p of picked) newEntries.push(p)
  }

  console.log(`\nAdding ${newEntries.length} new cities:\n`)
  for (const e of newEntries) {
    console.log(`  + ${e.iso3}  ${e.city.padEnd(30)} pop=${e.pop.toLocaleString()}`)
  }
  if (report.length) {
    console.log('\nCountries short on candidates:')
    for (const line of report) console.log(line)
  }

  const merged = [...existing, ...newEntries].sort((a, b) => {
    const s = a.iso3.localeCompare(b.iso3)
    return s !== 0 ? s : (b.pop ?? 0) - (a.pop ?? 0)
  })
  fs.writeFileSync(CITIES_JSON, JSON.stringify(merged, null, 2) + '\n')
  console.log(`\nWrote ${CITIES_JSON} (${merged.length} entries).`)
  console.log(`\nNext:\n  node scripts/fetch-pvgis.mjs\n  node scripts/build-city-data.mjs`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e); process.exit(1) })
}
