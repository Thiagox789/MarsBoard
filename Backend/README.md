# MARSBOARD Backend

API de prospección de hielo y planificación ISRU para **AP-1**
(39.8 °N, 202.1 °E, límite Arcadia Planitia / norte Amazonis Planitia).

El backend sirve:

- muestreo de hielo SWIM 2.0 por profundidad (0–1 m, 1–5 m, >5 m);
- WEH (water-equivalent hydrogen) derivado de neutrones Odyssey;
- elevación y pendiente MOLA;
- tiles de basemap de Marte con caché;
- tiles de hielo/WEH generados desde los GeoTIFF;
- ranking de depósitos;
- calculadora ISRU agua → CH₄/O₂;
- briefing de extracción en JSON y Markdown.

**Estado:** B1–B7 de [`docs/BACKEND_ISSUES.md`](../docs/BACKEND_ISSUES.md)
implementados y testeados (29 tests).

---

## Stack

- Node.js **20+** (probado con Node 26)
- Express 4, CORS, dotenv
- `geotiff` para leer los GeoTIFF recortados
- `pngjs` para renderizar tiles PNG
- `node:test` para tests
- Datos: GeoTIFF recortados ya incluidos en `src/data/swim/`
- Preparación opcional de datos: Python 3 + `rasterio` + `numpy`

No requiere API key de NASA para los tiles: se piden directo a Mars Trek y
ArcGIS OnMars.

---

## Inicio rápido

```bash
cd Backend
npm install
cp .env.example .env        # opcional; hay defaults
npm run dev                 # http://localhost:4000
```

Verificación:

```bash
curl http://localhost:4000/health
curl "http://localhost:4000/api/ice/sample?lat=39.8&lon=202.1"
```

Tests:

```bash
npm test
```

Precache opcional de basemap para la ventana AP-1 (z6–z8):

```bash
npm run precache
```

Los datos ya están en el repo; no hace falta descargar SWIM para levantar la
API. Para regenerar WEH/DEM/pendiente:

```bash
python scripts/prepare_terrain.py
```

Requiere `rasterio` y `numpy`. El DEM MOLA se lee por `/vsicurl/` y puede tardar
~90 s; también se puede usar un GeoTIFF local con
`MOLA_DEM_PATH=/ruta/al/dem.tif`.

---

## Configuración

Variables en `.env` (todas opcionales):

| Variable | Default | Uso |
|---|---|---|
| `PORT` | `4000` | Puerto HTTP |
| `CORS_ORIGIN` | `http://localhost:3000` | Origen permitido por CORS |
| `NASA_API_KEY` | — | **No se usa**; los tiles van directo a Mars Trek/ArcGIS |

`dotenv/config` carga `.env` automáticamente. `.env` está ignorado por git.

---

## Estructura

```
Backend/
├── src/
│   ├── index.js              # Express, CORS, error handler
│   ├── routes/               # health, site, ice, tiles, deposits, isru, briefing
│   ├── services/             # lógica de datos, tiles, ranking, ISRU, briefing
│   ├── utils/                # geo (Haversine, clamp, round), httpError
│   └── data/
│       ├── site-ap1.json     # ficha curada de AP-1
│       ├── README.md         # detalle de capas, CRS, WEH y regeneración
│       ├── swim/             # GeoTIFF recortados + manifest + overlay
│       └── cache/tiles/      # caché de basemap (ignorada por git)
├── scripts/
│   ├── precache_tiles.js     # descarga basemap de la ventana AP-1
│   └── prepare_terrain.py    # genera WEH, DEM y pendiente
├── test/                     # tests de ice, tiles, rank, briefing, isru
├── .env.example
├── package.json
└── README.md
```

---

## Endpoints

Formato de error uniforme:

```json
{ "error": "invalid_input", "message": "…", "details": ["…"] }
```

`details` solo aparece cuando aporta información (por ejemplo, validaciones).

### Salud

```http
GET /health
```

```json
{
  "status": "ok",
  "service": "marsboard-backend",
  "timestamp": "2026-11-14T16:00:00.000Z"
}
```

### Sitio AP-1

```http
GET /api/site/ap1
```

