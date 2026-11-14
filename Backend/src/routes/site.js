import { Router } from 'express'
import { getSite } from '../services/siteService.js'

const router = Router()

router.get('/:id', (req, res, next) => {
  try {
    const site = getSite(req.params.id)
    if (!site) {
      return res.status(404).json({ error: 'site_not_found', id: req.params.id })
    }
    res.json(site)
  } catch (err) {
    next(err)
  }
})

export default router
