import { calculateIsru, validateIsruInput } from './isruService.js'
import { sampleIce } from './iceService.js'
import { getSite } from './siteService.js'
import { priorityFor, rawScore } from './rankService.js'
import { round } from '../utils/geo.js'
import { httpError } from '../utils/httpError.js'

function unique(items) {
  return [...new Set(items)]
}

export async function buildBriefing(body = {}) {
  const lat = Number(body.lat)
  const lon = Number(body.lon)
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw httpError(400, 'invalid_coordinates', 'lat debe ser un número entre -90 y 90')
  }
  if (!Number.isFinite(lon)) {
    throw httpError(400, 'invalid_coordinates', 'lon debe ser un número')
  }

  const { errors, input } = validateIsruInput(body)
  if (errors.length) {
    throw httpError(400, 'invalid_input', 'Parámetros ISRU inválidos', errors)
  }

  const deposit = await sampleIce(lat, lon)
  const site = getSite('ap1')
  const isru = calculateIsru(input)

  const score = deposit.has_data
    ? rawScore(deposit.swim.consistency_0_1m, deposit.swim.consistency_1_5m, deposit.weh_percent)
    : 0
  const priority = priorityFor(score)

  let recommendation
  if (!deposit.has_data) recommendation = 'SIN DATOS SUFICIENTES'
  else if (score >= 0.3) recommendation = 'EXTRAER AQUÍ'
  else recommendation = 'EVALUAR / REQUIERE MÁS DATOS'

  return {
    site,
    deposit,
    isru,
    recommendation,
    priority,
    deposit_score: round(score, 3),
    risks: [
      'La cobertura SWIM tiene resolución de ~3 km; validar con imágenes de alta resolución antes de una misión.',
      'No hay datos meteorológicos REMS en tiempo real; el briefing usa supuestos de operación.',
      'El hielo somero (ice table) y la capa de exceso son estimaciones bibliográficas, no mediciones in situ.',
    ],
    sources: unique([...(site?.sources ?? []), ...deposit.sources]),
    generated_at: new Date().toISOString(),
  }
}

export function formatBriefingMarkdown(briefing) {
  const { site, deposit, isru, recommendation, priority, risks, generated_at } = briefing
  const lines = [
    `# Briefing de extracción — ${site.name}`,
    '',
    `**Coordenadas:** ${deposit.lat}, ${deposit.lon}`,
    `**Sitio:** ${site.region} | elevación ${site.elevation_km} km`,
    `**Recomendación:** ${recommendation} (prioridad ${priority})`,
    `**Generado:** ${generated_at}`,
    '',
    '## Hielo (SWIM)',
    `- Consistencia 0–1 m: ${deposit.swim.consistency_0_1m ?? 'sin dato'}`,
    `- Consistencia 1–5 m: ${deposit.swim.consistency_1_5m ?? 'sin dato'}`,
    `- Consistencia >5 m: ${deposit.swim.consistency_gt5m ?? 'sin dato'}`,
    `- WEH: ${deposit.weh_percent ?? 'sin dato'} %`,
    `- Ice table: ${deposit.depth_hint_m ?? 'sin dato'}`,
    `- Interfaz inferior: ${deposit.interface_depth_m ?? 'sin dato'} m`,
    '',
    '## ISRU',
    `- Propelente: ${isru.inputs.propellant_t} t`,
    `- Agua requerida: ${isru.water_required_t} t`,
    `- Suelo a procesar: ${isru.soil_volume_m3} m³`,
    `- Energía: ${isru.energy_kwh} kWh`,
    `- Duración estimada: ${isru.days_estimate} soles`,
    `- CH₄ / O₂: ${isru.products.ch4_t} t / ${isru.products.o2_t} t`,
    '',
    '## Riesgos',
    ...risks.map((risk) => `- ${risk}`),
    '',
    '## Fuentes',
    ...(briefing.sources ?? []).map((source) => `- ${source}`),
  ]
  return lines.join('\n')
}
