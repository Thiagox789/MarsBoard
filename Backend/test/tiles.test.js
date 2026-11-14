import assert from 'node:assert/strict'
import test from 'node:test'
import { tileIndex, validateTile } from '../src/services/tileService.js'

test('índice de tile de AP-1 en z7', () => {
  assert.deepEqual(tileIndex(39.8, 202.1, 7), { z: 7, x: 15, y: 35 })
})

test('longitud firmada y 0-360 dan el mismo tile', () => {
  assert.deepEqual(tileIndex(39.8, -157.9, 7), tileIndex(39.8, 202.1, 7))
})

test('valida límites de la matriz 2^(z+1) x 2^z', () => {
  assert.doesNotThrow(() => validateTile('mola', 7, 255, 127))
  assert.throws(() => validateTile('mola', 7, 256, 35), /x debe/)
  assert.throws(() => validateTile('mola', 7, 15, 128), /y debe/)
  assert.throws(() => validateTile('mola', 9, 0, 0), /z debe/)
  assert.throws(() => validateTile('nope', 7, 15, 35), /Capa/)
})
