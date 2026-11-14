# MARSBOARD — Frontend Issues

> **Proyecto:** Identificación de depósitos de agua en Marte para ISRU y producción de combustible de cohete
> **Zona:** AP-1 — 39.8°N, 202.1°E (límite Arcadia Planitia / norte Amazonis Planitia)
> **Stack:** Next.js (App Router) + Leaflet + Tailwind CSS
> **Carpeta:** `frontend/`
> **Guía:** cada issue es un paso general. Marcar ✓ al terminar. Crear issue real en GitHub si hace falta desglosar más.

---

## Dependencias entre issues

```
F1 → F2 → F3 → F4 → F5 → F6 → F7 → F8 → F9
              ↘ (paralelo con F6-F9 tras F4)
```

---

### F1 — Scaffold del proyecto Next.js
**Objetivo:** tener el proyecto corriendo con Tailwind y Leaflet instalados.

**Tecnologías:**
- Next.js 14+ (App Router)
- Tailwind CSS
- Leaflet + react-leaflet
- TypeScript (recomendado)

**Pasos:**
1. Crear app en `frontend/` con `create-next-app` (App Router, TS, Tailwind).
2. Instalar `leaflet` y `react-leaflet`.
3. Verificar que `npm run dev` levanta sin errores.
4. Crear una página base con un `div` placeholder.
5. Agregar estilos globales base (fondo oscuro tipo misión, tipografía).

**Criterio de aceptación:**
- `npm run dev` funciona en `localhost:3000`
- Tailwind aplica (un `className` de prueba se ve)
- Sin errores de TypeScript ni lint

**Dependencias:** ninguna

---

### F2 — Layout de la UI (mapa + paneles)
**Objetivo:** estructura visual de la app: mapa central, panel izquierdo de capas, panel derecho de datos.

**Tecnologías:**
- Tailwind CSS (grid/flex)
- Componentes React

**Pasos:**
1. Crear layout con 3 zonas:
   - **Header:** nombre MARSBOARD, sitio AP-1, estado de conexión API
   - **Sidebar izquierdo:** lista de capas (checkboxes) + herramientas de prospección
   - **Panel derecho:** información contextual (prospector, calculadora ISRU, ranking, briefing)
   - **Centro:** mapa a pantalla completa
2. Tema oscuro (negro/gris oscuro + acentos naranja/rojo tipo Marte, texto claro).
3. Responsive básico: en pantallas chicas los paneles colapsan o se apilan.
4. Estado global ligero (Context o Zustand) para: capas activas, punto seleccionado, resultados ISRU.

**Criterio de aceptación:**
- Layout visible con las 3 zonas
- Tema oscuro aplicado
- Estado de capas/selectione pasa entre componentes

**Dependencias:** F1

---

### F3 — Mapa base con proyección de Marte
**Objetivo:** Leaflet mostrando tiles de Marte centrado en AP-1.

**Tecnologías:**
- Leaflet / react-leaflet
- Tiles: `api.nasa.gov/mars-wmts` (XYZ) y/o Mars Trek WMTS

**Pasos:**
1. Crear componente `MarsMap` con `MapContainer` de react-leaflet.
2. Configurar vista: center `[39.8, 202.1]` (lat, lon de AP-1), zoom inicial ~6–8.
3. Agregar capa base MOLA hillshade o mosaico color:
   - Ejemplo XYZ: `https://api.nasa.gov/mars-wmts/catalog/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg`
4. Manejar longitud 0–360 vs -180–180 según el tile server (probar con 202.1 y -157.9).
5. Agregar control de escala y coordenadas al mover el mouse.

**Criterio de aceptación:**
- El mapa carga tiles de Marte (no vacío)
- Centrado en AP-1
- Coordenadas del cursor visibles

**Dependencias:** F1

---

### F4 — Switcher de capas (layer control)
**Objetivo:** poder encender/apagar capas de datos desde el sidebar.

**Tecnologías:**
- Estado global de capas activas
- Leaflet `TileLayer` / `ImageOverlay`

**Pasos:**
1. Definir catálogo de capas en un archivo `config/layers.ts`:
   - Basemap MOLA
   - HiRISE/CTX (si hay tiles disponibles)
   - THEMIS térmico (Mars Trek WMTS)
   - SWIM ice consistency (vendrá del backend como tiles o overlay)
   - Neutrón WEH (vendrá del backend)
2. Checkbox en sidebar → togglear capa en el mapa.
3. Opacidad ajustable por capa (slider simple).
4. Cargar primero solo basemap; el resto se engancha en F5/F6.

**Criterio de aceptación:**
- Checkbox enciende/apaga capa
- Slider de opacidad funciona
- Al menos 2 capas basemap/temáticas conmutables

**Dependencias:** F2, F3

---

### F5 — Capas de hielo (SWIM + neutrón) desde el backend
**Objetivo:** visualizar las capas científicas de agua/hielo servidas por el backend.

**Tecnologías:**
- Fetch a endpoints del backend (`localhost:4000` o variable de entorno `NEXT_PUBLIC_API_URL`)
- Leaflet `TileLayer` (tiles del backend) o `ImageOverlay` (GeoTIFF renderizado)

**Pasos:**
1. Concretar con el backend el formato de tiles:
   - `GET /api/tiles/swim/{z}/{x}/{y}.png` (o similar)
   - `GET /api/tiles/weh/{z}/{x}/{y}.png`
2. Agregar estas capas al switcher (F4).
3. Colormap: consistencia de hielo -1 a +1 → escala rojo→verde (o azul→cian para hielo).
4. Leyenda visible en el mapa (valores de la escala).
5. Fallback: si el tile falla, mensaje en UI "capa no disponible".

