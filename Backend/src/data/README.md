# Datos SWIM recortados a AP-1

Carpeta `src/data/swim/`. Todos los GeoTIFF están recortados a la ventana
**lon 199–205 °E, lat 38–43 °N**, grilla de **120 × 100** celdas,
resolución **0.05° (~3 km)**, remuestreo *nearest*.

- CRS de salida: esfera marciana `a = b = 3 396 190 m`, lon/lat geográficas.
- Longitud en convención 0–360° (202.1 °E equivale a −157.9°).
- AP-1 (39.8 °N, 202.1 °E) cae en la fila 64, columna 61.
- Cada capa declara su `nodata` en `manifest.json`.

## Capas

| Archivo | `kind` | Uso | Unidades | nodata |
|---|---|---|---|---|
| `swim_ap1_consistency_0_1m.tif` | `c0_1` | SWIM 2.0 hielo 0–1 m | 0–1 | -100 |
| `swim_ap1_consistency_1_5m.tif` | `c1_5` | SWIM 2.0 hielo 1–5 m | 0–1 | -100 |
| `swim_ap1_consistency_gt5m.tif` | `gt5m` | SWIM 2.0 hielo >5 m | 0–1 | -100 |
| `swim_ap1_ice_consistency.tif` | `ci_swim1` | SWIM 1.0 combinada (legacy) | 0–1 | -30 |
| `swim_ap1_neutron_weh.tif` | `neutron` | Neutrón Pathare 2018 escalado | -1..1 | -30 |
| `swim_ap1_depth.tif` | `depth` | Interfaz inferior (Bramson 2015) | m | -30 |
| `swim_ap1_geomorphology.tif` | `geomorphology` | Consistencia geomorfológica | 0–1 | -200 |
| `swim_ap1_radar_dielectric.tif` | `radar_dielectric` | Consistencia dieléctrica radar | 0–1 | -30 |
| `swim_ap1_radar_power.tif` | `radar_power` | Consistencia potencia radar | 0–1 | -30 |
| `swim_ap1_thermal.tif` | `thermal` | Consistencia térmica | 0–1 | -30 |
| `swim_ap1_weh.tif` | `weh` | WEH Pathare 2018 recuperado del neutrón | % WEH | -9999 |
| `mola_ap1_dem.tif` | `dem` | DEM MOLA 463 m remuestreado | m | -32768 |
| `mola_ap1_slope.tif` | `slope` | Pendiente del terreno | grados | -9999 |
| `overlay_ice.png` | — | Overlay 0–1 m (480×400, x4) | RGBA | — |
| `manifest.json` | — | Metadatos y bounding box | — | — |

## WEH a partir del neutrón

`SWIM2_N` / `Northern_Cn` guardan el valor **escalado** a la ecuación SWIM,
no el WEH % crudo. La inversión documentada por SWIM es:

```
n >= 0  ->  weh = 10 + 15 * n
n <  0  ->  weh = 10 + 5  * n
n >= 1  ->  weh >= 25 %
```

En AP-1: `n = 0.513` → `weh ≈ 17.7 %`, consistente con Pathare 2018 / MONS
(15–20 %) y con FREND (11–13 %).

`swim_ap1_weh.tif` ya contiene ese WEH invertido, celda por celda. El ráster
original de Pathare 2018 no se distribuye como archivo aparte: SWIM solo
publica la versión escalada (el `Ancillary.zip` de `Northern_Cn` contiene
únicamente el README con la cita). La inversión es exacta para 5–25 %; SWIM
satura en 25 % (`n ≥ 1`) y en 5 % (`n = -1`), así que los extremos quedan
recortados. AP-1 (17.7 %) no se ve afectado.

## DEM y pendiente

- `mola_ap1_dem.tif`: DEM global MOLA de 463 m (USGS), remuestreado bilineal a
  0.05° sobre la misma grilla que SWIM. Valores en metros sobre el geoide.
- `mola_ap1_slope.tif`: pendiente en grados, calculada con gradientes sobre la
  grilla de 0.05° y radio marciano 3396.19 km. En AP-1 es ~0.08°; el máximo de
  la ventana ronda 2.2°.
- `GET /api/ice/sample` devuelve `terrain.elevation_m` y `terrain.slope_deg`.
- El ranking aplica una penalidad de hasta 0.3 a partir de 10° de pendiente
  (0 a 10°, lineal hasta 25°).

## Fuentes

- SWIM 2.0, Planetary Science Institute: <https://swim.psi.edu/>
  - Composites: `output/SWIM2/Global/Composite/SWIM2_c0_1.tif`, `SWIM2_c1_5.tif`, `SWIM2_c_5.tif`