Devuelve la ficha curada: coordenadas, elevación, ice table, capa de exceso,
volumen de hielo, WEH, seguridad de aterrizaje, features cercanas, potencial
ISRU y `sources` con papers. El id es case-insensitive (`AP1`, `ap1`).

### Muestreo de hielo

```http
GET /api/ice/sample?lat=39.8&lon=202.1
GET /api/ice/sample?lat=39.8&lon=-157.9   # misma celda, longitud firmada
```

- `lon` acepta 0–360 o −180–180.
- Fuera de la ventana AP-1 devuelve `200` con `has_data: false` y un mensaje.
- `lat` fuera de −90..90 → `400 invalid_coordinates`.

Respuesta real en AP-1:

```json
{
  "lat": 39.8,
  "lon": 202.1,
  "swim": {
    "consistency_0_1m": 0.131,
    "consistency_1_5m": 0.5,
    "consistency_gt5m": 0.525,
    "swim_1_0": 0.131
  },
  "weh_percent": 17.7,
  "weh_source": "swim_weh_layer",
  "depth_hint_m": "0.08-0.12",
  "depth_hint_cm": "8-12 cm",
  "interface_depth_m": 42.4,
  "neutron_consistency": 0.513,
  "terrain": {
    "elevation_m": -3920,
    "slope_deg": 0.05
  },
  "context": {
    "geomorphology": 0.6,
    "radar_dielectric": 0.097,
    "radar_power": 0,
    "thermal": 0,
    "swim1_consistency": 0.242
  },
  "has_data": true,
  "sources": [
    "SWIM 2.0 (PSI)",
    "Odyssey Neutron Spectrometer (Pathare 2018)",
    "Bramson et al. 2015 (depth to interface)",
    "MOLA DEM 463 m (USGS)"
  ],
  "message": null
}
```

Otros endpoints de hielo:

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/ice/manifest` | Manifest de capas, bbox, grilla y metadatos WEH |
| `GET` | `/api/ice/overlay.png` | Overlay RGBA 480×400 de consistencia 0–1 m |

### Tiles de basemap

```http
GET /api/tiles/basemap/:layer/:z/:x/:y.:ext
GET /api/tiles/basemap/:layer/:z/:x/:y
```

Capas disponibles (`/api/tiles/layers`):

| `layer` | Producto | Formato | Tile |
|---|---|---|---|
| `mola` | MOLA color hillshade 463 m | JPEG | 256 px |
| `themis_day` | THEMIS Day IR 100 m | PNG | 256 px |
| `themis_night` | THEMIS Night IR 100 m | PNG | 256 px |
| `ctx` | CTX mosaic | PNG | 512 px |
| `hirise` | HiRISE mosaic | PNG | 512 px |

- `z` permitido: `0..8`.
- Matriz `2^(z+1) × 2^z`, origen **lon −180 / lat 90**, `y` top-origin.
- AP-1 en `z=7` → `x=15, y=35`.
- Helper: `GET /api/tiles/xyz?lat=39.8&lon=202.1&z=7` → `{ "z": 7, "x": 15, "y": 35 }`.
- Tiles en disco en `src/data/cache/tiles/<layer>/<z>/<x>/<y>.<ext>`.
- `ETag`, `Cache-Control: public, max-age=86400, immutable` y `304`.
- Timeout de 10 s; un 404 upstream devuelve un PNG transparente 1×1 con
  `X-Tile-Fallback: 1`; un timeout devuelve `502 upstream_unreachable`.
- Las capas CTX/HiRISE son de 512 px: el frontend debe usar `tileSize: 512`
  para esas capas.

### Tiles de hielo y WEH

```http
GET /api/tiles/swim/:z/:x/:y.png          # consistencia 0-1 m
GET /api/tiles/weh/:z/:x/:y.png           # WEH %
GET /api/tiles/ice/:kind/:z/:x/:y.png     # kind: c0_1, c1_5, gt5m, weh
```

- Se generan al vuelo desde los GeoTIFF recortados (sin depender de la red).
- 256×256, muestreo bilineal, celdas sin dato transparentes.
- Caché en memoria (512 tiles) + ETag/304.
- Colormap SWIM: rojo (0) → amarillo → verde (1).
- Colormap WEH: marrón (5 %) → crema (15 %) → verde azulado (25 %).
- `/api/tiles/layers` incluye `ice_layers` y los alias.

### Ranking de depósitos

```http
GET /api/deposits/rank?bbox=199,38,205,43&limit=20
```

- `bbox` opcional; default es la ventana AP-1. Formato
  `minLon,minLat,maxLon,maxLat`; acepta longitudes negativas.
- `limit`: entero 1–200 (default 20).
- Score:

```
score = 0.5 * c0_1 + 0.3 * c1_5 + 0.2 * (weh / 25)
score *= 1 - min(0.3, distancia_km / 300)
score *= 1 - penalidad_pendiente
```

`penalidad_pendiente` va de 0 (≤10°) a 0.3 (≥25°), lineal entre ambos.
Resultado cacheado 1 h por `bbox + limit`.

Respuesta (recortada):

```json
{
  "deposits": [
    {
      "lat": 40.125,
      "lon": 202.625,
      "score": 0.618,
      "swim_0_1m": 0.444,
      "swim_1_5m": 1,
      "weh_percent": 20.9,
      "elevation_m": -3909,
      "slope_deg": 0.05,
      "distance_from_ap1_km": 30.7,
      "priority": "HIGH"
    }
  ],
  "bbox": "199,38,205,43",
  "count": 1,
  "grid_step_deg": 0.05,
  "weights": { "consistency_0_1m": 0.5, "consistency_1_5m": 0.3, "weh": 0.2 },
  "terrain_penalty": { "max": 0.3, "starts_deg": 10, "full_deg": 25 },
  "generated_at": "2026-11-14T16:00:00.000Z",
  "cached": false
}
```

Prioridad: `HIGH` ≥ 0.45, `MEDIUM` ≥ 0.30, `LOW` < 0.30.

### Calculadora ISRU

```http
POST /api/isru/calculate
Content-Type: application/json

