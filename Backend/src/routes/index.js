import { Router } from 'express'
import healthRouter from './health.js'
import siteRouter from './site.js'
import isruRouter from './isru.js'
import iceRouter from './ice.js'
import tilesRouter from './tiles.js'
import depositsRouter from './deposits.js'
import briefingRouter from './briefing.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/api/site', siteRouter)
router.use('/api/isru', isruRouter)
router.use('/api/ice', iceRouter)
router.use('/api/tiles', tilesRouter)
router.use('/api/deposits', depositsRouter)
router.use('/api/briefing', briefingRouter)

export default router
