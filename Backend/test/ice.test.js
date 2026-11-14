import assert from 'node:assert/strict'
import test from 'node:test'
import { MANIFEST, pixelFor, sampleIce, wehFromNeutron } from '../src/services/iceService.js'

test('AP-1 devuelve hielo y profundidad', async () => {
  const sample = await sampleIce(39.8, 202.1)
  assert.equal(sample.has_data, true)
  assert.ok(sample.swim.consistency_0_1m > 0)
  assert.ok(sample.swim.consistency_1_5m > 0)
  assert.ok(sample.swim.consistency_gt5m > 0)
  assert.equal(sample.weh_percent, 17.7)
  assert.equal(sample.weh_source, 'swim_weh_layer')
  assert.equal(sample.depth_hint_m, '0.08-0.12')
  assert.equal(sample.depth_hint_cm, '8-12 cm')
  assert.ok(sample.interface_depth_m > 40 && sample.interface_depth_m < 45)
  assert.ok(sample.terrain.elevation_m < -3800 && sample.terrain.elevation_m > -4200)
  assert.ok(sample.terrain.slope_deg >= 0 && sample.terrain.slope_deg < 5)
  assert.ok(sample.sources.includes('SWIM 2.0 (PSI)'))
  assert.ok(sample.sources.includes('MOLA DEM 463 m (USGS)'))
})

test('normaliza longitud -157.9 a 202.1', async () => {
  const east = await sampleIce(39.8, 202.1)
  const signed = await sampleIce(39.8, -157.9)
  assert.equal(signed.lon, 202.1)
  assert.deepEqual(signed.swim, east.swim)
  assert.equal(signed.weh_percent, east.weh_percent)
})

test('fuera de cobertura devuelve has_data false', async () => {
  const sample = await sampleIce(0, 0)
  assert.equal(sample.has_data, false)
  assert.equal(sample.swim.consistency_0_1m, null)
  assert.match(sample.message, /Sin cobertura SWIM/)
})

test('pixel AP-1', () => {
  assert.deepEqual(pixelFor(202.1, 39.8), { row: 64, col: 61 })
})

test('inversión WEH desde neutrón', () => {
  assert.equal(wehFromNeutron(1), 25)
  assert.equal(wehFromNeutron(-1), 5)
  assert.ok(Math.abs(wehFromNeutron(0.5) - 17.5) < 1e-9)
  assert.equal(wehFromNeutron(null), null)
})

test('manifiesto incluye capas por profundidad', () => {
  const kinds = MANIFEST.layers.map((layer) => layer.kind)
  assert.ok(kinds.includes('c0_1'))
  assert.ok(kinds.includes('c1_5'))
  assert.ok(kinds.includes('gt5m'))
  assert.ok(kinds.includes('weh'))
  assert.ok(kinds.includes('dem'))
  assert.ok(kinds.includes('slope'))
})
