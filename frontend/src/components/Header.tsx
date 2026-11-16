import Image from "next/image";

interface Props {
  onToggleRight?: () => void;
}

export function Header({ onToggleRight }: Props) {
  return (
    <header className="panel z-30 flex h-12 shrink-0 items-center justify-between border-x-0 border-t-0 px-3 sm:px-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <Image
          src="/logo.png"
          alt="Logo MARSBOARD"
          width={51}
          height={28}
          className="h-7 w-auto object-contain"
          priority
        />
        <span className="font-mono text-sm font-semibold tracking-[0.2em] text-ink">
          MARSBOARD
        </span>
        <span className="hidden h-4 w-px bg-line sm:block" />
        <span className="hud-label hidden md:block">
          Llegar a Marte es el primer paso. Volver a casa es la misión
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
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
