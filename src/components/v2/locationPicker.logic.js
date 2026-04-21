/**
 * Build a sorted list of { iso3, country, city, lat, lon, slug } for the picker.
 * One entry per city. With the current dataset (1 city per country) this is
 * equivalent to a country list; when multiple cities per country arrive we'll
 * group on top of this same structure.
 */
export function buildOptions(cities) {
  const opts = cities.map(c => ({
    iso3: c.iso3,
    country: c.country,
    city: c.city,
    lat: c.lat,
    lon: c.lon,
    slug: citySlug(c),
  }))
  opts.sort((a, b) => a.country.localeCompare(b.country))
  return opts
}

/** Look up an option by iso3. Returns undefined if not found. */
export function findByIso3(options, iso3) {
  return options.find(o => o.iso3 === iso3)
}

/** Build the slug used to fetch `/data/pvgis/<slug>.json.gz` for a city. */
export function citySlug(city) {
  const s = city.city.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${city.iso3}-${s}`
}
