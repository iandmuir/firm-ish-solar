#!/usr/bin/env node
// Read the 360×180 NASA POWER GHI grid from .cache/ghi-grid.json, apply a
// navy → amber → bright-yellow color ramp, and write a 360×180 PNG to
// public/data/ghi-world.png. Land masking is handled at runtime via SVG
// clipPath (so this PNG is a full equirectangular canvas with alpha=0 over
// missing cells only).

import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IN  = path.join(__dirname, '.cache', 'ghi-grid.json')
const OUT = path.join(__dirname, '..', 'public', 'data', 'ghi-world.png')

const { grid, rows, cols, units } = JSON.parse(fs.readFileSync(IN, 'utf8'))

// Convert to annual kWh/m²/yr — more intuitive numbers for the ramp, though
// the ramp itself works on normalized [0..1] so it doesn't strictly matter.
const DAYS = 365.25
const annual = grid.map(row => row.map(v => (v == null ? null : v * DAYS)))

// Ramp keyed to the SolarGIS "Long-term average GHI" legend (kWh/m²/yr).
// Values are annual totals; colors sampled from the published band.
const STOPS = [
  { v: 803,  rgb: [ 91, 168, 155] }, // teal (low insolation)
  { v: 949,  rgb: [123, 192, 166] },
  { v: 1095, rgb: [159, 212, 126] }, // green
  { v: 1241, rgb: [193, 222, 108] },
  { v: 1387, rgb: [226, 228,  90] }, // yellow-green
  { v: 1534, rgb: [244, 216,  74] }, // yellow
  { v: 1680, rgb: [248, 193,  64] },
  { v: 1826, rgb: [249, 169,  58] }, // light orange
  { v: 1972, rgb: [247, 145,  58] }, // orange
  { v: 2118, rgb: [242, 120,  50] },
  { v: 2264, rgb: [232,  94,  44] }, // red-orange
  { v: 2410, rgb: [217,  67,  41] }, // red
  { v: 2556, rgb: [197,  45,  76] }, // magenta-red
  { v: 2702, rgb: [216, 103, 159] }, // pink
]

function sampleRamp(value) {
  if (value <= STOPS[0].v) return STOPS[0].rgb
  if (value >= STOPS[STOPS.length - 1].v) return STOPS[STOPS.length - 1].rgb
  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i], b = STOPS[i + 1]
    if (value >= a.v && value <= b.v) {
      const t = (value - a.v) / (b.v - a.v)
      return [
        Math.round(a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t),
        Math.round(a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t),
        Math.round(a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t),
      ]
    }
  }
  return STOPS[STOPS.length - 1].rgb
}

const png = new PNG({ width: cols, height: rows })
for (let y = 0; y < rows; y++) {
  for (let x = 0; x < cols; x++) {
    const idx = (y * cols + x) * 4
    const v = annual[y][x]
    if (v == null) {
      png.data[idx] = 0
      png.data[idx + 1] = 0
      png.data[idx + 2] = 0
      png.data[idx + 3] = 0 // transparent for missing
    } else {
      const [r, g, b] = sampleRamp(v)
      png.data[idx] = r
      png.data[idx + 1] = g
      png.data[idx + 2] = b
      png.data[idx + 3] = 255
    }
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
const buf = PNG.sync.write(png, { colorType: 6, compressionLevel: 9 })
fs.writeFileSync(OUT, buf)
console.log(`  wrote ${OUT}  (${(buf.length / 1024).toFixed(1)} KB, ${cols}×${rows} px)`)
console.log(`  units in: ${units}  →  annual kWh/m²/yr for color ramp`)
