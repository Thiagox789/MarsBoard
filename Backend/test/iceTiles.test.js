import assert from 'node:assert/strict'
import test from 'node:test'
import { PNG } from 'pngjs'
import { clearIceTileCache, getIceTile } from '../src/services/iceTileService.js'
import { tileBounds } from '../src/services/tileService.js'

function countOpaque(png) {
  let count = 0
  for (let index = 3; index < png.data.length; index += 4) {
    if (png.data[index] > 0) count += 1
  }
  return count
}

test('bounds del tile AP-1 en z7', () => {
  const bounds = tileBounds(7, 15, 35)
  assert.ok(Math.abs(bounds.west - (-180 + (15 / 256) * 360)) < 1e-9)
  assert.ok(bounds.west < -157.9 && bounds.east > -157.9)
  assert.ok(bounds.south < 39.8 && bounds.north > 39.8)
})

test('tile SWIM 0-1 m de AP-1 tiene datos', async () => {
  const result = await getIceTile('c0_1', 7, 15, 35)
  const png = PNG.sync.read(result.buffer)
  assert.equal(png.width, 256)
  assert.equal(png.height, 256)
  assert.ok(countOpaque(png) > 0)
})

test('tile WEH de AP-1 tiene datos', async () => {
  const result = await getIceTile('weh', 7, 15, 35)
  const png = PNG.sync.read(result.buffer)
  assert.ok(countOpaque(png) > 0)
})

test('tile fuera de cobertura es transparente', async () => {
  const result = await getIceTile('c0_1', 7, 0, 0)
  const png = PNG.sync.read(result.buffer)
  assert.equal(countOpaque(png), 0)
})

test('cache y ETag de tiles de hielo', async () => {
  clearIceTileCache()
  const first = await getIceTile('c0_1', 7, 15, 35)
  const second = await getIceTile('c0_1', 7, 15, 35)
  const third = await getIceTile('c0_1', 7, 15, 35, first.etag)
  assert.equal(first.cached, false)
  assert.equal(second.cached, true)
  assert.equal(third.notModified, true)
})

test('rechaza capas de hielo desconocidas', async () => {
  await assert.rejects(() => getIceTile('nope', 7, 15, 35), /Capa de hielo desconocida/)
})
