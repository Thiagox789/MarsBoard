import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateIsru,
  normalizeIceFraction,
  validateIsruInput,
} from '../src/services/isruService.js'

const base = {
  propellant_t: 1000,
  ice_fraction: 0.5,
  power_kw: 100,
  operating_hours_per_sol: 12,
}

test('agua ≈ 0.45 × propelente', () => {
  const result = calculateIsru({ ...base })
  assert.equal(result.water_required_t, 450)
})

test('menor % de hielo implica más volumen de suelo', () => {
  const rich = calculateIsru({ ...base, ice_fraction: 0.8 })
  const poor = calculateIsru({ ...base, ice_fraction: 0.1 })
  assert.ok(poor.soil_volume_m3 > rich.soil_volume_m3)
})

test('acepta porcentaje 3–100 y lo normaliza', () => {
  assert.equal(normalizeIceFraction(50), 0.5)
  assert.equal(normalizeIceFraction(0.5), 0.5)
  assert.equal(validateIsruInput({ ...base, ice_fraction: 50 }).errors.length, 0)
})

test('valida inputs inválidos', () => {
  const { errors } = validateIsruInput({
    propellant_t: -1,
    ice_fraction: 0,
    power_kw: 0,
    operating_hours_per_sol: 30,
  })
  assert.equal(errors.length, 4)
})
