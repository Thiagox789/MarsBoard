"use client";

import { AP1 } from "@/lib/mars";
import { useApp } from "@/store/app-store";

export function SitePanel() {
  const { sample, sampleStatus, selectedPoint } = useApp();

  return (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="hud-label text-mars">Dossier de sitio</h2>
        <span className="border border-mars/50 bg-mars-glow px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-hud text-mars">
          {AP1.landingSafety}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-ink">{AP1.name}</h3>
      <p className="mt-0.5 font-mono text-[11px] text-ink-muted">
        {AP1.lat}°N · {(AP1.lon - 360)}°E · elev. {AP1.elevationKm} km
      </p>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-muted">
        {AP1.summary}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-2">
        <Stat
          label="Ice table"
          value={`${AP1.iceTableCm[0]}–${AP1.iceTableCm[1]} cm`}
        />
        <Stat label="Base de hielo" value={`~${AP1.iceBaseModeM} m`} accent />
        <Stat
          label="WEH"
          value={`${AP1.wehPercent[0]}–${AP1.wehPercent[1]} %`}
          accent
        />
        <Stat label="Seguridad" value={AP1.landingSafety} />
      </dl>

      <div className="mt-3 flex flex-wrap gap-1">
        {AP1.sources.map((s) => (
          <span
            key={s}
            className="border border-line px-1.5 py-0.5 font-mono text-[8px] text-ink-dim"
          >
            {s}
          </span>
        ))}
      </div>

      {/* Lock-on del último sondeo */}
      <div className="mt-4 border-t border-line pt-3">
        <div className="hud-label mb-1.5 text-ice">Lock-on</div>
        {selectedPoint && sampleStatus === "ok" && sample ? (
          <div className="panel bg-ground px-3 py-2 animate-fade-in">
            <div className="hud-value text-xs text-ice">
              {sample.lat.toFixed(4)}° · {sample.lon.toFixed(4)}°
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="hud-label">Score global</span>
              <span
                className={`font-mono text-xl font-semibold ${
                  (sample.swim.swim_1_0 ?? 0) >= 0.66
                    ? "score-high"
                    : (sample.swim.swim_1_0 ?? 0) >= 0.33
                      ? "score-mid"
                      : "score-low"
                }`}
              >
                {sample.swim.swim_1_0?.toFixed(2) ?? "—"}
              </span>
            </div>
            <p className="mt-1 font-mono text-[9px] text-ink-dim">
              {sample.sources.join(" · ")}
            </p>
          </div>
        ) : (
          <p className="font-mono text-[10px] text-ink-dim">
            {sampleStatus === "loading"
              ? "Sondeando…"
              : "Sin punto activo en el mapa"}
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="panel bg-ground px-2 py-1.5">
      <dt className="hud-label">{label}</dt>
      <dd
        className={`hud-value mt-0.5 text-sm ${accent ? "text-ice" : "text-ink"}`}
      >
        {value}
      </dd>
    </div>
  );
}
