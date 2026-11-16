"use client";

const REGIONES = [
  {
    nombre: "Amazonis Planitia",
    descripcion:
      "Amplia llanura volcánica del hemisferio norte de Marte, caracterizada por superficies relativamente planas y extensos flujos de lava. En esta región se encuentra el cráter Tooting.",
  },
  {
    nombre: "Arcadia Planitia",
    descripcion:
      "Llanura del norte de Marte donde se han identificado evidencias de una extensa capa de hielo de agua subsuperficial, de varias decenas de metros de espesor.",
  },
];

const OBJETIVOS = [
  "Analizar la geología y los materiales de la superficie marciana.",
  "Estudiar depósitos de hielo subsuperficial y su distribución.",
  "Caracterizar materiales de impacto y depósitos de ejecta.",
  "Evaluar el terreno para una exploración segura y eficiente.",
  "Identificar posibles indicadores de habitabilidad pasada (biofirmas).",
  "Optimizar la ruta Yelwa–Tooting para combinar seguridad y valor científico.",
];

export function InfoPanel() {
  return (
    <div className="flex min-h-0 flex-col overflow-y-auto">
      <SectionTitle>Región de exploración</SectionTitle>
      <div className="flex flex-col gap-2 px-3 pb-4">
        {REGIONES.map((r) => (
          <div key={r.nombre} className="panel bg-ground px-3 py-2">
            <div className="hud-value mb-1 text-[11px] text-ice">
              {r.nombre}
            </div>
            <p className="text-[10px] leading-relaxed text-ink-muted">
              {r.descripcion}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-line" />
      <SectionTitle>Objetivos de la misión</SectionTitle>
      <ol className="flex flex-col gap-2 px-3 pb-4">
        {OBJETIVOS.map((o, i) => (
          <li key={o} className="flex gap-2 text-[10px] leading-relaxed">
            <span className="hud-value shrink-0 text-ice/70">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="text-ink-muted">{o}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="hud-label px-3 pb-2 pt-4 text-ice/80">{children}</h2>
  );
}
