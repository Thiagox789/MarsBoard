export const DEFAULTS = {
  waterPerPropellant: 0.45,
  densityIceKgM3: 900,
  energyPerWaterTonneKwh: 556,
  ch4Share: 0.28,
  o2Share: 0.72,
  systemMassPerWaterTonne: {
    excavator_t: 40 / 450,
    extractor_t: 26 / 450,
    isru_plant_t: 28 / 450,
    liquefaction_t: 1.6 / 450,
  },
}

function toNumber(value) {
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return value
}

export function normalizeIceFraction(value) {
  const n = toNumber(value)
  if (typeof n !== 'number' || !Number.isFinite(n)) return n
  if (n > 1 && n <= 100) return n / 100
  return n
}

export function validateIsruInput(body = {}) {
  const input = {
    propellant_t: toNumber(body.propellant_t),
    ice_fraction: normalizeIceFraction(body.ice_fraction),
    power_kw: toNumber(body.power_kw),
    operating_hours_per_sol: toNumber(body.operating_hours_per_sol),
  }
  const errors = []

  if (!(input.propellant_t > 0)) {
    errors.push('propellant_t debe ser un número mayor que 0')
  }
  if (!(input.ice_fraction > 0 && input.ice_fraction <= 1)) {
    errors.push('ice_fraction debe estar entre 0 y 1 (o entre 1 y 100 como porcentaje)')
  }
  if (!(input.power_kw > 0)) {
    errors.push('power_kw debe ser un número mayor que 0')
  }
  if (!(input.operating_hours_per_sol > 0 && input.operating_hours_per_sol <= 24)) {
    errors.push('operating_hours_per_sol debe estar entre 0 y 24')
  }

  return { errors, input }
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function calculateIsru(input) {
  const {
    propellant_t,
    ice_fraction,
    power_kw,
    operating_hours_per_sol,
  } = input

  const waterRequiredT = input.water_required_t ?? propellant_t * DEFAULTS.waterPerPropellant
  const soilVolumeM3 = (waterRequiredT * 1000) / (ice_fraction * DEFAULTS.densityIceKgM3)
  const energyKwh = waterRequiredT * DEFAULTS.energyPerWaterTonneKwh
  const daysEstimate = energyKwh / (power_kw * operating_hours_per_sol)

  const systems = Object.fromEntries(
    Object.entries(DEFAULTS.systemMassPerWaterTonne).map(([key, perTonne]) => [
      key,
      round(waterRequiredT * perTonne),
    ]),
  )

  return {
    water_required_t: round(waterRequiredT),
    soil_volume_m3: round(soilVolumeM3),
    energy_kwh: round(energyKwh),
    days_estimate: round(daysEstimate, 1),
    systems,
    products: {
      ch4_t: round(propellant_t * DEFAULTS.ch4Share),
      o2_t: round(propellant_t * DEFAULTS.o2Share),
    },
    reaction: 'CO2 + 4H2 -> CH4 + 2H2O; 2H2O -> 2H2 + O2',
    inputs: {
      propellant_t,
      ice_fraction,
      ice_percent: round(ice_fraction * 100, 1),
      power_kw,
      operating_hours_per_sol,
    },
    assumptions: [
      `Agua ≈ ${DEFAULTS.waterPerPropellant} × propelente (H en H₂O ≈ 5% del propelente CH₄/O₂).`,
      `Densidad de hielo/mezcla ${DEFAULTS.densityIceKgM3} kg/m³.`,
      `Energía específica ${DEFAULTS.energyPerWaterTonneKwh} kWh por tonelada de agua (extracción + electrólisis + Sabatier + licuefacción).`,
      'Mezcla de propelente 28% CH₄ / 72% O₂ en masa (prioriza O₂ tipo Raptor).',
      'Masas de sistemas escaladas linealmente con el agua requerida.',
      'Días = energía total / (potencia × horas de operación por sol).',
    ],
  }
}
