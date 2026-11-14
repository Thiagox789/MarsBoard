import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import routes from './routes/index.js'

const app = express()
const port = Number(process.env.PORT) || 4000
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000'

app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '1mb' }))

app.use(routes)

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path })
})

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (!err.status || err.status >= 500) console.error(err)
  const payload = {
    error: err.code || 'internal_error',
    message: err.message || 'Unexpected error',
  }
  if (err.details) payload.details = err.details
  res.status(err.status || 500).json(payload)
})

app.listen(port, () => {
  console.log(`MARSBOARD API escuchando en http://localhost:${port}`)
})

export default app
