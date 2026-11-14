"use client";

import { useMemo } from "react";
import { useApp } from "@/store/app-store";

const WATER_PER_PROP = 0.45;

export function ISRUPanel() {
  const { isru, setIsru } = useApp();

  const calc = useMemo(() => {
    const { propellantT, iceFraction } = isru;
    const waterT = propellantT * WATER_PER_PROP;
    const soilM3 = waterT / (iceFraction * 0.9);
    const energyKwh = waterT * 550;
    const days = Math.ceil(energyKwh / (100 * 12));
    const ch4T = propellantT / 5.5;
    const o2T = propellantT - ch4T;
    return { waterT, soilM3, energyKwh, days, ch4T, o2T };
  }, [isru]);

  return (
    <section className="px-4 py-4">
      <h2 className="hud-label mb-3 text-ice">
        Calculadora ISRU · agua → combustible
      </h2>

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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Result
          label="💧 Agua necesaria"
          value={`${calc.waterT.toFixed(0)} t`}
          primary
        />
        <Result
          label="⛏ Suelo a excavar"
          value={`${calc.soilM3.toFixed(0)} m³`}
        />
        <Result
          label="⚡ Energía"
          value={`${(calc.energyKwh / 1000).toFixed(0)} MWh`}
        />
        <Result label="⏱ Tiempo est." value={`${calc.days} soles`} />
        <Result
          label="🔥 CH₄"
          value={`${calc.ch4T.toFixed(0)} t`}
          accent
        />
        <Result
          label="🫁 O₂"
          value={`${calc.o2T.toFixed(0)} t`}
          accent
        />
      </div>

      <p className="mt-3 border-t border-line pt-2 font-mono text-[9px] leading-relaxed text-ink-dim">
        CO₂ + 4H₂ → CH₄ + 2H₂O · electrólisis → O₂
        <br />
        Supuestos MVP: 0.45 t H₂O / t propelente · 100 kW · 12 h/sol
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
