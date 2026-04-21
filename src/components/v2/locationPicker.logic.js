/**
 * Build a sorted list of { iso3, country, city, lat, lon, slug } for the picker.
 * One entry per city. With the current dataset (1 city per country) this is
 * equivalent to a country list; when multiple cities per country arrive we'll
 * group on top of this same structure.
 */
import { countryName } from '../../data/iso-countries.js'
import { UN_MEMBERS_AND_OBSERVERS, TERRITORY_PARENTS } from '../../data/un-members.js'

export function buildOptions(cities) {
  const opts = cities
    .map(c => {
      // UN member or observer: keep as-is.
      if (UN_MEMBERS_AND_OBSERVERS.has(c.iso3)) {
        return {
          iso3: c.iso3,
          country: c.country ?? countryName(c.iso3),
          city: c.city,
          lat: c.lat,
          lon: c.lon,
          slug: citySlug(c),
          isTerritory: false,
        }
      }
      // Territory/dependency: regroup under parent country, append territory suffix.
      const t = TERRITORY_PARENTS[c.iso3]
      if (t) {
        return {
          iso3: t.parent,
          country: countryName(t.parent),
          city: `${c.city} (${t.label})`,
          lat: c.lat,
          lon: c.lon,
          slug: citySlug(c),
          isTerritory: true,
        }
      }
      // Not recognized (e.g. Taiwan under current rules): drop.
      return null
    })
    .filter(Boolean)
  opts.sort((a, b) => String(a.country).localeCompare(String(b.country)))
  return opts
}

/** Look up an option by iso3. Returns undefined if not found. */
export function findByIso3(options, iso3) {
  return options.find(o => o.iso3 === iso3)
}

/**
 * Group options by country, preserving the sort order from buildOptions.
 * Returns: [{ iso3, country, cities: [{ slug, city, lat, lon }, ...] }, ...]
 * Countries are sorted alphabetically; cities within each country are sorted
 * alphabetically by city name.
 */
export function groupByCountry(options) {
  const byIso3 = new Map()
  for (const o of options) {
    if (!byIso3.has(o.iso3)) {
      byIso3.set(o.iso3, { iso3: o.iso3, country: o.country, cities: [] })
    }
    byIso3.get(o.iso3).cities.push({ slug: o.slug, city: o.city, lat: o.lat, lon: o.lon, isTerritory: !!o.isTerritory })
  }
  const groups = Array.from(byIso3.values())
  groups.sort((a, b) => String(a.country).localeCompare(String(b.country)))
  for (const g of groups) {
    g.cities.sort((a, b) => {
      // Non-territories first, then territories; alphabetical within each tier.
      if (a.isTerritory !== b.isTerritory) return a.isTerritory ? 1 : -1
      return String(a.city).localeCompare(String(b.city))
    })
  }
  return groups
}

/** Find the group (country) that contains the given slug. */
export function findGroupBySlug(groups, slug) {
  return groups.find(g => g.cities.some(c => c.slug === slug))
}

/** Build the slug used to fetch `/data/pvgis/<slug>.json.gz` for a city. */
export function citySlug(city) {
  const s = city.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${city.iso3}-${s}`
}
