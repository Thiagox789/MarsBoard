import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeLon } from '../utils/geo.js'
import { httpError } from '../utils/httpError.js'

const cacheDir = fileURLToPath(new URL('../data/cache/tiles/', import.meta.url))
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

export const BASEMAP_LAYERS = {
  mola: {
    url: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    ext: 'jpg',
    contentType: 'image/jpeg',
    tileSize: 256,
  },
  themis_day: {
    url: 'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    ext: 'png',
    contentType: 'image/png',
    tileSize: 256,
  },
  themis_night: {
    url: 'https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/{z}/{y}/{x}.png',
    ext: 'png',
    contentType: 'image/png',
    tileSize: 256,
  },
  ctx: {
    url: 'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}',
    ext: 'png',
    contentType: 'image/png',
    tileSize: 512,
  },
  hirise: {
    url: 'https://astro.arcgis.com/arcgis/rest/services/OnMars/HiRISE/MapServer/tile/{z}/{y}/{x}',
    ext: 'png',
    contentType: 'image/png',
    tileSize: 512,
  },
}

export function maxZoom() {
  return 8
}

export function validateMatrix(z, x, y) {
  if (!Number.isInteger(z) || z < 0 || z > maxZoom()) {
    throw httpError(400, 'invalid_tile', `z debe ser un entero entre 0 y ${maxZoom()}`)
  }
  const width = 2 ** (z + 1)
  const height = 2 ** z
  if (!Number.isInteger(x) || x < 0 || x >= width) {
    throw httpError(400, 'invalid_tile', `x debe estar entre 0 y ${width - 1} para z=${z}`)
  }
  if (!Number.isInteger(y) || y < 0 || y >= height) {
    throw httpError(400, 'invalid_tile', `y debe estar entre 0 y ${height - 1} para z=${z}`)
  }
}

export function validateTile(layerKey, z, x, y) {
  if (!BASEMAP_LAYERS[layerKey]) {
    throw httpError(404, 'layer_not_found', `Capa de tiles desconocida: ${layerKey}`)
  }
  validateMatrix(z, x, y)
}

export function tileBounds(z, x, y) {
  validateMatrix(z, x, y)
  const width = 2 ** (z + 1)
  const height = 2 ** z
  return {
    west: -180 + (x / width) * 360,
    east: -180 + ((x + 1) / width) * 360,
    north: 90 - (y / height) * 180,
    south: 90 - ((y + 1) / height) * 180,
  }
}

export function tileIndex(lat, lon, z) {
  const latN = Number(lat)
  const lonN = normalizeLon(lon)
  const zoom = Number(z)
  if (!Number.isFinite(latN) || latN < -90 || latN > 90) {
    throw httpError(400, 'invalid_coordinates', 'lat debe ser un número entre -90 y 90')
  }
  if (!Number.isFinite(lonN)) {
    throw httpError(400, 'invalid_coordinates', 'lon debe ser un número')
  }
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > maxZoom()) {
    throw httpError(400, 'invalid_tile', `z debe ser un entero entre 0 y ${maxZoom()}`)
  }
  const width = 2 ** (zoom + 1)
  const height = 2 ** zoom
  const signedLon = ((lonN + 180) % 360) - 180
  const x = Math.min(width - 1, Math.max(0, Math.floor(((signedLon + 180) / 360) * width)))
  const y = Math.min(height - 1, Math.max(0, Math.floor(((90 - latN) / 180) * height)))
  return { z: zoom, x, y }
}

function etagFor(buffer) {
  return `"${createHash('sha1').update(buffer).digest('hex').slice(0, 20)}"`
}

function buildUrl(layer, z, x, y) {
  return layer.url
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
}

async function readCached(file) {
  try {
    return await readFile(file)
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

async function writeCached(file, buffer) {
  await mkdir(dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, buffer)
  await rename(temp, file)
}

export async function getTile(layerKey, z, x, y, ifNoneMatch) {
  validateTile(layerKey, z, x, y)
  const layer = BASEMAP_LAYERS[layerKey]
  const file = join(cacheDir, layerKey, String(z), String(x), `${y}.${layer.ext}`)

  const cached = await readCached(file)
  if (cached) {
    const etag = etagFor(cached)
    if (ifNoneMatch === etag) return { notModified: true, etag }
    return { buffer: cached, contentType: layer.contentType, etag, cached: true, fallback: false }
  }

  let response
  try {
    response = await fetch(buildUrl(layer, z, x, y), {
      signal: AbortSignal.timeout(10000),
      headers: { 'user-agent': 'MARSBOARD/0.1' },
    })
  } catch (error) {
    throw httpError(502, 'upstream_unreachable', `No se pudo descargar el tile: ${error.message}`)
  }

  if (response.status === 404) {
    return {
      buffer: transparentPng,
      contentType: 'image/png',
      etag: '"fallback"',
      cached: false,
      fallback: true,
    }
  }

  if (!response.ok) {
    throw httpError(502, 'upstream_error', `El proveedor respondió ${response.status}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const contentType = response.headers.get('content-type') || layer.contentType
  await writeCached(file, buffer)
  return { buffer, contentType, etag: etagFor(buffer), cached: false, fallback: false }
}
