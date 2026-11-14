import { Router } from 'express'
import { fileURLToPath } from 'node:url'
import { MANIFEST, sampleIce } from '../services/iceService.js'

const router = Router()
const overlayPath = fileURLToPath(new URL('../data/swim/overlay_ice.png', import.meta.url))

router.get('/sample', async (req, res, next) => {
  try {
    const sample = await sampleIce(req.query.lat, req.query.lon)
    res.json(sample)
  } catch (error) {
    next(error)
  }
})

router.get('/manifest', (req, res) => {
  res.json(MANIFEST)
})

router.get('/overlay.png', (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=86400, immutable')
  res.sendFile(overlayPath, (error) => {
    if (error) next(error)
  })
})

export default router
