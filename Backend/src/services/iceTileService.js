import { createHash } from 'node:crypto'
import { PNG } from 'pngjs'
import { clamp, normalizeLon } from '../utils/geo.js'
import { httpError } from '../utils/httpError.js'
import { MANIFEST, getGrid, valueAt } from './iceService.js'
import { tileBounds, validateMatrix } from './tileService.js'

const SIZE = 256
const CACHE_LIMIT = 512
const ALPHA = 220
const cache = new Map()

export const TILE_KINDS = {
  c0_1: { kind: 'c0_1', label: 'SWIM 2.0 hielo 0-1 m', min: 0, max: 1, ramp: 'swim' },
  c1_5: { kind: 'c1_5', label: 'SWIM 2.0 hielo 1-5 m', min: 0, max: 1, ramp: 'swim' },
  gt5m: { kind: 'gt5m', label: 'SWIM 2.0 hielo >5 m', min: 0, max: 1, ramp: 'swim' },
  weh: { kind: 'weh', label: 'WEH (Pathare 2018)', min: 5, max: 25, ramp: 'weh' },
}

const RAMPS = {
  swim: [
    [0, [215, 48, 39]],
    [0.5, [254, 224, 139]],
    [1, [44, 162, 95]],
  ],
  weh: [
    [0, [166, 97, 26]],
    [0.5, [246, 232, 195]],
    [1, [1, 102, 94]],
  ],
}

const transparentTile = PNG.sync.write({
  width: SIZE,
  height: SIZE,
  data: Buffer.alloc(SIZE * SIZE * 4),
})

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}

function colorFor(value, layer) {
  const t = clamp((value - layer.min) / (layer.max - layer.min), 0, 1)
  const stops = RAMPS[layer.ramp]
  for (let index = 1; index < stops.length; index += 1) {
    const [at, color] = stops[index]
    if (t <= at) {
      const [prevAt, prevColor] = stops[index - 1]
      return mix(prevColor, color, (t - prevAt) / (at - prevAt))
    }
  }
  return stops[stops.length - 1][1]
}

function sampleGrid(grid, lon, lat) {
  const { minLon, minLat, maxLon, maxLat } = MANIFEST.bbox
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return null

  const step = MANIFEST.resolution_deg
  const gx = (lon - (minLon + step / 2)) / step
  const gy = (maxLat - step / 2 - lat) / step
  const c0 = clamp(Math.floor(gx), 0, grid.width - 1)
  const r0 = clamp(Math.floor(gy), 0, grid.height - 1)
  const c1 = Math.min(grid.width - 1, c0 + 1)
  const r1 = Math.min(grid.height - 1, r0 + 1)
  const tx = clamp(gx - c0, 0, 1)
  const ty = clamp(gy - r0, 0, 1)

  const v00 = valueAt(grid, r0, c0)
  const v10 = valueAt(grid, r0, c1)
  const v01 = valueAt(grid, r1, c0)
  const v11 = valueAt(grid, r1, c1)
  if (v00 == null || v10 == null || v01 == null || v11 == null) {
    return valueAt(grid, clamp(Math.round(gy), 0, grid.height - 1), clamp(Math.round(gx), 0, grid.width - 1))
  }
  return (
    v00 * (1 - tx) * (1 - ty) +
    v10 * tx * (1 - ty) +
    v01 * (1 - tx) * ty +
    v11 * tx * ty
  )
}

function renderTile(grid, layer, bounds) {
  const { minLon, minLat, maxLon, maxLat } = MANIFEST.bbox
  const west360 = normalizeLon(bounds.west)
  const east360 = west360 + (bounds.east - bounds.west)
  if (east360 < minLon || west360 > maxLon || bounds.north < minLat || bounds.south > maxLat) {
    return transparentTile
  }

  const data = Buffer.alloc(SIZE * SIZE * 4)
  for (let py = 0; py < SIZE; py += 1) {
    const lat = bounds.north - ((py + 0.5) / SIZE) * (bounds.north - bounds.south)
    for (let px = 0; px < SIZE; px += 1) {
      const lon = normalizeLon(bounds.west + ((px + 0.5) / SIZE) * (bounds.east - bounds.west))
      const value = sampleGrid(grid, lon, lat)
      if (value == null) continue
      const [red, green, blue] = colorFor(value, layer)
      const offset = (py * SIZE + px) * 4
      data[offset] = red
      data[offset + 1] = green
      data[offset + 2] = blue
      data[offset + 3] = ALPHA
    }
  }
  return PNG.sync.write({ width: SIZE, height: SIZE, data })
}

function etagFor(buffer) {
  return `"${createHash('sha1').update(buffer).digest('hex').slice(0, 20)}"`
}

function remember(key, entry) {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    cache.delete(oldest)
  }
  cache.set(key, entry)
}

export async function getIceTile(kind, z, x, y, ifNoneMatch) {
  const layer = TILE_KINDS[kind]
  if (!layer) {
    throw httpError(404, 'layer_not_found', `Capa de hielo desconocida: ${kind}`)
  }
  validateMatrix(z, x, y)

  const key = `${kind}/${z}/${x}/${y}`
  const hit = cache.get(key)
  if (hit) {
    if (ifNoneMatch === hit.etag) return { notModified: true, etag: hit.etag }
    return { buffer: hit.buffer, contentType: 'image/png', etag: hit.etag, cached: true }
  }

  const grid = await getGrid(layer.kind)
  const buffer = renderTile(grid, layer, tileBounds(z, x, y))
  const etag = etagFor(buffer)
  remember(key, { buffer, etag })
  return { buffer, contentType: 'image/png', etag, cached: false }
}

export function clearIceTileCache() {
  cache.clear()
}
