import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { fromFile } from 'geotiff'
import { getSite } from './siteService.js'
import { clamp, normalizeLon, round } from '../utils/geo.js'
import { httpError } from '../utils/httpError.js'

const manifestPath = fileURLToPath(new URL('../data/swim/manifest.json', import.meta.url))
const dataDir = fileURLToPath(new URL('../data/swim/', import.meta.url))

export const MANIFEST = JSON.parse(readFileSync(manifestPath, 'utf8'))

const layersByKind = new Map(MANIFEST.layers.map((layer) => [layer.kind, layer]))
const gridCache = new Map()

export async function getGrid(kind) {
  if (!gridCache.has(kind)) {
    const pending = (async () => {
      const layer = layersByKind.get(kind)
      if (!layer) throw httpError(500, 'layer_not_found', `Capa SWIM desconocida: ${kind}`)
      const tiff = await fromFile(dataDir + layer.file)
      const image = await tiff.getImage()
      const [data] = await image.readRasters({ samples: [0] })
      return {
        kind,
        layer,
        width: image.getWidth(),
        height: image.getHeight(),
        data,
      }
    })()
    pending.catch(() => gridCache.delete(kind))
    gridCache.set(kind, pending)
  }
  return gridCache.get(kind)
}

export function valueAt(grid, row, col) {
  if (!grid) return null
  if (row < 0 || col < 0 || row >= grid.height || col >= grid.width) return null
  const value = grid.data[row * grid.width + col]
  if (!Number.isFinite(value)) return null
  if (grid.layer.nodata != null && value === grid.layer.nodata) return null
  return value
}

export function pixelFor(lon, lat) {
  const { minLon, minLat, maxLon, maxLat } = MANIFEST.bbox
  if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) return null
  const resolution = MANIFEST.resolution_deg
  const col = clamp(Math.floor((lon - minLon) / resolution), 0, MANIFEST.grid.width - 1)
  const row = clamp(Math.floor((maxLat - lat) / resolution), 0, MANIFEST.grid.height - 1)
  return { row, col }
}

export function wehFromNeutron(neutron) {
  if (neutron == null || !Number.isFinite(neutron) || neutron < -1 || neutron > 1) {
    return null
  }
  if (neutron >= 1) return 25
  return neutron >= 0 ? 10 + 15 * neutron : 10 + 5 * neutron
}

function emptyDeposit(lat, lon, message) {
  return {
    lat,
    lon,
    swim: {
      consistency_0_1m: null,
      consistency_1_5m: null,
      consistency_gt5m: null,
      swim_1_0: null,
    },
    weh_percent: null,
    weh_source: null,
    depth_hint_m: null,
    interface_depth_m: null,
    neutron_consistency: null,
    terrain: null,
    context: null,
    has_data: false,
    sources: [],
    message,
  }
}

export async function sampleIce(lat, lon) {
  const latN = round(Number(lat), 6)
  const lonN = round(normalizeLon(lon), 6)
  if (!Number.isFinite(latN) || latN < -90 || latN > 90) {
    throw httpError(400, 'invalid_coordinates', 'lat debe ser un número entre -90 y 90')
  }
  if (!Number.isFinite(lonN)) {
    throw httpError(400, 'invalid_coordinates', 'lon debe ser un número')
  }

  const pixel = pixelFor(lonN, latN)
  if (!pixel) {
    return emptyDeposit(
      latN,
      lonN,
      `Sin cobertura SWIM para (${latN}, ${lonN}). Ventana disponible: ${MANIFEST.bbox.minLon}-${MANIFEST.bbox.maxLon}E, ${MANIFEST.bbox.minLat}-${MANIFEST.bbox.maxLat}N.`,
    )
  }

  const kinds = [
    'c0_1',
    'c1_5',
    'gt5m',
    'neutron',
    'depth',
    'ci_swim1',
    'geomorphology',
    'radar_dielectric',
    'radar_power',
    'thermal',
    'weh',
    'dem',
    'slope',
  ]
  const grids = await Promise.all(kinds.map((kind) => getGrid(kind)))
  const values = Object.fromEntries(
    kinds.map((kind, index) => [kind, valueAt(grids[index], pixel.row, pixel.col)]),
  )

  const hasData =
    values.c0_1 != null || values.c1_5 != null || values.gt5m != null || values.neutron != null
  if (!hasData) {
    return emptyDeposit(latN, lonN, 'Sin dato SWIM en esta celda (nodata).')
  }

  const site = getSite('ap1')
  const derivedWeh = wehFromNeutron(values.neutron)
  const weh = values.weh ?? derivedWeh
  const iceTable = site?.ice_table_cm
  const sources = ['SWIM 2.0 (PSI)', 'Odyssey Neutron Spectrometer (Pathare 2018)']
  if (values.depth != null) sources.push('Bramson et al. 2015 (depth to interface)')
  if (values.dem != null || values.slope != null) sources.push('MOLA DEM 463 m (USGS)')

  return {
    lat: latN,
    lon: lonN,
    swim: {
      consistency_0_1m: values.c0_1 == null ? null : round(values.c0_1, 3),
      consistency_1_5m: values.c1_5 == null ? null : round(values.c1_5, 3),
      consistency_gt5m: values.gt5m == null ? null : round(values.gt5m, 3),
      swim_1_0: values.c0_1 == null ? null : round(values.c0_1, 3),
    },
    weh_percent: weh == null ? null : round(weh, 1),
    weh_source: values.weh != null ? 'swim_weh_layer' : derivedWeh == null ? null : 'neutron_inverse',
    depth_hint_m: iceTable ? `${iceTable.min}-${iceTable.max} cm` : null,
    interface_depth_m: values.depth == null ? null : round(values.depth, 1),
    neutron_consistency: values.neutron == null ? null : round(values.neutron, 3),
    terrain: {
      elevation_m: values.dem == null ? null : round(values.dem, 0),
      slope_deg: values.slope == null ? null : round(values.slope, 2),
    },
    context: {
      geomorphology: values.geomorphology == null ? null : round(values.geomorphology, 3),
      radar_dielectric:
        values.radar_dielectric == null ? null : round(values.radar_dielectric, 3),
      radar_power: values.radar_power == null ? null : round(values.radar_power, 3),
      thermal: values.thermal == null ? null : round(values.thermal, 3),
      swim1_consistency: values.ci_swim1 == null ? null : round(values.ci_swim1, 3),
    },
    has_data: true,
    sources,
    message: null,
  }
}
