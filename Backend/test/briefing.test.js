import assert from 'node:assert/strict'
import test from 'node:test'
import { buildBriefing, formatBriefingMarkdown } from '../src/services/briefingService.js'

const base = {
  lat: 39.8,
  lon: 202.1,
  propellant_t: 1000,
  ice_fraction: 0.5,
  power_kw: 100,
  operating_hours_per_sol: 12,
}

test('briefing completo en AP-1', async () => {
  const briefing = await buildBriefing(base)
  assert.equal(briefing.site.id, 'ap1')
  assert.equal(briefing.deposit.has_data, true)
  assert.equal(briefing.isru.water_required_t, 450)
  assert.equal(briefing.isru.soil_volume_m3, 1000)
  assert.equal(briefing.priority, 'MEDIUM')
  assert.equal(briefing.recommendation, 'EXTRAER AQUÍ')
  assert.ok(briefing.generated_at)
  assert.ok(briefing.sources.length > 0)
})

test('briefing rechaza ISRU inválido', async () => {
  await assert.rejects(
    buildBriefing({ ...base, propellant_t: -1 }),
    (error) => error.status === 400 && error.code === 'invalid_input',
  )
})

test('export markdown', async () => {
  const markdown = formatBriefingMarkdown(await buildBriefing(base))
  assert.match(markdown, /# Briefing de extracción/)
  assert.match(markdown, /Agua requerida: 450 t/)
})
