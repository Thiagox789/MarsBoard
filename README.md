# MARSBOARD 💧🚀

**Interplanetary Survival Guide: Martian Map** — NASA Space Apps Challenge 2026

Identificación de depósitos de agua en Marte para la generación de combustibles (CH₄/O₂) para la propulsión de cohetes y naves mediante ISRU (*In-Situ Resource Utilization*).

🔗 **Demo en vivo:** https://marsboard.iotsoluciones.cloud/

---

## El problema

Las primeras misiones humanas a Marte necesitan combustible para el regreso a la Tierra. Llevar todo el propelente desde la Tierra es inviable en masa. La solución: **producirlo en Marte** a partir de agua extraída del hielo subsuperficial.

Reacción clave (Sabatier + electrólisis):

```
CO₂ + 4H₂ → CH₄ + 2H₂O
2H₂O → 2H₂ + O₂
```

**≈ 0.45 toneladas de agua por tonelada de propelente.** Encontrar el agua es el cuello de botella.

## Nuestra solución

MARSBOARD es un **prospectador de depósitos de agua** que integra datos de múltiples misiones NASA en un mapa interactivo de la zona **AP-1** (Arcadia/Amazonis Planitia) para responder:

1. **¿Dónde hay hielo?** — capas SWIM, neutrón Odyssey, radar SHARAD, HiRISE
2. **¿Qué tan profundo?** — ice table ~8–12 cm, capa de exceso hasta ~50 m
3. **¿Cuánta agua necesito?** — calculadora ISRU (agua → CH₄/O₂)
4. **¿Dónde minar primero?** — ranking de yacimientos + briefing de extracción

## Sitio de estudio: AP-1

| Dato | Valor | Fuente |
|------|-------|--------|
| Coordenadas | 39.8°N, 202.1°E | Golombek et al. 2021 |
| Elevación | −3.9 km (geoide MOLA) | Golombek et al. 2021 |
| Ice table | 8–12 cm | Luzzi et al. 2025 |
| Base de capa de hielo | ~42–51 m | Bramson et al. 2015 |
| WEH (agua equivalente) | 15–20% | Odyssey NS / Pathare 2018 |
| Seguridad de aterrizaje | Prime site | Golombek et al. 2021 |

## Estructura del proyecto

```
MARSBOARD/
├── README.md
├── docs/
│   ├── FRONTEND_ISSUES.md    ← issues paso a paso (frontend)
│   └── BACKEND_ISSUES.md     ← issues paso a paso (backend)
├── frontend/                 ← Next.js + Leaflet + Tailwind
└── backend/                  ← API Express: tiles, ice sampling, ISRU calc
```

## Equipos

| Equipo | Carpeta | Issues | Stack |
|--------|---------|--------|-------|
| **Frontend** | `frontend/` | `docs/FRONTEND_ISSUES.md` (F1–F9) | Next.js, Leaflet, Tailwind |
| **Backend** | `backend/` | `docs/BACKEND_ISSUES.md` (B1–B7) | Node.js, Express, GeoTIFF |

## Cómo empezar

1. Leer tu archivo de issues (`docs/FRONTEND_ISSUES.md` o `docs/BACKEND_ISSUES.md`).
2. Arrancar por los primeros issues (F1 / B1).
3. Marcar ✓ en el checklist de cada doc al terminar cada issue.
4. Coordinar endpoints compartidos con el otro equipo según las dependencias.

## Fuentes de datos NASA

- **SWIM** (Subsurface Water Ice Mapping) — https://swim.psi.edu/
- **Mars Odyssey GRS/NS/HEND** — PDS Geosciences Node
- **MRO SHARAD** — PDS Geosciences Node
- **MRO HiRISE** — https://hirise-pds.lpl.arizona.edu/
- **Mars Trek WMTS / api.nasa.gov** — tiles de MOLA, THEMIS, CTX
- **REMS/MEDA** (clima) — mars.nasa.gov RSS API

## Equipo MARSBOARD

Julian Appiolaza · Thiago Almada · Ailin Arancibia · Lucas Diaz · Luciano Garcia · Lucía

---

*NASA Space Apps Challenge 2026 — The Next Frontier*
