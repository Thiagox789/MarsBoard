import { BASEMAP_LAYERS, getTile, tileIndex } from '../src/services/tileService.js'

const BBOX = { minLon: 199, minLat: 38, maxLon: 205, maxLat: 43 }
const CONCURRENCY = 6

function tileRange(z) {
  const topLeft = tileIndex(BBOX.maxLat, BBOX.minLon, z)
  const bottomRight = tileIndex(BBOX.minLat, BBOX.maxLon, z)
  return {
    x0: topLeft.x,
    x1: bottomRight.x,
    y0: topLeft.y,
    y1: bottomRight.y,
  }
}

const zooms = process.argv[2]
  ? process.argv[2].split(',').map((value) => Number(value.trim()))
  : [6, 7, 8]

const tasks = []
for (const layer of Object.keys(BASEMAP_LAYERS)) {
  for (const z of zooms) {
    const range = tileRange(z)
    for (let x = range.x0; x <= range.x1; x += 1) {
      for (let y = range.y0; y <= range.y1; y += 1) {
        tasks.push({ layer, z, x, y })
      }
    }
  }
}

let finished = 0
let ok = 0
let fallback = 0
let failed = 0

async function worker(queue) {
  while (queue.length > 0) {
    const task = queue.shift()
    try {
      const result = await getTile(task.layer, task.z, task.x, task.y)
      if (result.fallback) fallback += 1
      else ok += 1
    } catch (error) {
      failed += 1
      console.error(`${task.layer} ${task.z}/${task.x}/${task.y}: ${error.message}`)
    }
    finished += 1
    if (finished % 25 === 0 || finished === tasks.length) {
      console.log(`${finished}/${tasks.length} tiles`)
    }
  }
}

console.log(`Precache: ${tasks.length} tiles (zooms ${zooms.join(', ')})`)
const queue = [...tasks]
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))
console.log(`Listo: ${ok} cacheados, ${fallback} fallback, ${failed} errores`)
if (failed > 0) process.exitCode = 1
