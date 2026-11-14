import { Router } from 'express'
import { calculateIsru, validateIsruInput } from '../services/isruService.js'

const router = Router()

router.post('/calculate', (req, res, next) => {
  try {
    const { errors, input } = validateIsruInput(req.body)
    if (errors.length) {
      return res.status(400).json({ error: 'invalid_input', details: errors })
    }
    res.json(calculateIsru(input))
  } catch (err) {
    next(err)
  }
})

export default router
