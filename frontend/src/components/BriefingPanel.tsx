"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/store/app-store";
import { fetchBriefing, type Briefing } from "@/lib/api";

export function BriefingPanel() {
  const { selectedPoint, focusDeposit, isru } = useApp();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [briefingSource, setBriefingSource] = useState<"api" | "local">(
    "local"
  );
  const [status, setStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [copied, setCopied] = useState(false);

  const target = useMemo(() => {
    if (focusDeposit) return { lat: focusDeposit.lat, lon: focusDeposit.lon };
    if (selectedPoint) return selectedPoint;
    return { lat: 39.8, lon: 202.1 };
  }, [focusDeposit, selectedPoint]);

  const generate = async () => {
    setStatus("loading");
    try {
      const { briefing: b, source } = await fetchBriefing(
        target.lat,
        target.lon,
        isru.propellantT,
        isru.iceFraction
      );
      setBriefing(b);
      setBriefingSource(source);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  };

  const asText = (b: Briefing) =>
    [
      "════════════════════════════════",
      "MARSBOARD · BRIEFING DE EXTRACCIÓN",
      "════════════════════════════════",
      `Generado: ${new Date(b.generated_at).toLocaleString("es")}`,
      "",
      "SITIO",
      `  ${b.site.name}`,
      `  ${b.site.lat}°N · ${b.site.lon}°E · elev ${b.site.elevation_km} km`,
      `  ice table ${b.site.ice_table_cm} cm · WEH ${b.site.weh_percent}%`,
      `  seguridad aterrizaje: ${b.site.landing_safety}`,
      "",
      "DEPÓSITO OBJETIVO",
      `  ${b.deposit.lat.toFixed(3)}° · ${b.deposit.lon.toFixed(3)}°`,
      `  score ${b.deposit.score.toFixed(2)} · prioridad ${b.deposit.priority}`,
      `  SWIM 0–1 m: ${b.deposit.swim_0_1m} · WEH ${b.deposit.weh_percent}%`,
      "",
      "ISRU",
      `  agua requerida: ${b.isru.water_required_t} t`,
      `  suelo a excavar: ${b.isru.soil_volume_m3} m³`,
      `  energía: ${b.isru.energy_kwh} kWh · tiempo: ${b.isru.days_estimate} soles`,
      `  rendimiento: ${b.isru.ch4_t} t CH₄ + ${b.isru.o2_t} t O₂`,
      "",
      `RECOMENDACIÓN: ${b.recommendation}`,
      "════════════════════════════════",
      "Fuentes NASA: SWIM · Odyssey NS · SHARAD · Golombek 2021 · Luzzi 2025",
    ].join("\n");

  const copy = async () => {
    if (!briefing) return;
    try {
      await navigator.clipboard.writeText(asText(briefing));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const print = () => {
    if (!briefing) return;
    const w = window.open("", "_blank", "width=640,height=800");
    if (!w) return;
    w.document.write(
      `<pre style="font:12px/1.5 monospace;background:#0A0E14;color:#E8EDF7;padding:24px;white-space:pre-wrap">${asText(briefing).replace(/</g, "&lt;")}</pre>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <section className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="hud-label text-mars">Briefing de extracción</h2>
        <span className="flex items-center gap-1.5">
          <span
            className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-hud ${
              briefingSource === "api"
                ? "border-ok/50 bg-ok/10 text-ok"
                : "border-warn/50 bg-warn/10 text-warn"
            }`}
          >
            {briefing && status === "ok" ? briefingSource.toUpperCase() : "—"}
          </span>
          <span className="hud-label">
            {target.lat.toFixed(2)}° · {target.lon.toFixed(2)}°
          </span>
        </span>
      </div>

      <button
        type="button"
        className="btn-hud btn-hud-active w-full"
        onClick={() => void generate()}
        disabled={status === "loading"}
      >
        {status === "loading"
          ? "Generando…"
          : briefing
            ? "Regenerar briefing"
            : "Generar briefing"}
      </button>

      {status === "error" && (
        <p className="mt-2 border border-mars/40 bg-mars-glow px-2 py-1.5 font-mono text-[10px] text-mars">
          ERROR · reintenta
        </p>
      )}

      {briefing && status === "ok" && (
        <div className="mt-3 animate-fade-in space-y-3">
          <div
            className={`border px-3 py-2 font-mono text-[11px] ${
              briefing.deposit.priority === "ALTA"
                ? "border-ok/50 bg-ok/10 text-ok"
                : briefing.deposit.priority === "MEDIA"
                  ? "border-warn/50 bg-warn/10 text-warn"
                  : "border-mars/50 bg-mars-glow text-mars"
            }`}
          >
            {briefing.recommendation}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Agua" value={`${briefing.isru.water_required_t} t`} />
            <MiniStat label="CH₄ / O₂" value={`${briefing.isru.ch4_t} / ${briefing.isru.o2_t} t`} />
            <MiniStat label="Suelo" value={`${briefing.isru.soil_volume_m3} m³`} />
            <MiniStat label="Días" value={`${briefing.isru.days_estimate}`} />
          </div>

          <div className="flex gap-2">
            <button type="button" className="btn-hud flex-1" onClick={copy}>
              {copied ? "✓ Copiado" : "Copiar"}
            </button>
            <button type="button" className="btn-hud flex-1" onClick={print}>
              Imprimir
            </button>
          </div>

          <details className="border border-line bg-ground px-2 py-1.5">
            <summary className="hud-label cursor-pointer">JSON</summary>
            <pre className="mt-2 max-h-40 overflow-auto font-mono text-[9px] text-ink-muted">
              {JSON.stringify(briefing, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel bg-ground px-2 py-1.5">
      <div className="hud-label">{label}</div>
      <div className="hud-value mt-0.5 text-sm text-ice">{value}</div>
    </div>
  );
}
