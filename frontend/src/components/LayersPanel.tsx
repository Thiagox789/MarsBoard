"use client";

import { LAYERS, LAYER_CATEGORIES, type LayerCategory, type LayerId } from "@/lib/mars";
import { useApp } from "@/store/app-store";

export function LayersPanel() {
  const {
    activeLayers,
    layerOpacity,
    toggleLayer,
    setOpacity,
    selectedPoint,
    sample,
    sampleStatus,
  } = useApp();

  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <SectionTitle>Capas NASA</SectionTitle>

      {LAYER_CATEGORIES.map((cat) => {
        const layers = LAYERS.filter((l) => l.category === cat.id);
        if (layers.length === 0) return null;
        return (
          <div key={cat.id} className="px-3 pb-2">
            <CategoryLabel category={cat.id}>{cat.label}</CategoryLabel>
            <ul className="flex flex-col gap-2">
              {layers.map((layer) => (
                <LayerRow
                  key={layer.id}
                  id={layer.id}
                  label={layer.label}
                  source={layer.source}
                  on={activeLayers.includes(layer.id)}
                  opacity={layerOpacity[layer.id] ?? 1}
                  onToggle={() => toggleLayer(layer.id)}
                  onOpacity={(v) => setOpacity(layer.id, v)}
                />
              ))}
            </ul>
          </div>
        );
      })}

      <div className="mt-1 border-t border-line" />
      <SectionTitle>Prospector</SectionTitle>
      <div className="px-3 pb-4">
        <p className="mb-2 text-[11px] leading-relaxed text-ink-muted">
          Haz clic en el mapa para sondear la consistencia de hielo en ese
          punto.
        </p>

        <div className="panel bg-ground px-3 py-2">
          <div className="hud-label mb-1">Punto seleccionado</div>
          {selectedPoint ? (
            <div className="hud-value text-xs text-ice">
              {selectedPoint.lat.toFixed(4)}° ·{" "}
              {selectedPoint.lon.toFixed(4)}°
            </div>
          ) : (
            <div className="hud-value text-xs text-ink-dim">
              — sin señal —
            </div>
          )}
        </div>

        <div className="mt-3 space-y-1.5" aria-live="polite">
          {sampleStatus === "loading" && (
            <p className="hud-label animate-pulse text-ice">
              Sondeando telemetría…
            </p>
          )}
          {sampleStatus === "empty" && (
            <p className="border border-warn/40 bg-warn/10 px-2 py-1.5 font-mono text-[10px] text-warn">
              NO SIGNAL · fuera de cobertura SWIM
            </p>
          )}
          {sampleStatus === "error" && (
            <p className="border border-mars/40 bg-mars-glow px-2 py-1.5 font-mono text-[10px] text-mars">
              ERROR · no se pudo leer el punto
            </p>
          )}
          {sampleStatus === "ok" && sample && (
            <>
              <div className="flex items-center justify-between pb-1">
                <span className="hud-label">Origen</span>
                <span
                  className={`border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-hud ${
                    sample.source === "api"
                      ? "border-ok/50 bg-ok/10 text-ok"
                      : "border-warn/50 bg-warn/10 text-warn"
                  }`}
                >
                  {sample.source === "api" ? "API" : "LOCAL"}
                </span>
              </div>
              <ScoreRow
                label="SWIM 0–1 m"
                value={sample.swim.consistency_0_1m}
              />
              <ScoreRow
                label="SWIM 1–5 m"
                value={sample.swim.consistency_1_5m}
              />
              <ScoreRow
                label="SWIM >5 m"
                value={sample.swim.consistency_gt5m}
              />
              <MetricRow
                label="WEH"
                value={
                  sample.weh_percent != null
                    ? `${sample.weh_percent} %`
                    : "—"
                }
                accent
              />
              <MetricRow
                label="Profundidad"
                value={sample.depth_hint_m ?? "—"}
                accent
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {sample.sources.map((s) => (
                  <span
                    key={s}
                    className="border border-line px-1 py-0.5 font-mono text-[8px] text-ink-dim"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </>
          )}
          {sampleStatus === "idle" && (
            <p className="font-mono text-[10px] text-ink-dim">
              Esperando sondeo…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryLabel({
  category,
  children,
}: {
  category: LayerCategory;
  children: React.ReactNode;
}) {
  const tone =
    category === "optico"
      ? "text-warn/90"
      : category === "topografico"
        ? "text-ink-muted"
        : "text-ice/90";
  return (
    <h3 className={`hud-label mb-1.5 ${tone}`} style={{ letterSpacing: "0.16em" }}>
      {children}
    </h3>
  );
}

function LayerRow({
  id,
  label,
  source,
  on,
  opacity,
  onToggle,
  onOpacity,
}: {
  id: LayerId;
  label: string;
  source: string;
  on: boolean;
  opacity: number;
  onToggle: () => void;
  onOpacity: (v: number) => void;
}) {
  return (
    <li className="panel bg-ground px-2 py-1.5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2 text-left"
        aria-pressed={on}
        data-layer={id}
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
            {label}
          </span>
          <span className="block truncate text-[9px] text-ink-dim">
            {source}
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
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacity(Number(e.target.value) / 100)}
            className="h-1 flex-1 cursor-pointer appearance-none bg-line accent-ice"
            aria-label={`Opacidad de ${label}`}
          />
          <span className="hud-value w-7 text-right text-[9px]">
            {Math.round(opacity * 100)}%
          </span>
        </label>
      )}
    </li>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="hud-label px-3 pb-2 pt-4 text-ice/80">{children}</h2>
  );
}

function scoreClass(v: number | null): string {
  if (v == null) return "text-ink-dim";
  if (v >= 0.66) return "score-high";
  if (v >= 0.33) return "score-mid";
  return "score-low";
}

function ScoreRow({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 pb-1">
      <span className="text-[10px] text-ink-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-1.5 w-12 bg-line"
          aria-hidden
        >
          <span
            className={`block h-full ${value != null && value >= 0.66 ? "bg-ok" : value != null && value >= 0.33 ? "bg-warn" : "bg-mars"}`}
            style={{
              width: value != null ? `${Math.round(((value + 1) / 2) * 100)}%` : "0%",
            }}
          />
        </span>
        <span className={`hud-value w-8 text-right text-[11px] ${scoreClass(value)}`}>
          {value != null ? value.toFixed(2) : "—"}
        </span>
      </span>
    </div>
  );
}

function MetricRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-line/60 pb-1">
      <span className="text-[10px] text-ink-muted">{label}</span>
      <span
        className={`hud-value text-[11px] ${accent ? "text-ice" : "text-ink"}`}
      >
        {value}
      </span>
    </div>
  );
}
