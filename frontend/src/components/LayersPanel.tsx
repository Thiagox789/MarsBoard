"use client";

import { LAYERS } from "@/lib/mars";
import { useApp } from "@/store/app-store";

export function LayersPanel({
  routeDistanceKm,
}: {
  routeDistanceKm?: number;
}) {
  const {
    activeLayers,
    layerOpacity,
    toggleLayer,
    setOpacity,
    selectedPoint,
  } = useApp();

  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <SectionTitle>Capas NASA</SectionTitle>
      <ul className="flex flex-col gap-2 px-3 pb-3">
        {LAYERS.map((layer) => {
          const on = activeLayers.includes(layer.id);
          return (
            <li key={layer.id} className="panel bg-ground px-2 py-1.5">
              <button
                type="button"
                onClick={() => toggleLayer(layer.id)}
                className="flex w-full items-start gap-2 text-left"
                aria-pressed={on}
              >
                <span
                  className={`mt-0.5 h-2.5 w-2.5 shrink-0 border ${
                    on ? "border-ice bg-ice" : "border-line bg-transparent"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[11px] leading-tight ${
                      on ? "text-ink" : "text-ink-muted"
                    }`}
                  >
                    {layer.label}
                  </span>
                  <span className="block truncate text-[9px] text-ink-dim">
                    {layer.source}
                  </span>
                </span>
              </button>
              {on && (
                <label className="mt-1.5 flex items-center gap-2 pl-4">
                  <span className="hud-label !text-[8px]">Opacidad</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={Math.round((layerOpacity[layer.id] ?? 1) * 100)}
                    onChange={(e) =>
                      setOpacity(layer.id, Number(e.target.value) / 100)
                    }
                    className="h-1 flex-1 cursor-pointer appearance-none bg-line accent-ice"
                    aria-label={`Opacidad de ${layer.label}`}
                  />
                  <span className="hud-value w-7 text-right text-[9px]">
                    {Math.round((layerOpacity[layer.id] ?? 1) * 100)}%
                  </span>
                </label>
              )}
            </li>
          );
        })}
      </ul>

      <div className="border-t border-line" />
      <SectionTitle>Ruta de superficie</SectionTitle>
      <div className="px-3 pb-4">
        <div className="panel bg-ground px-3 py-2">
          <div className="hud-label mb-1">Distancia recorrida</div>
          <div className="hud-value text-sm text-ice">
            {routeDistanceKm != null
              ? `${routeDistanceKm.toFixed(1).replace(".", ",")} km`
              : "—"}
          </div>
        </div>
      </div>

      <div className="border-t border-line" />
      <SectionTitle>Punto seleccionado</SectionTitle>
      <div className="px-3 pb-4">
        <div className="panel bg-ground px-3 py-2">
          <div className="hud-label mb-1">Coordenadas</div>
          {selectedPoint ? (
            <div className="hud-value text-xs text-ice">
              {selectedPoint.lat.toFixed(4)}° ·{" "}
              {selectedPoint.lon.toFixed(4)}°
            </div>
          ) : (
            <div className="hud-value text-xs text-ink-dim">
              — sin punto fijado —
            </div>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
          Haz clic en el mapa para fijar un punto; el marcador queda en el
          lugar seleccionado.
        </p>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="hud-label px-3 pb-2 pt-4 text-ice/80">{children}</h2>
  );
}
