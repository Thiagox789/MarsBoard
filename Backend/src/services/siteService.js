import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dataUrl = new URL('../data/site-ap1.json', import.meta.url)
const ap1 = JSON.parse(readFileSync(fileURLToPath(dataUrl), 'utf8'))

const sites = new Map([[ap1.id, ap1]])

export function getSite(id) {
  return sites.get(String(id).toLowerCase()) ?? null
}
