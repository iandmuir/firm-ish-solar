// Client-side scenario PDF export.
//
// Page 1: high-fidelity raster snapshot of the Results Panel (html2canvas).
// Page 2: auto-generated assumptions appendix (jspdf-autotable).
//
// Keep imports dynamic so the ~900KB of PDF libs is only loaded when the user
// clicks "Export" — the default bundle stays lean.

export async function exportScenarioPdf({ node, inputs, city, filename }) {
  const [{ default: jsPDF }, { default: html2canvas }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableMod.default ?? autoTableMod

  if (!node) throw new Error('exportScenarioPdf: missing DOM node')

  // html2canvas respects `overflow: auto` on the capture node and its
  // ancestors — everything past the visible viewport gets clipped. Lift the
  // overflow/height constraints on the node and its parent chain during
  // capture, then restore. We walk up until the body to be safe.
  const tweaked = []
  const lift = (el) => {
    if (!el || el === document.body) return
    tweaked.push({
      el,
      overflow: el.style.overflow,
      overflowY: el.style.overflowY,
      overflowX: el.style.overflowX,
      height: el.style.height,
      maxHeight: el.style.maxHeight,
    })
    el.style.overflow = 'visible'
    el.style.overflowY = 'visible'
    el.style.overflowX = 'visible'
    el.style.height = 'auto'
    el.style.maxHeight = 'none'
    lift(el.parentElement)
  }
  const restore = () => {
    for (const t of tweaked) {
      t.el.style.overflow = t.overflow
      t.el.style.overflowY = t.overflowY
      t.el.style.overflowX = t.overflowX
      t.el.style.height = t.height
      t.el.style.maxHeight = t.maxHeight
    }
  }

  let canvas
  try {
    lift(node)
    // Let the browser settle the new layout before capturing (one frame).
    await new Promise((r) => requestAnimationFrame(() => r()))

    const fullW = node.scrollWidth
    const fullH = node.scrollHeight

    canvas = await html2canvas(node, {
      scale: 2,
      backgroundColor: '#0a1628',
      useCORS: true,
      logging: false,
      windowWidth: fullW,
      windowHeight: fullH,
      width: fullW,
      height: fullH,
    })
  } finally {
    restore()
  }

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 10

  // --- Page 1: snapshot ----------------------------------------------------
  const imgData = canvas.toDataURL('image/png')
  const imgW = pageW - margin * 2
  const imgH = (canvas.height * imgW) / canvas.width

  // If the captured panel is taller than one page, scale down uniformly so
  // it all fits on page 1 (users get one at-a-glance view rather than a
  // split image across pages).
  let drawW = imgW
  let drawH = imgH
  if (imgH > pageH - margin * 2) {
    const scale = (pageH - margin * 2) / imgH
    drawW = imgW * scale
    drawH = imgH * scale
  }
  const offsetX = (pageW - drawW) / 2
  pdf.addImage(imgData, 'PNG', offsetX, margin, drawW, drawH)

  // --- Page 2: appendix ----------------------------------------------------
  pdf.addPage()

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.setTextColor(30, 41, 59)
  pdf.text('Scenario Assumptions', margin, margin + 6)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(100, 116, 139)
  const subtitle = city?.country
    ? `${city.city}, ${city.country} — ${new Date().toISOString().slice(0, 10)}`
    : new Date().toISOString().slice(0, 10)
  pdf.text(subtitle, margin, margin + 11)

  const rows = buildAssumptionRows({ inputs, city })

  autoTable(pdf, {
    startY: margin + 16,
    head: [['Parameter', 'Value']],
    body: rows,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [248, 250, 252],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 'auto', halign: 'right', fontStyle: 'normal' },
    },
    didParseCell: (data) => {
      // Section heading rows use a single cell spanning both columns.
      if (data.row.raw && data.row.raw.isSection) {
        data.cell.styles.fillColor = [241, 245, 249]
        data.cell.styles.textColor = [15, 23, 42]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  pdf.save(filename)
}

/**
 * Map current inputs into a flat array of autoTable rows, with section
 * heading rows (rendered as a grey full-width bar).
 */
function buildAssumptionRows({ inputs, city }) {
  const rows = []
  const section = (title) => {
    // autoTable colSpan via raw row: first cell spans both; marker lets the
    // didParseCell hook style it.
    rows.push(Object.assign([{ content: title, colSpan: 2 }, ''], { isSection: true }))
  }
  const row = (label, value) => rows.push([label, value])

  section('Site & Target')
  if (city?.country) row('Country', city.country)
  if (city?.city) row('City', city.city)
  if (city?.lat != null && city?.lon != null) {
    row('Coordinates', `${city.lat.toFixed(3)}°, ${city.lon.toFixed(3)}°`)
  }
  row('Firm Capacity', `${inputs.firmCapacityMW} MW`)
  row('Firmness Threshold', `${inputs.firmnessThresholdPct}%`)
  row('Project Lifetime', `${inputs.projectLifetime} years`)
  row('Discount Rate / WACC', `${inputs.waccPct.toFixed(1)}%`)

  section('Solar Asset')
  row('Turnkey Installed Cost', `$${inputs.solarCostPerWdc.toFixed(2)}/Wdc`)
  row('Fixed O&M', `$${inputs.solarOmPerKwdcYear.toFixed(1)}/kWdc/yr`)
  row('Annual Degradation', `${inputs.solarDegradationPct.toFixed(1)}%/yr`)

  section('Storage Asset')
  row('Turnkey Installed Cost', `$${inputs.batteryCostPerKwh}/kWh`)
  row('Fixed O&M', `$${inputs.batteryOmPerKwhYear.toFixed(1)}/kWh/yr`)
  row('DC-DC Efficiency', `${inputs.pvToBatteryEffPct.toFixed(1)}%`)
  row('Depth of Discharge', `${inputs.batteryDodPct}%`)
  row('Battery Chemical RTE', `${inputs.batteryChemicalRtePct.toFixed(1)}%`)
  row('Annual Degradation', `${inputs.batteryDegradationPct.toFixed(1)}%/yr`)
  row('Augmentation Cycle', `${inputs.batteryAugCycle} years`)

  section('Power Conversion & Grid')
  row('Inverter Installed Cost', `$${inputs.inverterCostPerWac.toFixed(3)}/Wac`)
  row('DC-AC Inverter Efficiency', `${inputs.inverterEffPct.toFixed(1)}%`)
  row('Grid Interconnect', `$${inputs.gridCostPerWac.toFixed(3)}/Wac`)
  row('Inverter Replacement Cycle', `${inputs.inverterReplacementCycle} years`)
  row('Inverter Replacement Cost', `${inputs.inverterReplacementFraction}% of turnkey`)

  section('Future Cost Projections')
  row('OPEX Escalation', `${inputs.opexEscalationPct.toFixed(1)}%/yr`)
  row('Annual Solar & Inverter Cost Decline', `${inputs.annualSolarCostDeclinePct.toFixed(1)}%/yr`)
  row('Annual Battery Cost Decline', `${inputs.annualBatteryCostDeclinePct.toFixed(1)}%/yr`)

  section('Backup Power')
  if (inputs.backupType) row('Backup Type', inputs.backupType)
  row('Backup Power Cost', `$${inputs.backupCostPerMWh.toFixed(0)}/MWh`)

  section('Traditional-Plant Benchmark')
  row('Benchmark Source', inputs.benchmarkSource ?? '—')
  row('Benchmark LCOE', `$${inputs.benchmarkLcoe.toFixed(0)}/MWh`)
  row('Traditional Plant LCOE Trend', `${inputs.benchmarkEscalationPct.toFixed(1)}%/yr`)

  return rows
}

/**
 * Build the export filename.
 * Format: FirmSolar_<ISO3>_<City>_<FirmMW>MW_<Firmness>pct.pdf
 * e.g. FirmSolar_ZAF_CapeTown_100MW_98pct.pdf
 *
 * City names get any parenthetical territory suffix stripped and are
 * CamelCased (spaces / punctuation removed) so the filename stays tidy.
 */
export function buildExportFilename({ iso3, cityName, firmCapacityMW, firmnessAchievedPct }) {
  const code = (iso3 ?? 'XXX').toUpperCase()
  const parts = [`FirmSolar`, code]
  const cityPart = cleanCityForFilename(cityName)
  if (cityPart) parts.push(cityPart)
  parts.push(`${firmCapacityMW}MW`)
  if (firmnessAchievedPct != null && Number.isFinite(firmnessAchievedPct)) {
    // Round to 1dp, drop a trailing '.0' for clean filenames.
    const rounded = Math.round(firmnessAchievedPct * 10) / 10
    const txt = Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1)
    parts.push(`${txt}pct`)
  }
  return `${parts.join('_')}.pdf`
}

// Standalone Latin-extended letters that NFD normalization doesn't decompose
// (because they aren't base-letter + combining-mark — they're distinct code
// points). Mapped to closest ASCII equivalents for filename safety.
const LATIN_FOLD_MAP = {
  'ł': 'l', 'Ł': 'L',
  'ø': 'o', 'Ø': 'O',
  'æ': 'ae', 'Æ': 'Ae',
  'œ': 'oe', 'Œ': 'Oe',
  'ß': 'ss',
  'đ': 'd', 'Đ': 'D',
  'þ': 'th', 'Þ': 'Th',
  'ð': 'd', 'Ð': 'D',
  'ı': 'i', 'İ': 'I',
}

function foldToAscii(s) {
  // NFD decomposes é → e + combining acute, ñ → n + combining tilde, etc.
  // Strip the combining marks, then map the stragglers above.
  const stripped = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return stripped.replace(/[łŁøØæÆœŒßđĐþÞðÐıİ]/g, (c) => LATIN_FOLD_MAP[c] ?? c)
}

function cleanCityForFilename(name) {
  if (!name) return ''
  // Drop "(Guadeloupe)" style territory parentheticals.
  const base = name.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
  const folded = foldToAscii(base)
  // CamelCase: split on non-alphanumerics and capitalize each chunk.
  return folded
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('')
}