{
  "propellant_t": 1000,
  "ice_fraction": 0.5,
  "power_kw": 100,
  "operating_hours_per_sol": 12
}
```

`ice_fraction` acepta fracción (0–1) o porcentaje (1–100).

```json
{
  "water_required_t": 450,
  "soil_volume_m3": 1000,
  "energy_kwh": 250200,
  "days_estimate": 208.5,
  "systems": {
    "excavator_t": 40,
    "extractor_t": 26,
    "isru_plant_t": 28,
    "liquefaction_t": 1.6
  },
  "products": { "ch4_t": 280, "o2_t": 720 },
  "reaction": "CO2 + 4H2 -> CH4 + 2H2O; 2H2O -> 2H2 + O2",
  "inputs": {
    "propellant_t": 1000,
    "ice_fraction": 0.5,
    "ice_percent": 50,
    "power_kw": 100,
    "operating_hours_per_sol": 12
  },
  "assumptions": ["…"]
}
```

Fórmulas y supuestos principales:

- `water_t ≈ 0.45 × propellant_t`.
- `soil_m3 = water_t × 1000 / (ice_fraction × 900 kg/m³)`.
- `energy_kwh = water_t × 556 kWh/t`.
- `days = energy_kwh / (power_kw × operating_hours_per_sol)`.
- Productos: 28 % CH₄ / 72 % O₂ en masa.
- Masas de sistemas escaladas linealmente con el agua requerida.

### Briefing de extracción

```http
POST /api/briefing
Content-Type: application/json

