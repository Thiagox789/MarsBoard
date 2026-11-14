import assert from 'node:assert/strict'
import test from 'node:test'
import { parseBbox, rankDeposits, rawScore, slopePenalty } from '../src/services/rankService.js'

test('ranking ordenado y limitado', async () => {
  const result = await rankDeposits({ bbox: '199,38,205,43', limit: 10 })
  assert.equal(result.count, 10)
  assert.equal(result.deposits.length, 10)
  for (let index = 1; index < result.deposits.length; index += 1) {
    assert.ok(result.deposits[index - 1].score >= result.deposits[index].score)
  }
  assert.ok(result.deposits.every((deposit) => deposit.distance_from_ap1_km >= 0))
  assert.ok(result.deposits.every((deposit) => ['LOW', 'MEDIUM', 'HIGH'].includes(deposit.priority)))
})

test('bbox con longitud negativa se normaliza', () => {
  const bbox = parseBbox('-161,38,-155,43')
  assert.equal(bbox.minLon, 199)
  assert.equal(bbox.maxLon, 205)
})

test('bbox inválido u fuera de cobertura', () => {
  assert.throws(() => parseBbox('1,2,3'), /bbox/)
  assert.throws(() => parseBbox('0,0,10,10'), /cobertura/)
})

test('el score prioriza hielo somero', () => {
  assert.ok(rawScore(0.9, 0.1, 5) > rawScore(0.1, 0.9, 5))
})

test('penalidad por pendiente', () => {
  assert.equal(slopePenalty(null), 0)
  assert.equal(slopePenalty(5), 0)
  assert.equal(slopePenalty(10), 0)
  assert.ok(Math.abs(slopePenalty(25) - 0.3) < 1e-9)
  assert.equal(slopePenalty(40), 0.3)
})

test('ranking incluye elevación y pendiente', async () => {
  const result = await rankDeposits({ bbox: '199,38,205,43', limit: 1 })
  const deposit = result.deposits[0]
  assert.ok(deposit.elevation_m != null)
  assert.ok(deposit.slope_deg != null)
  assert.ok(deposit.slope_deg < 10)
  assert.deepEqual(result.terrain_penalty, { max: 0.3, starts_deg: 10, full_deg: 25 })
})
