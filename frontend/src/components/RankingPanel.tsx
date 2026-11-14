"use client";

import { useEffect } from "react";
import { useApp } from "@/store/app-store";

export function RankingPanel() {
  const {
    deposits,
    depositsStatus,
    depositsSource,
    loadDeposits,
    focusDeposit,
    setFocusDeposit,
  } = useApp();

  useEffect(() => {
    if (depositsStatus === "idle") void loadDeposits();
  }, [depositsStatus, loadDeposits]);

  return (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="hud-label text-ice">Ranking de yacimientos</h2>
        <span className="flex items-center gap-1.5">
          {depositsStatus === "ok" && depositsSource && (
            <span
              className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-hud ${
                depositsSource === "api"
                  ? "border-ok/50 bg-ok/10 text-ok"
                  : "border-warn/50 bg-warn/10 text-warn"
              }`}
            >
              {depositsSource}
            </span>
          )}
          <button
            type="button"
            className="btn-hud px-2 py-1"
            onClick={() => void loadDeposits()}
            disabled={depositsStatus === "loading"}
          >
            {depositsStatus === "loading" ? "Buscando…" : "Actualizar"}
          </button>
        </span>
      </div>

      {depositsStatus === "error" && (
        <p className="border border-mars/40 bg-mars-glow px-2 py-1.5 font-mono text-[10px] text-mars">
          ERROR · no se pudo cargar el ranking
        </p>
      )}

      {depositsStatus === "idle" && (
        <p className="hud-label animate-pulse">Consultando SWIM…</p>
      )}

      {(depositsStatus === "ok" || depositsStatus === "loading") && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-line">
                <Th>#</Th>
                <Th>Lat</Th>
                <Th>Lon</Th>
                <Th>Score</Th>
                <Th>Prio.</Th>
                <Th>km</Th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d, i) => {
                const active = focusDeposit?.lat === d.lat;
                return (
                  <tr
                    key={`${d.lat}-${d.lon}`}
                    onClick={() => setFocusDeposit(d)}
                    className={`cursor-pointer border-b border-line/50 transition-colors ${
                      active
                        ? "bg-ice-glow"
                        : "hover:bg-surface-hover"
                    }`}
                  >
                    <Td className="text-ink-dim">{i + 1}</Td>
                    <Td className="font-mono">{d.lat.toFixed(2)}</Td>
                    <Td className="font-mono">{d.lon.toFixed(2)}</Td>
                    <Td>
                      <span
                        className={`font-mono text-[11px] ${
                          d.score >= 0.66
                            ? "score-high"
                            : d.score >= 0.33
                              ? "score-mid"
                              : "score-low"
                        }`}
                      >
                        {d.score.toFixed(2)}
                      </span>
                    </Td>
                    <Td>
                      <PriorityBadge p={d.priority} />
                    </Td>
                    <Td className="font-mono text-ink-muted">
                      {d.distance_from_ap1_km}
                    </Td>
                  </tr>
                );
              })}
              {depositsStatus === "loading" && deposits.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-3 text-center font-mono text-[10px] text-ink-dim"
                  >
                    Cargando filas…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 font-mono text-[9px] text-ink-dim">
        Click en fila → fly-to + sondeo · puntos en el mapa
      </p>
    </section>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const cls =
    p === "ALTA"
      ? "border-ok/50 text-ok bg-ok/10"
      : p === "MEDIA"
        ? "border-warn/50 text-warn bg-warn/10"
        : "border-mars/50 text-mars bg-mars/10";
  return (
    <span
      className={`border px-1 py-0.5 font-mono text-[8px] uppercase tracking-hud ${cls}`}
    >
      {p}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="hud-label pb-1.5 pr-2 font-normal">{children}</th>
  );
}

function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`py-1.5 pr-2 text-[10px] text-ink ${className}`}>
      {children}
    </td>
  );
}
