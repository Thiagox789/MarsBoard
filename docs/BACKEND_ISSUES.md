# MARSBOARD — Backend Issues

> **Proyecto:** Identificación de depósitos de agua en Marte para ISRU y producción de combustible de cohete
> **Zona:** AP-1 — 39.8°N, 202.1°E (límite Arcadia Planitia / norte Amazonis Planitia)
> **Stack:** Node.js + Express (o FastAPI si prefieren Python) + cache en disco
> **Carpeta:** `backend/`
> **Guía:** cada issue es un paso general. Marcar ✓ al terminar.

---

## Dependencias entre issues

```
B1 → B2 → B3 → B4 → B5 → B6 → B7
```

---

### B1 — Scaffold de la API
**Objetivo:** servidor Express corriendo con estructura limpia (routes, services, data, cache).

**Tecnologías:**
- Node.js 20+
- Express
- CORS
- dotenv
- Opcional: TypeScript, nodemon

**Pasos:**
1. Init en `backend/` (`package.json`).
2. Estructura:
   ```
   backend/
   ├── src/
   │   ├── index.js          # entry del server
   │   ├── routes/           # rutas por recurso
   │   ├── services/         # lógica NASA/cálculos
   │   ├── data/             # GeoTIFFs, datos curados, caché
   │   └── utils/            # helpers
   ├── .env
   └── package.json
   ```
3. `GET /health` → `{ status: "ok" }`.
4. Puerto default `4000`, CORS abierto para `http://localhost:3000`.
5. Script `npm run dev`.

**Criterio de aceptación:**
- `npm run dev` levanta
- `GET /health` responde 200
- Estructura de carpetas creada

**Dependencias:** ninguna

---

### B2 — Proxy de tiles NASA (Mars Trek / api.nasa.gov)
**Objetivo:** servir tiles de basemap sin problemas de CORS, con caché en disco.

**Tecnologías:**
- Express
- `node-fetch` / fetch nativo
- Caché en disco (`backend/src/data/cache/tiles/`)

**Pasos:**
1. Ruta genérica de tiles, ej:
   - `GET /api/tiles/basemap/:z/:x/:y.jpg`
2. Proxy directo (sin API key; `api.nasa.gov/mars-wmts` es inestable):
   - MOLA: `https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg`
   - THEMIS día/noche: `.../THEMIS_{DayIR|NightIR}_ControlledMosaics_100m_v2_oct2018/1.0.0/default/default028mm/{z}/{y}/{x}.png`
   - CTX: `https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}`
   - HiRISE: `https://astro.arcgis.com/arcgis/rest/services/OnMars/HiRISE/MapServer/tile/{z}/{y}/{x}`
   - Matriz `2^(z+1) × 2^z`, origen lon −180 / lat 90, `y` top-origin. AP-1 en z7 → `x=15, y=35`.
   - Tiles: MOLA/THEMIS 256 px; CTX/HiRISE 512 px.
3. Cachear tile en disco (`src/data/cache/tiles/`, no re-descargar).
4. Headers cache (`Cache-Control`, `ETag`).
5. Timeout + manejo de 404 (tile sin cobertura).

**Criterio de aceptación:**
- Frontend puede pedir tiles vía backend
- Tiles repetidos se sirven de caché
- 404/timeout no tumban el server

**Dependencias:** B1

---

### B3 — Endpoint de muestreo de hielo (SWIM + neutrón)
**Objetivo:** dado lat/lon, devolver scores de hielo y profundidad estimada.

**Tecnologías:**
- Descarga previa de GeoTIFFs SWIM (recortados a ventana AP-1)
- Librería raster: `gdal-async`, `geotiff` (JS) o `rasterio` (Python)
- Opcional: servir también como tiles PNG

**Pasos:**
1. **Preparar datos** (una vez, en `backend/src/data/`):
   - Bajar GeoTIFFs de https://swim.psi.edu/ (SWIM 1.0 / 2.0):
     - SWIM 2.0 Global Composite: `SWIM2_c0_1.tif`, `SWIM2_c1_5.tif`, `SWIM2_c_5.tif`
       (`https://swim.psi.edu/output/SWIM2/Global/Composite/`)
     - Neutron (WEH)
     - Opcional: geomorphology, thermal, radar surface power
   - Recortar/crop a bbox alrededor de AP-1 (~38–42°N, 200–204°E) con `gdalwarp` o rasterio.
2. `GET /api/ice/sample?lat=39.8&lon=202.1` →
   ```json
   {
     "lat": 39.8,
     "lon": 202.1,
     "swim": {
       "consistency_0_1m": 0.82,
       "consistency_1_5m": 0.91,
       "consistency_gt5m": 0.75,
       "swim_1_0": 0.85
     },
     "weh_percent": 18.5,
     "sources": ["SWIM", "Odyssey NS"],
     "depth_hint_m": "0.08-0.12",
     "has_data": true
   }
   ```
