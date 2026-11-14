import { Router } from 'express'
import { TILE_KINDS, getIceTile } from '../services/iceTileService.js'
import { BASEMAP_LAYERS, getTile, maxZoom, tileIndex } from '../services/tileService.js'

const router = Router()

async function sendIceTile(kind, req, res, next) {
  try {
    const z = Number(req.params.z)
    const x = Number(req.params.x)
    const y = Number(req.params.y)
    const result = await getIceTile(kind, z, x, y, req.headers['if-none-match'])

    if (result.notModified) {
      res.status(304).end()
      return
    }

    res.set('Cache-Control', 'public, max-age=86400, immutable')
    res.set('ETag', result.etag)
    if (result.cached) res.set('X-Tile-Cache', 'hit')
    res.type(result.contentType).send(result.buffer)
  } catch (error) {
    next(error)
  }
}

async function sendTile(req, res, next) {
  try {
    const layer = req.params.layer
    const z = Number(req.params.z)
    const x = Number(req.params.x)
    const y = Number(req.params.y)
    const result = await getTile(layer, z, x, y, req.headers['if-none-match'])

    if (result.notModified) {
      res.status(304).end()
      return
    }

    res.set('Cache-Control', 'public, max-age=86400, immutable')
    res.set('ETag', result.etag)
    if (result.fallback) res.set('X-Tile-Fallback', '1')
    res.type(result.contentType).send(result.buffer)
  } catch (error) {
    next(error)
  }
}

router.get('/basemap/:layer/:z/:x/:y.:ext', sendTile)
router.get('/basemap/:layer/:z/:x/:y', sendTile)

router.get('/ice/:kind/:z/:x/:y.png', (req, res, next) =>
  sendIceTile(req.params.kind, req, res, next),
)
router.get('/swim/:z/:x/:y.png', (req, res, next) => sendIceTile('c0_1', req, res, next))
router.get('/weh/:z/:x/:y.png', (req, res, next) => sendIceTile('weh', req, res, next))

router.get('/xyz', (req, res, next) => {
  try {
    const tile = tileIndex(req.query.lat, req.query.lon, req.query.z ?? 7)
    res.json(tile)
  } catch (error) {
    next(error)
  }
})

router.get('/layers', (req, res) => {
  const layers = Object.fromEntries(
    Object.entries(BASEMAP_LAYERS).map(([key, layer]) => [
      key,
      { contentType: layer.contentType, ext: layer.ext, tileSize: layer.tileSize },
    ]),
  )
  res.json({
    layers,
    ice_layers: Object.fromEntries(
      Object.entries(TILE_KINDS).map(([key, layer]) => [
        key,
        {
          label: layer.label,
          tileSize: 256,
          max_zoom: maxZoom(),
          path: `/api/tiles/ice/${key}/{z}/{x}/{y}.png`,
        },
      ]),
    ),
    aliases: {
      swim: '/api/tiles/swim/{z}/{x}/{y}.png',
      weh: '/api/tiles/weh/{z}/{x}/{y}.png',
    },
    max_zoom: maxZoom(),
    matrix: { width: '2^(z+1)', height: '2^z', y_origin: 'top', longitude_origin: -180 },
    bounds: { minLon: -180, minLat: -90, maxLon: 180, maxLat: 90 },
  })
})

export default router
