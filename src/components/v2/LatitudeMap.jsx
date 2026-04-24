import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { geoEquirectangular, geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'

// How many longitude degrees the viewport spans. Smaller = more zoomed in.
// ~80° shows roughly a continent's worth of context around the selected site.
const SPAN_DEG = 80

/**
 * Minimalist regional map centered on the selected site. Country borders are
 * drawn so the user gets enough context to recognize where they are without
 * needing the whole world on screen.
 *
 * The SVG viewBox is sized to the actual rendered container dimensions (via
 * ResizeObserver) so the projection fills its grid cell without distortion,
 * regardless of panel width.
 */
export default function LatitudeMap({ lat, lon }) {
  const [world, setWorld] = useState(null)
  const [error, setError] = useState(null)
  const [size, setSize] = useState({ w: 200, h: 100 })
  const wrapRef = useRef(null)
  const clipId = `lat-map-land-clip-${useId().replace(/:/g, '-')}`

  useEffect(() => {
    let cancelled = false
    fetch('/data/countries-50m.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(w => { if (!cancelled) setWorld(w) })
      .catch(err => { if (!cancelled) setError(err) })
    return () => { cancelled = true }
  }, [])

  // Measure the wrapper on mount and whenever it resizes. Rounding avoids
  // sub-pixel thrash from ResizeObserver.
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const apply = () => {
      const r = el.getBoundingClientRect()
      const w = Math.max(1, Math.round(r.width))
      const h = Math.max(1, Math.round(r.height))
      setSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const countries = useMemo(
    () => (world ? feature(world, world.objects.countries) : null),
    [world]
  )
  const borders = useMemo(
    () => (world ? mesh(world, world.objects.countries, (a, b) => a !== b) : null),
    [world]
  )

  // Scale: span SPAN_DEG° horizontally across the wrapper width. Height then
  // shows whatever latitude fits at that same pixels-per-degree ratio.
  const projection = useMemo(() => {
    const center = [lon ?? 0, lat ?? 0]
    const scale = size.w / (SPAN_DEG * Math.PI / 180)
    return geoEquirectangular()
      .scale(scale)
      .center(center)
      .translate([size.w / 2, size.h / 2])
  }, [lat, lon, size.w, size.h])

  const path = useMemo(() => geoPath(projection), [projection])

  const countriesD = useMemo(
    () => (countries ? path(countries) : null),
    [countries, path]
  )
  const bordersD = useMemo(
    () => (borders ? path(borders) : null),
    [borders, path]
  )

  // Equirectangular is cylindrical, so the equator is always horizontal.
  // We project [centerLon, 0] to find the right y, then draw a plain SVG
  // line across the full width — dodges d3-geo's antimeridian clipping of
  // LineStrings that span ±180°.
  const equatorY = useMemo(() => {
    const p = projection([lon ?? 0, 0])
    return p && Number.isFinite(p[1]) ? p[1] : null
  }, [projection, lon])

  // Position the full-globe equirectangular GHI PNG in SVG coords by projecting
  // its corners. The image covers lon ∈ [-180, 180] and lat ∈ [-90, 90]; the
  // SVG viewport clips to whatever is visible.
  const imageBox = useMemo(() => {
    const tl = projection([-180, 90])
    const br = projection([180, -90])
    if (!tl || !br || !Number.isFinite(tl[0]) || !Number.isFinite(br[0])) return null
    return { x: tl[0], y: tl[1], w: br[0] - tl[0], h: br[1] - tl[1] }
  }, [projection])

  const markerXY = useMemo(() => {
    if (lat == null || lon == null) return null
    const p = projection([lon, lat])
    return p && Number.isFinite(p[0]) && Number.isFinite(p[1]) ? p : null
  }, [projection, lat, lon])

  return (
    <div
      ref={wrapRef}
      className="lat-map-wrap"
      aria-label="Regional map centered on the selected site"
    >
      <svg
        viewBox={`0 0 ${size.w} ${size.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="lat-map-svg"
        role="img"
      >
        {/* Dark ocean background */}
        <rect width={size.w} height={size.h} className="lat-map-bg" />

        {/* Clip path = the land polygons. The GHI raster and slate fallback
            fill are both restricted to land. */}
        {countriesD && (
          <defs>
            <clipPath id={clipId}>
              <path d={countriesD} />
            </clipPath>
          </defs>
        )}

        {/* Land fallback fill — shows through wherever the GHI raster has no
            data (polar holes) or hasn't loaded yet. */}
        {countriesD && <path className="lat-map-land" d={countriesD} />}

        {/* Annual GHI heatmap, clipped to land */}
        {imageBox && countriesD && (
          <image
            className="lat-map-ghi"
            href="/data/ghi-world.png"
            x={imageBox.x}
            y={imageBox.y}
            width={imageBox.w}
            height={imageBox.h}
            preserveAspectRatio="none"
            clipPath={`url(#${clipId})`}
          />
        )}

        {/* Country borders (shared edges only — no coastlines drawn twice) */}
        {bordersD && <path className="lat-map-border" d={bordersD} />}

        {/* Equator line (sun-amber, dotted) — drawn above land so it reads
            clearly across both continents and oceans */}
        {equatorY != null && equatorY >= 0 && equatorY <= size.h && (
          <line
            className="lat-map-equator"
            x1={0}
            x2={size.w}
            y1={equatorY}
            y2={equatorY}
          />
        )}

        {/* Site marker */}
        {markerXY && (
          <g transform={`translate(${markerXY[0]} ${markerXY[1]})`}>
            <circle r={6} className="lat-map-marker-halo" />
            <circle r={3.2} className="lat-map-marker" />
          </g>
        )}

        {error && (
          <text
            x={size.w / 2}
            y={size.h / 2}
            textAnchor="middle"
            fill="#64748b"
            fontSize="10"
            fontFamily="DM Sans, sans-serif"
          >
            map unavailable
          </text>
        )}
      </svg>
    </div>
  )
}
