import { Router } from 'express'
import { buildBriefing, formatBriefingMarkdown } from '../services/briefingService.js'

const router = Router()

router.post('/', async (req, res, next) => {
  try {
    const briefing = await buildBriefing(req.body)
    res.json(briefing)
  } catch (error) {
    next(error)
  }
})

router.get('/export', async (req, res, next) => {
  try {
    const briefing = await buildBriefing(req.query)
    res.type('text/markdown; charset=utf-8').send(formatBriefingMarkdown(briefing))
  } catch (error) {
    next(error)
  }
})

export default router
