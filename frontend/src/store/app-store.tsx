"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Deposit, IceSample } from "@/lib/api";
import { fetchIceSample, fetchRanking } from "@/lib/api";
import type { LayerId } from "@/lib/mars";
import { emitSelected } from "@/lib/bus";

interface AppState {
  activeLayers: LayerId[];
  layerOpacity: Record<string, number>;
  toggleLayer: (id: LayerId) => void;
  setOpacity: (id: LayerId, value: number) => void;

  selectedPoint: { lat: number; lon: number } | null;
  setSelectedPoint: (p: { lat: number; lon: number } | null) => void;

  sample: IceSample | null;
  sampleStatus: "idle" | "loading" | "ok" | "empty" | "error";
  probe: (lat: number, lon: number) => Promise<void>;

  deposits: Deposit[];
  depositsStatus: "idle" | "loading" | "ok" | "error";
  loadDeposits: () => Promise<void>;
  focusDeposit: Deposit | null;
  setFocusDeposit: (d: Deposit | null) => void;

  isru: { propellantT: number; iceFraction: number };
  setIsru: (v: Partial<AppState["isru"]>) => void;

  rightTab: "sitio" | "ranking";
  setRightTab: (t: AppState["rightTab"]) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeLayers, setActiveLayers] = useState<LayerId[]>([
    "mola",
  ]);
  const [layerOpacity, setLayerOpacity] = useState<Record<string, number>>({
    mola: 1,
    swim: 0.75,
    optica: 1,
    geofisica: 0.7,
  });
  const [selectedPoint, setSelectedPoint] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [sample, setSample] = useState<IceSample | null>(null);
  const [sampleStatus, setSampleStatus] =
    useState<AppState["sampleStatus"]>("idle");
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [depositsStatus, setDepositsStatus] =
    useState<AppState["depositsStatus"]>("idle");
  const [focusDeposit, setFocusDeposit] = useState<Deposit | null>(null);
  const [isru, setIsruState] = useState({
    propellantT: 1000,
    iceFraction: 0.5,
  });
  const [rightTab, setRightTab] = useState<AppState["rightTab"]>("sitio");

  const toggleLayer = useCallback((id: LayerId) => {
    setActiveLayers((prev) =>
      prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
    );
  }, []);

  const setOpacity = useCallback((id: LayerId, value: number) => {
    setLayerOpacity((prev) => ({ ...prev, [id]: value }));
  }, []);

  const probe = useCallback(async (lat: number, lon: number) => {
    setSelectedPoint({ lat, lon });
    emitSelected({ lat, lon });
    setSampleStatus("loading");
    try {
      const s = await fetchIceSample(lat, lon);
      setSample(s);
      setSampleStatus(s.has_data ? "ok" : "empty");
    } catch {
      setSampleStatus("error");
    }
  }, []);

  const setSelectedPointAndEmit = useCallback(
    (p: { lat: number; lon: number } | null) => {
      setSelectedPoint(p);
      emitSelected(p);
    },
    []
  );

  const loadDeposits = useCallback(async () => {
    setDepositsStatus("loading");
    try {
      const r = await fetchRanking();
      setDeposits(r.deposits);
      setDepositsStatus("ok");
    } catch {
      setDepositsStatus("error");
    }
  }, []);

  const setIsru = useCallback((v: Partial<AppState["isru"]>) => {
    setIsruState((prev) => ({ ...prev, ...v }));
  }, []);

  const value = useMemo(
    () => ({
      activeLayers,
      layerOpacity,
      toggleLayer,
      setOpacity,
      selectedPoint,
      setSelectedPoint: setSelectedPointAndEmit,
      sample,
      sampleStatus,
      probe,
      deposits,
      depositsStatus,
      loadDeposits,
      focusDeposit,
      setFocusDeposit,
      isru,
      setIsru,
      rightTab,
      setRightTab,
    }),
    [
      activeLayers,
      layerOpacity,
      toggleLayer,
      setOpacity,
      selectedPoint,
      setSelectedPointAndEmit,
      sample,
      sampleStatus,
      probe,
      deposits,
      depositsStatus,
      loadDeposits,
      focusDeposit,
      isru,
      setIsru,
      rightTab,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp debe usarse dentro de AppProvider");
  return ctx;
}
