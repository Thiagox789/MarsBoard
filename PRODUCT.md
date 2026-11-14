# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + Leaflet + Tailwind CSS (frontend) · Node.js + Express (backend) · user-confirmed

## Users

Primary: hackathon judges at NASA Space Apps Challenge 2026, evaluating the project in a short demo window. They must grasp the product in under 30 seconds. Secondary: general Space Apps audience browsing submissions.

## Product Purpose

MARSBOARD identifies subsurface water-ice deposits on Mars (focus site AP-1, Arcadia/Amazonis Planitia) to support ISRU propellant production (CH₄/O₂ via Sabatier + electrolysis). Success: a judge understands "where the water is, how deep, and how much fuel it yields" from the first screen.

## Positioning

A multi-mission water-to-fuel prospecting console: layers NASA ice data (SWIM, Odyssey neutrón, SHARAD, HiRISE) on an interactive Mars map and converts deposit scores into an actionable ISRU extraction plan (water → propellant calculator + site ranking + briefing).

## Operating Context

- NASA Space Apps 2026 challenge "Interplanetary Survival Guide: Martian Map"
- 24–48h hackathon; demo-driven evaluation
- Study area fixed: AP-1 (39.8°N, 202.1°E), elevation −3.9 km
- Live/near-live NASA public data via proxy backend; no auth for judges

## Capabilities and Constraints

- **Language: Spanish (es)** for all UI copy, labels, briefing, and docs-facing product text; NASA data/source names may stay in original English
- Switchable map layers (MOLA basemap, SWIM ice consistency, neutrón WEH, THEMIS, HiRISE)
- Point prospector: click → ice score, depth, sources
- AP-1 site dossier (curated paper data)
- ISRU calculator: propellant required → water, soil volume, energy, time
- Deposit ranking + extraction briefing (exportable)
- Stack fixed: Next.js + Leaflet + Express; dark mission UI
- MVP scope documented in docs/FRONTEND_ISSUES.md (F1–F9) and docs/BACKEND_ISSUES.md (B1–B7)

## Brand Commitments

- Name: MARSBOARD
- Team: Julian Appiolaza, Thiago Almada, Ailin Arancibia, Lucas Diaz, Luciano Garcia, Lucía
- Visual world preference (user-pinned): Mission control / HUD aesthetic
- Demo priority (user-pinned): premium look & feel over raw data density

## Evidence on Hand

- SWIM GeoTIFFs (swim.psi.edu), Odyssey NS/HEND, SHARAD, HiRISE PDS — cited in docs/BACKEND_ISSUES.md
- AP-1 literature: Golombek et al. 2021, Bramson et al. 2015, Luzzi et al. 2025
- No shipped UI yet; no DESIGN.md yet; no fabricated customer/commercial claims

## Product Principles

1. Data honesty: every score and number cites its NASA mission source
2. First viewport sells the mechanism: water → fuel, not a feature list
3. Judges decide in seconds: hierarchy favors clarity over exhaustiveness
4. One site, deep: AP-1 done thoroughly beats a shallow global map
5. Premium craft: the tool must feel like flight software, not a template

## Accessibility & Inclusion

Not yet established; default to readable contrast on dark UI and keyboard-reachable controls during build.