{
  "lat": 39.8,
  "lon": 202.1,
  "propellant_t": 1000,
  "ice_fraction": 0.5
}
```

`power_kw` y `operating_hours_per_sol` son opcionales; default **100 kW** y
**12 h/sol**. `lon` acepta 0–360 o longitud firmada.

Respuesta:

```json
{
  "site": { "id": "ap1", "name": "AP-1 (Arcadia/Amazonis prime site)", "…": "…" },
  "deposit": { "…": "…" },
  "isru": { "…": "…" },
  "recommendation": "EXTRAER AQUÍ",
  "priority": "MEDIUM",
  "deposit_score": 0.357,
  "risks": ["…"],
  "sources": ["…"],
  "generated_at": "2026-11-14T16:00:00.000Z"
}
```

Recomendación: `SIN DATOS SUFICIENTES`, `EXTRAER AQUÍ` si el score ≥ 0.3, o
`EVALUAR / REQUIERE MÁS DATOS`.

Export Markdown:

```http
GET /api/briefing/export?lat=39.8&lon=202.1&propellant_t=1000&ice_fraction=0.5
```

Devuelve `text/markdown; charset=utf-8` con sitio, hielo, ISRU, riesgos y
fuentes. Acepta los mismos parámetros que el POST.

---

## Datos

Ventana: **lon 199–205 °E, lat 38–43 °N**, grilla **120×100**,
resolución **0.05° (~3 km)**, CRS esfera marciana
`a = b = 3 396 190 m` (lon/lat geográficas). AP-1 cae en fila **64**,
columna **61**.

Capas principales en `src/data/swim/`:

| Archivo | `kind` | Contenido | Unidades | nodata |
|---|---|---|---|---|
| `swim_ap1_consistency_0_1m.tif` | `c0_1` | SWIM 2.0 hielo 0–1 m | 0–1 | -100 |
| `swim_ap1_consistency_1_5m.tif` | `c1_5` | SWIM 2.0 hielo 1–5 m | 0–1 | -100 |
| `swim_ap1_consistency_gt5m.tif` | `gt5m` | SWIM 2.0 hielo >5 m | 0–1 | -100 |
| `swim_ap1_ice_consistency.tif` | `ci_swim1` | SWIM 1.0 combinada | 0–1 | -30 |
| `swim_ap1_neutron_weh.tif` | `neutron` | Neutrón Pathare escalado | -1..1 | -30 |
| `swim_ap1_weh.tif` | `weh` | WEH Pathare 2018 | % | -9999 |
| `swim_ap1_depth.tif` | `depth` | Interfaz inferior | m | -30 |
| `swim_ap1_geomorphology.tif` | `geomorphology` | Consistencia geomorfológica | 0–1 | -200 |
| `swim_ap1_radar_dielectric.tif` | `radar_dielectric` | Consistencia dieléctrica | 0–1 | -30 |
| `swim_ap1_radar_power.tif` | `radar_power` | Potencia radar | 0–1 | -30 |
| `swim_ap1_thermal.tif` | `thermal` | Consistencia térmica | 0–1 | -30 |
| `mola_ap1_dem.tif` | `dem` | DEM MOLA 463 m | m | -32768 |
| `mola_ap1_slope.tif` | `slope` | Pendiente | grados | -9999 |

Detalle completo de capas, CRS, WEH y regeneración:
[`src/data/README.md`](src/data/README.md).

### WEH

`SWIM2_N` / `Northern_Cn` publican el WEH **escalado** a la ecuación SWIM:

```
n >= 0  ->  weh = 10 + 15 * n
n <  0  ->  weh = 10 + 5  * n
n >= 1  ->  weh >= 25 %
```

`swim_ap1_weh.tif` es la inversión celda por celda. El ráster W_dn original de
Pathare 2018 no se distribuye aparte (`Northern_Cn_Ancillary.zip` solo trae el
README); la inversión es exacta en 5–25 % y queda recortada fuera de ese rango.
AP-1 (17.7 %) no se ve afectado.

### DEM y pendiente

`mola_ap1_dem.tif` viene del DEM global MOLA 463 m de USGS, remuestreado
bilineal a 0.05°. `mola_ap1_slope.tif` se calcula con gradientes sobre esa
grilla y radio marciano 3396.19 km. En AP-1 la pendiente es ~0.05° y el máximo
de la ventana ~2.2°.

### Fuentes

- SWIM 2.0 / SWIM 1.0, Planetary Science Institute: <https://swim.psi.edu/>
- Pathare et al. 2018, *Icarus* 301, 97–116 (Odyssey Neutron Spectrometer)
- Bramson et al. 2015 (capa de exceso y profundidad)
- Golombek et al. 2021 (seguridad de aterrizaje)
- Luzzi et al. 2025 (ice table)
- MOLA DEM 463 m, USGS Astrogeology

Atribuir estas fuentes si se publican mapas, capturas o resultados derivados.

---

## Caché

- **Basemap:** disco en `src/data/cache/tiles/` (ignorado por git). Se llena
  al usar la API o con `npm run precache`.
- **Tiles de hielo/WEH:** memoria, hasta 512 tiles por proceso; se regeneran
  desde los GeoTIFF si se reinicia.
- **Ranking:** memoria, TTL 1 h por `bbox + limit`.
- **Overlay:** archivo estático servido con `Cache-Control` inmutable.
- Los tiles de basemap responden `ETag` y `304`; los de hielo también.

Precache ejecutado de referencia: 505 tiles, 433 cacheados, 72 fallbacks,
~24 MB. Los fallbacks (404 upstream) no se guardan en disco.

---

## Tests

```bash
npm test
```

Cobertura actual: **29 tests** en `test/`:

- `ice.test.js`: sample AP-1, normalización de longitud, fuera de cobertura,
  inversión WEH, capas del manifest.
- `iceTiles.test.js`: bounds, tiles SWIM/WEH, transparencia, caché/ETag.
- `tiles.test.js`: índice y validación de la matriz de tiles.
- `rank.test.js`: orden, bbox, score, penalidad por pendiente, terreno.
- `briefing.test.js`: briefing completo, defaults, validación, Markdown.
- `isru.test.js`: fórmulas y validación.

No hay script de lint ni de typecheck (proyecto JavaScript ESM).

---

## Limitaciones y advertencias

- La resolución SWIM es ~3 km; **no** reemplaza imágenes de alta resolución ni
  un estudio de ingeniería antes de una misión.
- Las capas de consistencia son un índice relativo, no una medición directa de
  hielo. El WEH tiene incertidumbre y saturación en los extremos.
- La capa térmica es 0 en toda la ventana AP-1 y la potencia radar es 0 en
  AP-1; SWIM ya las combina en las capas de consistencia.
- No hay datos REMS/clima en tiempo real; el briefing declara ese riesgo y usa
  supuestos de operación.
- `Northern_Cim.tif` se descartó: es una figura RGB de Illustrator sin CRS ni
  geotransformación.
- La matriz de tiles **no es Web Mercator estándar**: es `2^(z+1) × 2^z` con
  origen lon −180/lat 90. Usar `/api/tiles/xyz` y `tileSize` por capa
  (256 px salvo CTX/HiRISE, 512 px).
- La caché de basemap no se versiona; si se necesita una demo 100 % offline,
  ejecutar `npm run precache` antes.

---

## Troubleshooting

| Síntoma | Causa / solución |
|---|---|
| `502 upstream_unreachable` en tiles | Sin red o timeout de Mars Trek/ArcGIS. Reintentar o usar caché/precache. |
| `400 invalid_tile` | `z > 8` o `x/y` fuera de la matriz. Usar `/api/tiles/xyz`. |
| El mapa Leaflet se ve desplazado | Recordar el origen lon −180/lat 90 y la matriz `2^(z+1) × 2^z`. |
| CTX/HiRISE con huecos | El frontend debe usar `tileSize: 512` para esas capas. |
| CORS bloqueado | Ajustar `CORS_ORIGIN` al origen real del frontend. |
| `EADDRINUSE` | Cambiar `PORT` en `.env`. |
| `prepare_terrain.py` muy lento | `/vsicurl/` descarga filas del DEM; usar `MOLA_DEM_PATH` local. |
| Error al leer GeoTIFF | Verificar que `src/data/swim/*.tif` exista y `npm install` esté completo. |

---

## Checklist B1–B7

| Issue | Estado | Implementación |
|---|---|---|
| B1 Scaffold | ✅ | Express, CORS, dotenv, `/health`, estructura `routes/services/data/utils` |
| B2 Tiles NASA | ✅ | `/api/tiles/basemap`, 5 capas, caché disco, ETag, timeout, fallback |
| B3 Hielo/WEH | ✅ | `/api/ice/sample`, manifest, overlay, tiles SWIM/WEH |
| B4 Sitio AP-1 | ✅ | `site-ap1.json` + `/api/site/ap1` con fuentes |
| B5 Ranking | ✅ | `/api/deposits/rank` con distancia, pendiente y caché 1 h |
| B6 ISRU | ✅ | `/api/isru/calculate` con fórmulas, supuestos y validación |
| B7 Briefing | ✅ | `/api/briefing` + `/api/briefing/export` (Markdown) |
