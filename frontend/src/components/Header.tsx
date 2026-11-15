import { AP1 } from "@/lib/mars";

interface Props {
  onToggleLeft: () => void;
  onToggleRight?: () => void;
}

export function Header({ onToggleLeft, onToggleRight }: Props) {
  return (
    <header className="panel z-30 flex h-12 shrink-0 items-center justify-between border-x-0 border-t-0 px-3 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          className="btn-hud px-2 py-1 lg:hidden"
          onClick={onToggleLeft}
          aria-label="Alternar panel de capas"
        >
          ☰
        </button>
        <span className="flex h-5 w-5 items-center justify-center border border-mars/60 text-[10px] font-bold text-mars">
          M
        </span>
        <span className="font-mono text-sm font-semibold tracking-[0.2em] text-ink">
          MARSBOARD
        </span>
        <span className="hidden h-4 w-px bg-line sm:block" />
        <span className="hud-label hidden md:block">
          Consola de prospección · agua → propelente
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="hidden items-baseline gap-2 md:flex">
          <span className="hud-label">Sitio</span>
          <span className="hud-value text-xs">
            {AP1.lat.toFixed(1)}°N {(AP1.lon - 360).toFixed(1)}°E
          </span>
        </div>
        <div className="flex items-center gap-1.5 border border-ok/40 bg-ok/10 px-2 py-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ok" />
          <span className="font-mono text-[10px] uppercase tracking-hud text-ok">
            ISRU listo
          </span>
        </div>
        {onToggleRight && (
          <button
            type="button"
            className="btn-hud px-2 py-1 xl:hidden"
            onClick={onToggleRight}
            aria-label="Alternar panel de datos"
          >
            ▤
          </button>
        )}
      </div>
    </header>
  );
}
