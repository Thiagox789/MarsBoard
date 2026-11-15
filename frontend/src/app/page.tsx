"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Header } from "@/components/Header";
import { LayersPanel } from "@/components/LayersPanel";
import { useApp } from "@/store/app-store";

const MarsMap = dynamic(() => import("@/components/MarsMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-ground">
      <span className="hud-label animate-pulse">Inicializando consola…</span>
    </div>
  ),
});

export default function HomePage() {
  const { activeLayers, probe, deposits, setFocusDeposit } = useApp();
  const [leftOpen, setLeftOpen] = useState(true);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ground text-ink">
      <Header
        onToggleLeft={() => setLeftOpen((v) => !v)}
      />
      <div className="relative flex min-h-0 flex-1">
        {leftOpen && (
          <aside className="panel z-20 hidden w-72 shrink-0 flex-col border-y-0 border-l-0 lg:flex">
            <LayersPanel />
          </aside>
        )}

        <main className="relative min-w-0 flex-1">
          <MarsMap
            activeLayers={activeLayers}
            deposits={deposits}
            onPick={(p) => void probe(p.lat, p.lon)}
            onFocusDeposit={(d) => setFocusDeposit(d)}
          />

          {/* Coordenadas del cursor (F3) */}
          <div className="pointer-events-none absolute bottom-2 left-2 z-[1000] border border-line bg-ground/90 px-2 py-1 font-mono text-[10px] backdrop-blur">
            <span className="text-ink-dim">CURSOR </span>
            <span id="mars-cursor-coords" className="text-ice">
              —
            </span>
          </div>

          {/* Controles mobile */}
          <div className="absolute left-2 top-2 z-[1000] flex gap-2 lg:hidden">
            <button
              type="button"
              className="btn-hud"
              onClick={() => setLeftOpen((v) => !v)}
            >
              Capas
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
