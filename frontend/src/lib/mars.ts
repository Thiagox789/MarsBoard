/** Coordenadas y datos del sitio de estudio AP-1 (curados de papers NASA/JPL). */
export const AP1 = {
  id: "AP-1",
  name: "AP-1 · Arcadia/Amazonis",
  lat: 39.8,
  lon: 202.1,
  /** Longitud en -180..180 para Leaflet */
  lon180: 202.1 - 360,
  elevationKm: -3.9,
  iceTableCm: [8, 12],
  iceBaseModeM: 42,
  iceBaseMeanM: 51,
  wehPercent: [15, 20],
  landingSafety: "PRIME" as const,
  sources: [
    "Golombek et al. 2021 (LPSC)",
    "Bramson et al. 2015 (GRL)",
    "Luzzi et al. 2025 (JGR Planets)",
    "Pathare et al. 2018 (WEH MONS)",
  ],
  summary:
    "Sitio candidato prime para aterrizaje humano. Hielo subsuperficial accesible (ice table ~8–12 cm) con capa de exceso de decenas de metros. Terreno extremadamente plano y seguro para aterrizaje.",
};

export type LayerCategory = "optico" | "topografico" | "geofisico";

export const LAYER_CATEGORIES: { id: LayerCategory; label: string }[] = [
  { id: "optico", label: "Óptico" },
  { id: "topografico", label: "Topografía" },
  { id: "geofisico", label: "Geofísico" },
];

export const LAYERS = [
  // —— Óptico (imagen / IR) ——
  {
    id: "themis",
    category: "optico" as const,
    label: "THEMIS · IR día",
    source: "Mars Odyssey",
    defaultOn: false,
  },
  {
    id: "ctx",
    category: "optico" as const,
    label: "CTX · imagen media",
    source: "MRO CTX",
    defaultOn: false,
  },
  {
    id: "hirise",
    category: "optico" as const,
    label: "HiRISE · alta res.",
    source: "MRO HiRISE",
    defaultOn: false,
  },
  // —— Topografía ——
  {
    id: "mola",
    category: "topografico" as const,
    label: "MOLA · hillshade",
    source: "MGS MOLA",
    defaultOn: true,
  },
  // —— Geofísico (hielo / neutrones) ——
  {
    id: "swim",
    category: "geofisico" as const,
    label: "SWIM · hielo 0–1 m",
    source: "SWIM / PSI-NASA",
    defaultOn: true,
  },
  {
    id: "weh",
    category: "geofisico" as const,
    label: "Neutrón · WEH (%)",
    source: "Mars Odyssey NS",
    defaultOn: false,
  },
] as const;

export type LayerId = (typeof LAYERS)[number]["id"];
