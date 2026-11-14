"use client";

import { useApp } from "@/store/app-store";
import { SitePanel } from "@/components/SitePanel";
import { ISRUPanel } from "@/components/ISRUPanel";
import { RankingPanel } from "@/components/RankingPanel";
import { BriefingPanel } from "@/components/BriefingPanel";

export function RightPanel() {
  const { rightTab, setRightTab } = useApp();

  return (
    <div className="flex min-h-0 flex-col">
      <div
        className="flex shrink-0 border-b border-line"
        role="tablist"
        aria-label="Paneles de datos"
      >
        <Tab
          active={rightTab === "sitio"}
          onClick={() => setRightTab("sitio")}
        >
          Sitio · ISRU
        </Tab>
        <Tab
          active={rightTab === "ranking"}
          onClick={() => setRightTab("ranking")}
        >
          Yacimientos
        </Tab>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {rightTab === "sitio" ? (
          <>
            <SitePanel />
            <ISRUPanel />
          </>
        ) : (
          <>
            <RankingPanel />
            <BriefingPanel />
          </>
        )}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 font-mono text-[10px] uppercase tracking-hud transition-colors ${
        active
          ? "border-b-2 border-ice bg-ice-glow text-ice"
          : "text-ink-dim hover:text-ink-muted"
      }`}
    >
      {children}
    </button>
  );
}
