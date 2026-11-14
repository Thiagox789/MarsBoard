"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Header } from "@/components/Header";
import { LayersPanel } from "@/components/LayersPanel";
import { RightPanel } from "@/components/RightPanel";
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
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ground text-ink">
      <Header
        onToggleLeft={() => setLeftOpen((v) => !v)}
        onToggleRight={() => setRightOpen((v) => !v)}
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

          {/* Leyenda SWIM (F5) */}
          <SwimLegend visible={activeLayers.includes("swim")} />

          {/* Controles mobile */}
          <div className="absolute left-2 top-2 z-[1000] flex gap-2 lg:hidden">
            <button
              type="button"
              className="btn-hud"
              onClick={() => setLeftOpen((v) => !v)}
            >
              Capas
            </button>
            <button
              type="button"
              className="btn-hud"
              onClick={() => setRightOpen((v) => !v)}
            >
              Datos
            </button>
          </div>
        </main>

        {rightOpen && (
          <aside className="panel z-20 flex w-80 shrink-0 flex-col border-y-0 border-r-0 max-lg:absolute max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:shadow-2xl">
            <RightPanel />
          </aside>
        )}
      </div>
    </div>
  );
}

function SwimLegend({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute bottom-2 right-2 z-[1000] border border-line bg-ground/90 px-2 py-1.5 backdrop-blur">
      <div className="hud-label mb-1">SWIM · consistencia</div>
      <div className="flex flex-col gap-0.5">
        {(
          [
            ["#5DD6FC", "+1 hielo probable"],
            ["#FFC857", "0 incierto"],
            ["#FF6B35", "−1 sin hielo"],
          ] as const
        ).map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-6 border border-line"
              style={{ background: color }}
            />
            <span className="font-mono text-[9px] text-ink-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
