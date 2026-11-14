export const MARS_RADIUS_KM = 3396.19

export function normalizeLon(lon) {
  const value = Number(lon)
  if (!Number.isFinite(value)) return NaN
  return ((value % 360) + 360) % 360
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function round(value, decimals = 2) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(((lon2 - lon1 + 540) % 360) - 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * MARS_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}