3. Normalizar lon a la convención del GeoTIFF (0–360).
4. Fuera de cobertura → `has_data: false` + mensaje.
5. (Extra) `GET /api/tiles/swim/:z/:x/:y.png` → renderizar raster a tile PNG con colormap.

**Criterio de aceptación:**
- Sample en AP-1 devuelve scores > 0 (hielo confirmado)
- Coordenadas fuera de bbox responden sin datos (no 500)
- GeoTIFFs recortados documentados en `data/README`

**Implementado:** `/api/ice/sample`, `/api/ice/manifest` y `/api/ice/overlay.png`.
Además, tiles bajo demanda en `/api/tiles/swim/{z}/{x}/{y}.png`,
`/api/tiles/weh/{z}/{x}/{y}.png` y `/api/tiles/ice/:kind/...`. El sample
incluye `weh_percent`, `weh_source`, `terrain.elevation_m` y `terrain.slope_deg`.

**Dependencias:** B1

---

### B4 — Endpoint de sitio AP-1 (datos curados)
**Objetivo:** servir la ficha del depósito candidato con datos de papers.

**Tecnologías:**
- JSON estático curado

**Pasos:**
1. Crear `backend/src/data/site-ap1.json` con:
   - Coordenadas: 39.8°N, 202.1°E
   - Elevación: −3.9 km (geoide MOLA)
   - Ice table: 8–12 cm (Luzzi et al. 2025)
   - Capa exceso: base mode ~42 m, mean ~51 m (Bramson et al. 2015)
   - Volumen de hielo en Arcadia: ~1.3×10⁴ – 6.1×10⁴ km³
   - WEH: 15–20% (Pathare 2018 / MONS), 11–13% (FREND)
   - Seguridad de aterrizaje: prime site (Golombek et al. 2021)
   - Features cercanas: polígonos ~11 m, brain terrain, cráteres con hielo expuesto (~23 km de AP-1)
   - Potencial ISRU: hielo accesible para electrólisis → CH₄/O₂
2. Ruta `GET /api/site/ap1`.
3. Incluir array `sources` con citas bibliográficas.

**Criterio de aceptación:**
- Endpoint devuelve JSON completo y citado
- Datos coherentes con los papers

**Dependencias:** B1

---

### B5 — Endpoint de ranking de yacimientos
**Objetivo:** devolver los mejores puntos de extracción de agua en un bbox.

**Tecnologías:**
- Mismo raster que B3 (SWIM + WEH)
- Scoring simple

**Pasos:**
1. `GET /api/deposits/rank?bbox=minLon,minLat,maxLon,maxLat&limit=20`
2. Grid sobre el bbox (ej. paso 0.05° o ~3 km, consistente con resolución SWIM ~3 km).
3. Para cada celda calcular score:
   ```
   score = 0.5 * swim_0_1m + 0.3 * swim_1_5m + 0.2 * norm(weh)
   ```
   (ajustar pesos; priorizar hielo somero = más fácil de minar)
4. Penalizar: pendiente alta (opcional con MOLA), lejanía a AP-1.
5. Ordenar desc, devolver top N:
   ```json
   {
     "deposits": [
       {
         "lat": 39.92,
         "lon": 202.35,
         "score": 0.91,
         "swim_0_1m": 0.95,
         "weh_percent": 19.2,
         "distance_from_ap1_km": 18.4,
         "priority": "HIGH"
       }
     ],
     "bbox": "...",
     "count": 20
   }
   ```
6. Cachear resultado por bbox (TTL 1h).

**Criterio de aceptación:**
- Ranking ordenado, sin duplicados
- Incluye distancia a AP-1
- Responde <2s con caché fría

**Implementado:** pendiente y elevación desde MOLA DEM 463 m
(`mola_ap1_slope.tif`, `mola_ap1_dem.tif`). Cada depósito incluye `slope_deg`
y `elevation_m`; la penalidad va de 0 (≤10°) a 0.3 (≥25°) y se expone en
`terrain_penalty`.

**Dependencias:** B3

---

### B6 — Endpoint calculadora ISRU (agua → combustible)
**Objetivo:** convertir requisitos de misión en necesidades de agua/energía/tiempo.

**Tecnologías:**
- Lógica de cálculo pura (tests unitarios simples)

**Pasos:**
1. `POST /api/isru/calculate` body:
   ```json
   {
     "propellant_t": 1000,
     "ice_fraction": 0.5,
     "power_kw": 100,
     "operating_hours_per_sol": 12
   }
   ```
