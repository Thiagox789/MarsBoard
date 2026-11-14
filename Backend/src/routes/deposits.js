import { Router } from 'express'
import { rankDeposits } from '../services/rankService.js'

const router = Router()

router.get('/rank', async (req, res, next) => {
  try {
    const result = await rankDeposits({
      bbox: req.query.bbox,
      limit: req.query.limit ?? 20,
    })
    res.json(result)
  } catch (error) {
    next(error)
  }
})

export default router
