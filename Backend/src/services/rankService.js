import { MANIFEST, getGrid, valueAt } from './iceService.js'
import { getSite } from './siteService.js'
import { clamp, haversineKm, normalizeLon, round } from '../utils/geo.js'
import { httpError } from '../utils/httpError.js'

const CACHE_TTL_MS = 60 * 60 * 1000
const cache = new Map()

export function parseBbox(raw) {
  const home = MANIFEST.bbox
  let minLon = home.minLon
  let minLat = home.minLat
  let maxLon = home.maxLon
  let maxLat = home.maxLat

  if (raw != null && String(raw).trim() !== '') {
    const parts = String(raw)
      .split(',')
      .map((part) => Number(part.trim()))
    if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
      throw httpError(400, 'invalid_bbox', 'bbox debe tener el formato "minLon,minLat,maxLon,maxLat"')
    }
    const lons = [normalizeLon(parts[0]), normalizeLon(parts[2])].sort((a, b) => a - b)
    const lats = [parts[1], parts[3]].sort((a, b) => a - b)
    minLon = lons[0]
    maxLon = lons[1]
    minLat = lats[0]
    maxLat = lats[1]
  }

  const bbox = {
    minLon: Math.max(home.minLon, minLon),
    minLat: Math.max(home.minLat, minLat),
    maxLon: Math.min(home.maxLon, maxLon),
    maxLat: Math.min(home.maxLat, maxLat),
  }

  if (!(bbox.minLat < bbox.maxLat) || !(bbox.minLon < bbox.maxLon)) {
    throw httpError(
      400,
      'bbox_out_of_coverage',
      `bbox fuera de cobertura. Ventana SWIM: ${home.minLon}-${home.maxLon}E, ${home.minLat}-${home.maxLat}N`,
    )
  }
  return bbox
}

export function priorityFor(score) {
  if (score >= 0.45) return 'HIGH'
  if (score >= 0.3) return 'MEDIUM'
  return 'LOW'
}

export function rawScore(c01, c15, weh) {
  return (
    0.5 * clamp(c01 ?? 0, 0, 1) +
    0.3 * clamp(c15 ?? 0, 0, 1) +
    0.2 * (weh == null ? 0 : clamp(weh / 25, 0, 1))
  )
}

export function slopePenalty(slopeDeg) {
  if (slopeDeg == null || !Number.isFinite(slopeDeg)) return 0
  return 0.3 * clamp((slopeDeg - 10) / 15, 0, 1)
}

function bboxToString(bbox) {
  return `${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`
}

async function computeRanking(bbox, limit) {
  const site = getSite('ap1')
  const [c0Grid, c15Grid, wehGrid, slopeGrid, demGrid] = await Promise.all([
    getGrid('c0_1'),
    getGrid('c1_5'),
    getGrid('weh'),
    getGrid('slope'),
    getGrid('dem'),
  ])

  const step = MANIFEST.resolution_deg
  const { minLon, minLat, maxLon, maxLat } = MANIFEST.bbox
  const width = MANIFEST.grid.width
  const height = MANIFEST.grid.height

  const rowStart = clamp(Math.floor((maxLat - bbox.maxLat) / step), 0, height - 1)
  const rowEnd = clamp(Math.floor((maxLat - bbox.minLat) / step), 0, height - 1)
  const colStart = clamp(Math.floor((bbox.minLon - minLon) / step), 0, width - 1)
  const colEnd = clamp(Math.floor((bbox.maxLon - minLon) / step), 0, width - 1)

  const cells = []
  for (let row = rowStart; row <= rowEnd; row += 1) {
    const lat = maxLat - (row + 0.5) * step
    if (lat < bbox.minLat || lat > bbox.maxLat) continue
    for (let col = colStart; col <= colEnd; col += 1) {
      const lon = minLon + (col + 0.5) * step
      if (lon < bbox.minLon || lon > bbox.maxLon) continue

      const c01 = valueAt(c0Grid, row, col)
      if (c01 == null) continue
      const c15 = valueAt(c15Grid, row, col)
      const weh = valueAt(wehGrid, row, col)
      const slope = valueAt(slopeGrid, row, col)
      const elevation = valueAt(demGrid, row, col)

      const scoreRaw = rawScore(c01, c15, weh)
      const distanceKm = haversineKm(lat, lon, site.coordinates.lat, site.coordinates.lon)
      const terrainPenalty = slopePenalty(slope)
      const score =
        scoreRaw * (1 - Math.min(0.3, distanceKm / 300)) * (1 - terrainPenalty)

      cells.push({
        lat: round(lat, 4),
        lon: round(lon, 4),
        score: round(score, 3),
        swim_0_1m: round(c01, 3),
        swim_1_5m: c15 == null ? null : round(c15, 3),
        weh_percent: weh == null ? null : round(weh, 1),
        elevation_m: elevation == null ? null : round(elevation, 0),
        slope_deg: slope == null ? null : round(slope, 2),
        distance_from_ap1_km: round(distanceKm, 1),
        priority: priorityFor(score),
      })
    }
  }

  cells.sort((a, b) => b.score - a.score || a.distance_from_ap1_km - b.distance_from_ap1_km)
  const deposits = cells.slice(0, limit)

  return {
    deposits,
    bbox: bboxToString(bbox),
    count: deposits.length,
    grid_step_deg: step,
    weights: { consistency_0_1m: 0.5, consistency_1_5m: 0.3, weh: 0.2 },
    terrain_penalty: { max: 0.3, starts_deg: 10, full_deg: 25 },
    generated_at: new Date().toISOString(),
    cached: false,
  }
}

export async function rankDeposits({ bbox: rawBbox, limit = 20 } = {}) {
  const bbox = parseBbox(rawBbox)
  const parsedLimit = Number(limit)
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
    throw httpError(400, 'invalid_limit', 'limit debe ser un entero entre 1 y 200')
  }

  const key = `${bboxToString(bbox)}|${parsedLimit}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return { ...hit.value, cached: true }
  }

  const value = await computeRanking(bbox, parsedLimit)
  cache.set(key, { at: Date.now(), value })
  return value
}
