"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/store/app-store";
import {
  calculateIsru,
  ISRU_DEFAULTS,
  type IsruResult,
} from "@/lib/api";

export function ISRUPanel() {
  const { isru, setIsru } = useApp();
  const [result, setResult] = useState<IsruResult | null>(null);
  const [status, setStatus] = useState<"loading" | "ok">("loading");

  const { propellantT, iceFraction } = isru;

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    const t = setTimeout(() => {
      void calculateIsru({
        propellant_t: propellantT,
        ice_fraction: iceFraction,
        power_kw: ISRU_DEFAULTS.power_kw,
        operating_hours_per_sol: ISRU_DEFAULTS.operating_hours_per_sol,
      }).then((r) => {
        if (!cancelled) {
          setResult(r);
          setStatus("ok");
        }
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [propellantT, iceFraction]);

  const calc = result;
  const origin = calc?.source === "api" ? "API" : "LOCAL";

  return (
    <section className="px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="hud-label text-ice">
          Calculadora ISRU · agua → combustible
        </h2>
        <span
          className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-hud ${
            origin === "API"
              ? "border-ok/50 bg-ok/10 text-ok"
              : "border-warn/50 bg-warn/10 text-warn"
          }`}
        >
          {origin}
        </span>
      </div>

      <div className="space-y-3">
        <Field
          label="Propelente requerido (t)"
          value={isru.propellantT}
          onChange={(v) => setIsru({ propellantT: v })}
          min={1}
          max={5000}
          step={10}
        />
        <Field
          label="Fracción de hielo en suelo"
          value={Math.round(isru.iceFraction * 100)}
          onChange={(v) =>
            setIsru({
              iceFraction: Math.max(1, Math.min(100, v)) / 100,
            })
          }
          min={1}
          max={100}
          step={1}
          suffix="%"
        />
      </div>

      {status === "loading" && !calc && (
        <p className="mt-4 font-mono text-[10px] text-ink-dim">Calculando…</p>
      )}

      {calc && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Result
            label="💧 Agua necesaria"
            value={`${calc.water_required_t.toFixed(0)} t`}
            primary
          />
          <Result
            label="⛏ Suelo a excavar"
            value={`${calc.soil_volume_m3.toFixed(0)} m³`}
          />
          <Result
            label="⚡ Energía"
            value={`${(calc.energy_kwh / 1000).toFixed(0)} MWh`}
          />
          <Result
            label="⏱ Tiempo est."
            value={`${calc.days_estimate} soles`}
          />
          <Result
            label="🔥 CH₄"
            value={`${calc.products.ch4_t.toFixed(0)} t`}
            accent
          />
          <Result
            label="🫁 O₂"
            value={`${calc.products.o2_t.toFixed(0)} t`}
            accent
          />
        </div>
      )}

      <p className="mt-3 border-t border-line pt-2 font-mono text-[9px] leading-relaxed text-ink-dim">
        CO₂ + 4H₂ → CH₄ + 2H₂O · electrólisis → O₂
        <br />
        {origin === "API"
          ? "POST /api/isru/calculate · 100 kW · 12 h/sol · mix backend 28/72"
          : "Fallback local (backend caído) · 100 kW · 12 h/sol"}
      </p>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="hud-label mb-1 block">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-none bg-line accent-ice"
        />
        <span className="hud-value w-16 text-right text-xs text-ice">
          {value}
          {suffix ?? ""}
        </span>
      </div>
    </label>
  );
}

function Result({
  label,
  value,
  primary,
  accent,
}: {
  label: string;
  value: string;
  primary?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`panel px-2 py-2 ${
        primary ? "border-ice/40 bg-ice-glow" : "bg-ground"
      }`}
    >
      <div className="hud-label truncate">{label}</div>
      <div
        className={`hud-value mt-0.5 ${
          primary
            ? "text-lg text-ice"
            : accent
              ? "text-sm text-ok"
              : "text-sm"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