**Criterio de aceptación:**
- Capa SWIM visible sobre el mapa en la ventana de AP-1
- Leyenda con valores
- Errors manejados sin romper el mapa

**Dependencias:** F4, Backend B3

---

### F6 — Herramienta Prospector (click → score de hielo)
**Objetivo:** hacer click en el mapa y obtener evaluación de hielo en ese punto.

**Tecnologías:**
- Leaflet click handler
- Fetch a `GET /api/ice/sample?lat=...&lon=...`

**Pasos:**
1. Botón "🔍 Prospector" en sidebar (activar/desactivar modo).
2. En modo activo, click en mapa → marker temporal.
3. Llamar al backend con lat/lon.
4. Mostrar en panel derecho:
   - Score de consistencia SWIM (0–1 m, 1–5 m, >5 m)
   - WEH estimado (%)
   - Profundidad estimada al hielo (si está disponible)
   - Fuentes de datos que aportaron
5. Estados: loading, success, error, sin datos.

**Criterio de aceptación:**
- Click retorna datos en <2s
- Se muestran scores por profundidad
- Se ve qué misiones aportaron

**Dependencias:** F2, F3, Backend B3

---

### F7 — Marcador de sitio AP-1 con ficha del depósito
**Objetivo:** marker fijo de AP-1 con toda la info curada del depósito de agua.

**Tecnologías:**
- Leaflet Marker + Popup/Panel
- Datos: `GET /api/site/ap1` (backend B4)

**Pasos:**
1. Marker en `[39.8, 202.1]` con icono distintivo (bandera/landing).
2. Popup o panel derecho al clickear:
   - Nombre: AP-1 (Amazonis/Arcadia prime site)
   - Coordenadas y elevación (−3.9 km bajo geoide MOLA)
   - Ice table: ~8–12 cm (Luzzi 2025)
   - Capa de exceso: base ~42–51 m (Bramson 2015)
   - WEH: 15–20% (Odyssey neutrón)
   - Score de seguridad de aterrizaje (Golombek 2021)
   - Potencial ISRU (resumen)
3. Citar fuentes en la ficha (papers).

**Criterio de aceptación:**
- Marker visible centrando la vista
- Ficha con datos curados y citas
- Datos vienen del backend

**Dependencias:** F3, Backend B4

---

### F8 — Calculadora ISRU: agua → combustible
**Objetivo:** convertir requisitos de propelente en necesidades de agua, energía y excavación.

**Tecnologías:**
- Formulario React
- Fetch a `POST /api/isru/calculate` (backend B6)

**Pasos:**
1. Form con inputs:
   - Masa de propelente requerida (t) — default 1000 (regreso Starship) o 32 (escenario NASA)
   - % de hielo en el suelo (default 50% para hielo puro cercano, rango 3–100)
   - Opcional: potencia disponible (kW), días de operación
2. Enviar al backend → recibir:
   - Agua necesaria (t) ≈ 0.45 × propelente
   - Volumen de suelo a excavar (m³) según % hielo y densidad
   - Energía estimada (kWh / kW)
   - Tiempo de producción (días)
   - Masas de sistemas ISRU (extractora, electrólisis, Sabatier, licuefacción)
3. Mostrar resultados en cards con iconos (💧 agua, ⚡ energía, 🔥 CH₄, 🫁 O₂).
4. Mostrar reacción de Sabatier como referencia visual.

**Criterio de aceptación:**
- Cálculos consistentes con fórmulas (agua ≈ 0.45×propelente)
- UI clara con unidades
- Cambiar inputs actualiza resultados

**Dependencias:** F2, Backend B6

---

### F9 — Ranking de yacimientos + briefing de extracción
**Objetivo:** listar los mejores puntos de minado cerca de AP-1 y generar un plan resumible.

**Tecnologías:**
- Fetch `GET /api/deposits/rank?bbox=...` (backend B5)
- Tabla + markers en mapa
- Export/print del briefing

**Pasos:**
1. Al cargar (o botón "Buscar yacimientos"), pedir ranking al backend.
2. Tabla en panel derecho: coordenadas, score, profundidad, prioridad.
3. Pintar top N como markers en el mapa (diferenciados por prioridad).
4. Click fila → centrar mapa en ese punto + abrir prospector.
5. Sección "Briefing de extracción":
   - Sitio recomendado
   - Agua estimada a extraer
   - Rendimiento de CH₄/O₂
   - Condiciones/riesgos resumidos
6. Botón "Exportar" → imprimir / copiar texto / JSON.

**Criterio de aceptación:**
- Ranking ordenado por score
- Markers sincronizados con tabla
- Briefing se genera y se puede copiar/imprimir

**Dependencias:** F6, F7, F8, Backend B5, B7

---

## Checklist resumen

| Issue | Título | Estado |
|-------|--------|--------|
| F1 | Scaffold Next.js | ⬜ |
| F2 | Layout UI | ⬜ |
| F3 | Mapa base Marte | ⬜ |
| F4 | Switcher de capas | ⬜ |
| F5 | Capas de hielo (SWIM/WEH) | ⬜ |
| F6 | Prospector click | ⬜ |
| F7 | Marcador AP-1 | ⬜ |
| F8 | Calculadora ISRU | ⬜ |
| F9 | Ranking + briefing | ⬜ |

---

## Notas para el equipo frontend
- Todas las URLs de API usar `process.env.NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).
- No pegar API keys en el cliente; el backend es el proxy.
- Priorizar F1→F4 para tener mapa andando; F5-F9 dependen de endpoints backend.
- Si un endpoint backend no está listo, usar mock temporal en `frontend/mocks/`.