2. Fórmulas base:
   - `water_t ≈ 0.45 * propellant_t` (H en H₂O ≈ 5% del propelente CH₄/O₂)
   - Sabatier: `CO₂ + 4H₂ → CH₄ + 2H₂O` + electrólisis `2H₂O → 2H₂ + O₂`
   - Mix Raptor ≈ 4:1 O₂:CH₄ → priorizar producción de O₂
   - `soil_to_excavate_m³ = water_t * 1000 / (ice_fraction * density_ice)` (density ~900 kg/m³, o regolito ~1500 si mezcla)
   - Energía: usar referencias NASA (extractora + electrólisis + Sabatier + licuefacción); escalar lineal con masa de agua
   - Tiempo: `días = energía_total_kWh / (power_kw * horas_por_sol)`
3. Respuesta:
   ```json
   {
     "water_required_t": 450,
     "soil_volume_m3": 1000,
     "energy_kwh": 250000,
     "days_estimate": 104,
     "systems": {
       "excavator_t": 40,
       "extractor_t": 26,
       "isru_plant_t": 28,
       "liquefaction_t": 1.6
     },
     "products": {
       "ch4_t": 280,
       "o2_t": 720
     },
     "reaction": "CO2 + 4H2 -> CH4 + 2H2O; 2H2O -> 2H2 + O2"
   }
   ```
4. Validar inputs (rangos, positivos).
5. Documentar supuestos en `docs/` o en la respuesta (`assumptions: [...]`).

**Criterio de aceptación:**
- agua ≈ 0.45 × propelente
- % hielo bajo → más suelo a excavar
- Respuesta con supuestos explícitos

**Dependencias:** B1

---

### B7 — Endpoint de briefing de extracción
**Objetivo:** agregar sitio + ranking + cálculo ISRU en un plan exportable.

**Tecnologías:**
- Composición de B4, B5, B6

**Pasos:**
1. `POST /api/briefing` body: `{ lat, lon, propellant_t, ice_fraction }`
2. Internamente:
   - sample de hielo en (lat, lon)
   - info de AP-1
   - cálculo ISRU
   - riesgos/condiciones resumidos (si hay clima REMS, incluir)
3. Respuesta JSON estructurado para el frontend:
   ```json
   {
     "site": { ... },
     "deposit": { ... },
     "isru": { ... },
     "recommendation": "EXTRAER AQUÍ",
     "priority": "HIGH",
     "generated_at": "..."
   }
   ```
4. Opcional: `GET /api/briefing/export?...` → texto plano / Markdown para imprimir.

**Criterio de aceptación:**
- Un solo call arma el briefing completo
- JSON fácil de renderizar en frontend

**Dependencias:** B3, B4, B6

---

## Checklist resumen

| Issue | Título | Estado |
|-------|--------|--------|
| B1 | Scaffold API | ✅ |
| B2 | Proxy de tiles NASA | ✅ |
| B3 | Muestreo de hielo (SWIM/WEH) | ✅ |
| B4 | Sitio AP-1 curado | ✅ |
| B5 | Ranking de yacimientos | ✅ |
| B6 | Calculadora ISRU | ✅ |
| B7 | Briefing de extracción | ✅ |

---

## Datos a descargar (preparación B3)

| Dataset | URL | Uso |
|---------|-----|-----|
| SWIM Combined Ice Consistency | https://swim.psi.edu/ (Products) | Capa principal de hielo |
| SWIM 2.0 por profundidad | `output/SWIM2/Global/Composite/SWIM2_c0_1.tif`, `_c1_5`, `_c_5` | Hielo 0–1, 1–5, >5 m |
| SWIM Neutron (WEH) | https://swim.psi.edu/ | % agua en superficie (escalado; invertir) |
| MOLA DEM 463 m | https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif | Elevación y pendiente |
| GeoTIFF recorte AP-1 | generar con rasterio/gdalwarp | Optimizar tamaño |
| Sitio AP-1 papers | Luzzi 2025, Bramson 2015, Golombek 2021 | Datos curados B4 |

Comando ejemplo de recorte (una vez):
```bash
gdalwarp -overwrite \
  -te 199 38 205 43 \
  -tr 0.05 0.05 \
  SWIM_Combined_North.tif \
  data/swim_ap1.tif
```

El ráster W_dn original de Pathare 2018 no se distribuye aparte: el
`Ancillary.zip` de `Northern_Cn` solo trae el README. Se recupera invirtiendo
el escalado de SWIM (`10 + 15n` / `10 + 5n`).

---

## Notas para el equipo backend
- Puerto `4000`; el frontend usa `NEXT_PUBLIC_API_URL=http://localhost:4000`.
- Nunca exponer keys NASA en respuestas al cliente (si se usan, solo server-side).
- Cache-first: NASA/PSI no tiene SLA; todo tile/sample debe cachearse.
- Documentar en cada endpoint los papers/fuentes de los datos.
- Prioridad de entrega para la demo: **B1 → B3 → B4 → B6** (mínimo viable: sample + sitio + calculadora). B2/B5/B7 después.