- SWIM 1.0 (hemisferio norte): `output/NorthernHemisphere/Northern/`
- Pathare et al. 2018 (neutrones Odyssey NS)
- Bramson et al. 2015 (profundidad de la capa de exceso)

### GeoTIFF globales de origen

Los tres composites globales de SWIM 2.0 usados para generar las capas AP-1
están en `src/data/swim/global/`:

```
SWIM2_c0_1.tif   # hielo 0–1 m
SWIM2_c1_5.tif   # hielo 1–5 m
SWIM2_c_5.tif    # hielo >5 m
```

Son 7200 × 2400 px (~3 km), ~204 MB en total. La API **no** los sirve
directamente: sirve los recortes AP-1 derivados de ellos. Los archivos globales
están ignorados por git para no inflar el repositorio; si faltan, se descargan
de <https://swim.psi.edu/output/SWIM2/Global/Composite/>.

## Cómo regenerar

Requiere `rasterio` + `numpy` (probado con rasterio 1.5.2 en un venv).

1. Los GeoTIFF globales de SWIM 2.0 (`SWIM2_c0_1.tif`, `SWIM2_c1_5.tif`,
   `SWIM2_c_5.tif`) están en `src/data/swim/global/`; los de SWIM 1.0
   (`Northern_*.tif`) se descargan desde <https://swim.psi.edu/>.
2. Recortarlos a la ventana AP-1 con `rasterio.warp.reproject` hacia
   `+proj=longlat +a=3396190 +b=3396190` (0.05°, 120×100, nearest). La ventana
   se calcula con longitudes 0–360 y luego se pasa a la convención signed del
   GeoTIFF.
3. Generar WEH, DEM y pendiente:

   ```bash
   python scripts/prepare_terrain.py
   ```

   El script lee `swim_ap1_neutron_weh.tif` y el DEM MOLA global vía
   `/vsicurl/` (no descarga los 2.1 GB completos) y escribe
   `swim_ap1_weh.tif`, `mola_ap1_dem.tif` y `mola_ap1_slope.tif`.
   Se puede forzar un DEM local con `MOLA_DEM_PATH=/ruta/al/dem.tif`.

## Tiles de basemap

El proxy `/api/tiles/basemap/:layer/:z/:x/:y` usa el esquema de Mars Trek y
ArcGIS OnMars: origen en **lon −180, lat 90**, `x` hacia el este, `y` hacia el
sur, matriz `2^(z+1) × 2^z`. Para una longitud en 0–360:

```
signed = ((lon + 180) mod 360) - 180
x = floor(((signed + 180) / 360) * 2^(z+1))
y = floor(((90 - lat) / 180) * 2^z)
```

AP-1 en `z=7` → `x=15, y=35` (no `x=135`). El helper
`GET /api/tiles/xyz?lat=39.8&lon=202.1&z=7` devuelve los índices.

- MOLA y THEMIS: tiles de 256 px.
- CTX y HiRISE: tiles de 512 px (`tileSize` en `/api/tiles/layers`).

## Tiles de hielo y WEH

Se generan al vuelo desde los GeoTIFF recortados, con el mismo esquema
`2^(z+1) × 2^z`, muestreo bilineal y caché en memoria:

- `GET /api/tiles/ice/:kind/:z/:x/:y.png` con `kind` = `c0_1`, `c1_5`, `gt5m` o `weh`.
- Alias: `/api/tiles/swim/{z}/{x}/{y}.png` (0–1 m) y
  `/api/tiles/weh/{z}/{x}/{y}.png`.
- AP-1 en `z=7` → `x=15, y=35`.
- Colores: SWIM va de rojo (0) a verde (1); WEH de marrón (5 %) a verde azulado
  (25 %). Las celdas sin dato son transparentes.
- `/api/tiles/layers` incluye `ice_layers` y los alias.

## Precache de basemap

```bash
npm run precache          # z6–z8 para la ventana AP-1
npm run precache -- 6,7   # solo esos zooms
```

Descarga los tiles de basemap a `src/data/cache/tiles/` (ignorado por git) para
que la demo funcione sin depender de la red. Los tiles de hielo/WEH se generan
localmente y no necesitan precache.

## Advertencias

- `Northern_Cim.tif` se descartó: es una figura RGB de Adobe Illustrator sin
  CRS ni geotransformación.
- La capa térmica es 0 en toda la ventana AP-1; la potencia radar es 0 en AP-1.
  SWIM ya las combina en las capas de consistencia.
- La resolución de ~3 km no reemplaza una validación con imágenes de alta
  resolución antes de una misión.
