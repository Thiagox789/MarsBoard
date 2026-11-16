"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/Header";
import { LayersPanel } from "@/components/LayersPanel";
import { InfoPanel } from "@/components/InfoPanel";
import { useApp } from "@/store/app-store";
import type { TerrainInfo, Waypoint } from "@/components/MarsMap";

const MarsMap = dynamic(() => import("@/components/MarsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-ground">
      <span className="hud-label animate-pulse">Inicializando consola…</span>
    </div>
  ),
});

const RUTA_ESTACIONES: Waypoint[] = [
  {
    lat: 52.8028,
    lon: -115.3125,
    label: "Yelwa",
    type: "muestreo",
    depth: "indeterminada",
    diameter: "8,20 km",
    expected: "estudio del permafrost en esa zona",
  },
  {
    lat: 42.0411,
    lon: -124.3872,
    label: "Tooting",
    type: "comunicacion",
    depth: "1690 m",
    diameter: "27,2 km",
    expected:
      "estudio de bloques rocosos y trazas de impacto (probabilidad de hallar biofirmas) y establecer una base de comunicación y punto de retorno",
  },
];

export default function HomePage() {
  const { activeLayers, probe, deposits, setFocusDeposit } = useApp();
  const [leftOpen, setLeftOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(288);
  const [infoWidth, setInfoWidth] = useState(288);
  const [infoOpen, setInfoOpen] = useState(true);
  const [terrain, setTerrain] = useState<TerrainInfo | null>(null);
  const resizingRef = useRef<"left" | "right" | null>(null);

  // Arrastre del borde de los paneles laterales para achicarlos / agrandarlos
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const side = resizingRef.current;
      if (!side) return;
      const width = side === "right" ? window.innerWidth - e.clientX : e.clientX;
      const clamped = Math.min(Math.max(width, 220), 620);
      if (side === "right") setPanelWidth(clamped);
      else setInfoWidth(clamped);
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ground text-ink">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        {infoOpen && (
          <>
            <aside
              style={{ width: infoWidth }}
              className="panel z-20 hidden shrink-0 flex-col border-y-0 border-l-0 lg:flex"
            >
              <InfoPanel />
            </aside>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar panel de información"
              onPointerDown={(e) => {
                e.preventDefault();
                resizingRef.current = "left";
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
              className="hidden w-1 shrink-0 cursor-col-resize touch-none bg-line/60 transition-colors hover:bg-ice/60 active:bg-ice lg:block"
            />
          </>
        )}

        <main className="relative min-w-0 flex-1">
          <MarsMap
            activeLayers={activeLayers}
            deposits={deposits}
            route={RUTA_ESTACIONES}
            onPick={(p) => void probe(p.lat, p.lon)}
            onFocusDeposit={(d) => setFocusDeposit(d)}
            onToggleLayers={() => setLeftOpen((v) => !v)}
            onToggleInfo={() => setInfoOpen((v) => !v)}
            onTerrainHover={setTerrain}
          />

          {/* Coordenadas del cursor (F3) */}
          <div className="pointer-events-none absolute bottom-2 right-2 z-[1000] max-w-[340px] border border-line bg-ground/90 px-2 py-1 font-mono text-[10px] backdrop-blur">
            <div>
              <span className="text-ink-dim">CURSOR </span>
              <span id="mars-cursor-coords" className="text-ice">
                —
              </span>
            </div>
            {terrain && (
              <div className="mt-1 max-w-[320px] border-l-2 border-ice/70 pl-2 leading-relaxed text-ice/90">
                <span className="text-ink-dim">TERRENO </span>
                {terrain.icon && <span className="mr-1">{terrain.icon}</span>}
                <span className="font-semibold" style={{ color: terrain.color }}>
                  {terrain.label}:
                </span>{" "}
                {terrain.body}
              </div>
            )}
          </div>
        </main>

        {leftOpen && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Redimensionar panel de capas"
              onPointerDown={(e) => {
                e.preventDefault();
                resizingRef.current = "right";
                document.body.style.cursor = "col-resize";
                document.body.style.userSelect = "none";
              }}
              className="hidden w-1 shrink-0 cursor-col-resize touch-none bg-line/60 transition-colors hover:bg-ice/60 active:bg-ice lg:block"
            />
            <aside
              style={{ width: panelWidth }}
              className="panel z-20 hidden shrink-0 flex-col border-y-0 border-r-0 lg:flex"
            >
              <LayersPanel routeDistanceKm={531.7} />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
