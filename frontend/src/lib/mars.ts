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

export const LAYERS = [
  {
    id: "mola",
    label: "MOLA · topografía",
    source: "MGS MOLA",
    defaultOn: true,
  },
  {
    id: "optica",
    label: "Óptica · Viking MDIM 2.1",
    source: "NASA Mars Trek",
    defaultOn: false,
  },
  {
    id: "geofisica",
    label: "Geofísica · TES albedo",
    source: "NASA Mars Trek",
    defaultOn: false,
  },
] as const;

export type LayerId = (typeof LAYERS)[number]["id"];
