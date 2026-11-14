import { Router } from 'express'
import healthRouter from './health.js'
import siteRouter from './site.js'
import isruRouter from './isru.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/api/site', siteRouter)
router.use('/api/isru', isruRouter)

export default router
