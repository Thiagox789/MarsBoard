export interface IceSample {
  lat: number;
  lon: number;
  has_data: boolean;
  swim: {
    consistency_0_1m: number | null;
    consistency_1_5m: number | null;
    consistency_gt5m: number | null;
    swim_1_0: number | null;
  };
  weh_percent: number | null;
  depth_hint_m: string | null;
  sources: string[];
  /** Origen: "api" | "local" (mock). */
  source?: "api" | "local";
}

export interface Deposit {
  lat: number;
  lon: number;
  score: number;
  swim_0_1m: number;
  weh_percent: number;
  distance_from_ap1_km: number;
  priority: "ALTA" | "MEDIA" | "BAJA";
}

export interface DepositRanking {
  deposits: Deposit[];
  bbox: string;
  count: number;
  /** Origen de los datos: "api" | "local" (fallback). */
  source?: "api" | "local";
}

export interface Briefing {
  site: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    elevation_km: number;
    ice_table_cm: string;
    weh_percent: string;
    landing_safety: string;
  };
  deposit: {
    lat: number;
    lon: number;
    score: number;
    priority: string;
    swim_0_1m: number;
    weh_percent: number;
  };
  isru: {
    water_required_t: number;
    soil_volume_m3: number;
    energy_kwh: number;
    days_estimate: number;
    ch4_t: number;
    o2_t: number;
  };
  recommendation: string;
  generated_at: string;
}

const RAW_API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
// Si NEXT_PUBLIC_API_URL ya termina o es "/api", normalizamos para evitar duplicar "/api/api/..."
const API = RAW_API.endsWith("/api") ? RAW_API.slice(0, -4) : RAW_API;

// —— ISRU (backend fuente de verdad; fallback local) ——

export interface IsruResult {
  water_required_t: number;
  soil_volume_m3: number;
  energy_kwh: number;
  days_estimate: number;
  products: { ch4_t: number; o2_t: number };
  systems?: Record<string, number>;
  assumptions?: string[];
  reaction?: string;
  inputs?: {
    propellant_t: number;
    ice_fraction: number;
    ice_percent: number;
    power_kw: number;
    operating_hours_per_sol: number;
  };
  /** "api" | "local" — origen del cálculo mostrado en la UI. */
  source?: "api" | "local";
}

export interface IsruInput {
  propellant_t: number;
  ice_fraction: number;
  power_kw?: number;
  operating_hours_per_sol?: number;
}

export const ISRU_DEFAULTS = {
  power_kw: 100,
  operating_hours_per_sol: 12,
} as const;

function localIsru(input: IsruInput): IsruResult {
  const {
    propellant_t,
    ice_fraction,
    power_kw = ISRU_DEFAULTS.power_kw,
    operating_hours_per_sol = ISRU_DEFAULTS.operating_hours_per_sol,
  } = input;
  const water = propellant_t * 0.45;
  const soil = water / (ice_fraction * 0.9);
  const energy = water * 550;
  const days = energy / (power_kw * operating_hours_per_sol);
  const ch4 = propellant_t / 5.5;
  const o2 = propellant_t - ch4;
  return {
    water_required_t: Number(water.toFixed(2)),
    soil_volume_m3: Number(soil.toFixed(2)),
    energy_kwh: Number(energy.toFixed(2)),
    days_estimate: Number(days.toFixed(1)),
    products: { ch4_t: Number(ch4.toFixed(2)), o2_t: Number(o2.toFixed(2)) },
    assumptions: [
      "Agua ≈ 0.45 × propelente.",
      "Densidad de hielo ~900 kg/m³.",
      "Energía ~550 kWh/t H₂O.",
      "Mix local ~18% CH₄ / 82% O₂ (fallback).",
    ],
    source: "local",
  };
}

export async function calculateIsru(input: IsruInput): Promise<IsruResult> {
  const body = {
    propellant_t: input.propellant_t,
    ice_fraction: input.ice_fraction,
    power_kw: input.power_kw ?? ISRU_DEFAULTS.power_kw,
    operating_hours_per_sol:
      input.operating_hours_per_sol ?? ISRU_DEFAULTS.operating_hours_per_sol,
  };
  try {
    const res = await fetch(`${API}/api/isru/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return { ...(await res.json()) as IsruResult, source: "api" };
    }
  } catch {
    /* backend caído → fallback */
  }
  return localIsru(body);
}

// —— Sitio AP-1 (backend JSON curado → shape UI) ——

export interface SiteInfo {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevationKm: number;
  iceTableCm: [number, number];
  iceBaseModeM: number;
  iceBaseMeanM: number;
  wehPercent: [number, number];
  landingSafety: string;
  sources: string[];
  summary: string;
  source: "api" | "local";
}

function adapterSite(raw: Record<string, unknown>): SiteInfo {
  const coords = (raw.coordinates ?? {}) as { lat?: number; lon?: number };
  const iceTable = (raw.ice_table_cm ?? {}) as { min?: number; max?: number };
  const excess = (raw.excess_ice_layer_m ?? {}) as {
    base_mode?: number;
    mean?: number;
  };
  const wehRoot = (raw.weh_percent ?? {}) as Record<string, unknown>;
  const odyssey = (wehRoot.odyssey_ns ?? wehRoot) as {
    min?: number;
    max?: number;
  };
  const landing = (raw.landing_safety ?? {}) as { rating?: string };
  const ratingRaw = (landing.rating ?? "prime site").toLowerCase();
  const landingSafety = ratingRaw.includes("prime") ? "PRIME" : ratingRaw.toUpperCase();

  return {
    id: String(raw.id ?? "ap1"),
    name: String(raw.name ?? "AP-1"),
    lat: Number(coords.lat ?? 39.8),
    lon: Number(coords.lon ?? 202.1),
    elevationKm: Number(raw.elevation_km ?? -3.9),
    iceTableCm: [Number(iceTable.min ?? 8), Number(iceTable.max ?? 12)],
    iceBaseModeM: Number(excess.base_mode ?? 42),
    iceBaseMeanM: Number(excess.mean ?? 51),
    wehPercent: [Number(odyssey.min ?? 15), Number(odyssey.max ?? 20)],
    landingSafety,
    sources: Array.isArray(raw.sources) ? (raw.sources as string[]) : [],
    summary:
      "Sitio candidato prime para aterrizaje humano. Hielo subsuperficial accesible (ice table ~8–12 cm) con capa de exceso de decenas de metros. Terreno extremadamente plano y seguro para aterrizaje.",
    source: "api",
  };
}

function localSite(): SiteInfo {
  return {
    id: "AP-1",
    name: "AP-1 · Arcadia/Amazonis",
    lat: 39.8,
    lon: 202.1,
    elevationKm: -3.9,
    iceTableCm: [8, 12],
    iceBaseModeM: 42,
    iceBaseMeanM: 51,
    wehPercent: [15, 20],
    landingSafety: "PRIME",
    sources: [
      "Golombek et al. 2021 (LPSC)",
      "Bramson et al. 2015 (GRL)",
      "Luzzi et al. 2025 (JGR Planets)",
      "Pathare et al. 2018 (WEH MONS)",
    ],
    summary:
      "Sitio candidato prime para aterrizaje humano. Hielo subsuperficial accesible (ice table ~8–12 cm) con capa de exceso de decenas de metros. Terreno extremadamente plano y seguro para aterrizaje.",
    source: "local",
  };
}

export async function fetchSiteAp1(): Promise<SiteInfo> {
  try {
    const res = await fetch(`${API}/api/site/ap1`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      return adapterSite((await res.json()) as Record<string, unknown>);
    }
  } catch {
    /* fallback local */
  }
  return localSite();
}

/** Score de hielo determinista a partir de lat/lon (mock estable para demo). */
function syntheticIce(lat: number, lon: number): IceSample {
  // Ventana AP-1: 38–42°N, 200–204°E (0–360)
  const lon0360 = lon < 0 ? lon + 360 : lon;
  const inBox =
    lat >= 38 && lat <= 42 && lon0360 >= 200 && lon0360 <= 204;

  if (!inBox) {
    return {
      lat,
      lon: lonLeaflet(lon),
      has_data: false,
      swim: {
        consistency_0_1m: null,
        consistency_1_5m: null,
        consistency_gt5m: null,
        swim_1_0: null,
      },
      weh_percent: null,
      depth_hint_m: null,
      sources: [],
    };
  }

  // Ruido suave determinista → scores altos cerca de AP-1
  const dAp = Math.hypot(lat - 39.8, ((lon0360 - 202.1 + 540) % 360) - 180);
  const base = Math.max(0.15, 0.95 - dAp * 0.12);
  const wob = (Math.sin(lat * 12.9898 + lon0360 * 78.233) * 43758.5453) % 1;
  const n = Math.abs(wob) * 0.12 - 0.06;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  const s01 = clamp(base + n);
  const s15 = clamp(base + n + 0.05);
  const sgt = clamp(base * 0.85 + n);

  return {
    lat,
    lon: lonLeaflet(lon0360),
    has_data: true,
    swim: {
      consistency_0_1m: Number(s01.toFixed(2)),
      consistency_1_5m: Number(s15.toFixed(2)),
      consistency_gt5m: Number(sgt.toFixed(2)),
      swim_1_0: Number(((s01 + s15 + sgt) / 3).toFixed(2)),
    },
    weh_percent: Number((12 + base * 8 + n * 10).toFixed(1)),
    depth_hint_m: "0.08–0.12",
    sources: ["SWIM", "Mars Odyssey NS", "MRO SHARAD"],
  };
}

function syntheticRanking(limit = 12): DepositRanking {
  const seeds: Array<[number, number]> = [
    [39.8, 202.1],
    [39.92, 202.35],
    [39.71, 201.85],
    [40.05, 202.0],
    [39.85, 201.7],
    [39.65, 202.4],
    [40.1, 202.5],
    [39.75, 202.7],
    [39.95, 201.55],
    [40.2, 202.2],
    [39.6, 201.9],
    [39.88, 203.0],
  ];

  const deposits = seeds.slice(0, limit).map(([lat, lon]) => {
    const s = syntheticIce(lat, lon);
    const dist = Math.hypot(lat - 39.8, lon - 202.1) * 111;
    const score = s.swim.swim_1_0 ?? 0;
    const priority: Deposit["priority"] =
      score >= 0.75 ? "ALTA" : score >= 0.5 ? "MEDIA" : "BAJA";
    return {
      lat,
      lon: lonLeaflet(lon),
      score: Number(score.toFixed(2)),
      swim_0_1m: s.swim.consistency_0_1m ?? 0,
      weh_percent: s.weh_percent ?? 0,
      distance_from_ap1_km: Number(dist.toFixed(1)),
      priority,
    };
  });

  deposits.sort((a, b) => b.score - a.score);

  return {
    deposits,
    bbox: "39.5,201.0,40.5,203.5",
    count: deposits.length,
    source: "local",
  };
}

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// —— Adaptadores backend → shape UI ——

/** HIGH/MEDIUM/LOW (backend) → ALTA/MEDIA/BAJA (UI). */
function mapPriority(raw: unknown): Deposit["priority"] {
  const p = String(raw ?? "").toUpperCase();
  if (p === "HIGH" || p === "ALTA") return "ALTA";
  if (p === "MEDIUM" || p === "MEDIA") return "MEDIA";
  return "BAJA";
}

/** Longitud Leaflet: normaliza a −180..180 si viene 0–360. */
function lonLeaflet(lon: number): number {
  if (!Number.isFinite(lon)) return lon;
  const n = ((lon + 180) % 360 + 360) % 360 - 180;
  return n === -180 && lon > 0 ? 180 : n;
}

interface RawDeposit {
  lat: number;
  lon: number;
  score: number;
  swim_0_1m?: number | null;
  weh_percent?: number | null;
  distance_from_ap1_km: number;
  priority?: string;
}

function adapterRanking(raw: {
  deposits?: RawDeposit[];
  bbox?: string;
  count?: number;
}): DepositRanking {
  const deposits = (raw.deposits ?? []).map((d) => ({
    lat: Number(d.lat),
    lon: lonLeaflet(Number(d.lon)),
    score: Number(d.score) || 0,
    swim_0_1m: d.swim_0_1m == null ? 0 : Number(d.swim_0_1m),
    weh_percent: d.weh_percent == null ? 0 : Number(d.weh_percent),
    distance_from_ap1_km: Number(d.distance_from_ap1_km) || 0,
    priority: mapPriority(d.priority),
  }));
  return {
    deposits,
    bbox: raw.bbox ?? "199,38,205,43",
    count: raw.count ?? deposits.length,
    source: "api",
  };
}

interface RawBriefing {
  site?: Record<string, unknown>;
  deposit?: {
    lat?: number;
    lon?: number;
    swim?: { consistency_0_1m?: number | null };
    weh_percent?: number | null;
  };
  isru?: {
    water_required_t?: number;
    soil_volume_m3?: number;
    energy_kwh?: number;
    days_estimate?: number;
    products?: { ch4_t?: number; o2_t?: number };
  };
  recommendation?: string;
  priority?: string;
  deposit_score?: number;
  generated_at?: string;
}

function adapterBriefing(raw: RawBriefing): Briefing {
  const site = adapterSite(raw.site ?? {});
  const deposit = raw.deposit ?? {};
  const isru = raw.isru ?? {};
  const products = isru.products ?? {};
  const score = Number(raw.deposit_score ?? 0) || 0;

  return {
    site: {
      id: site.id,
      name: site.name,
      lat: site.lat,
      lon: site.lon,
      elevation_km: site.elevationKm,
      ice_table_cm: `${site.iceTableCm[0]}–${site.iceTableCm[1]}`,
      weh_percent: `${site.wehPercent[0]}–${site.wehPercent[1]}`,
      landing_safety: site.landingSafety,
    },
    deposit: {
      lat: Number(deposit.lat ?? site.lat),
      lon: lonLeaflet(Number(deposit.lon ?? site.lon)),
      score,
      priority: mapPriority(raw.priority),
      swim_0_1m: deposit.swim?.consistency_0_1m ?? 0,
      weh_percent: deposit.weh_percent ?? 0,
    },
    isru: {
      water_required_t: Number(isru.water_required_t ?? 0),
      soil_volume_m3: Number(isru.soil_volume_m3 ?? 0),
      energy_kwh: Number(isru.energy_kwh ?? 0),
      days_estimate: Number(isru.days_estimate ?? 0),
      ch4_t: Number(products.ch4_t ?? 0),
      o2_t: Number(products.o2_t ?? 0),
    },
    recommendation: raw.recommendation ?? "SIN DATOS SUFICIENTES",
    generated_at: raw.generated_at ?? new Date().toISOString(),
  };
}

export async function fetchIceSample(
  lat: number,
  lon: number
): Promise<IceSample> {
  const remote = await tryFetch<IceSample>(
    `/api/ice/sample?lat=${lat}&lon=${lon}`
  );
  if (remote) {
    return {
      ...remote,
      lon: lonLeaflet(Number(remote.lon)),
      swim: {
        consistency_0_1m: remote.swim?.consistency_0_1m ?? null,
        consistency_1_5m: remote.swim?.consistency_1_5m ?? null,
        consistency_gt5m: remote.swim?.consistency_gt5m ?? null,
        swim_1_0: remote.swim?.swim_1_0 ?? null,
      },
      sources: Array.isArray(remote.sources) ? remote.sources : [],
      source: "api",
    };
  }
  return { ...syntheticIce(lat, lon), source: "local" };
}

export async function fetchRanking(limit = 12): Promise<DepositRanking> {
  const remote = await tryFetch<RawRankingResponse>(
    `/api/deposits/rank?limit=${limit}`
  );
  if (remote) return adapterRanking(remote);
  return syntheticRanking(limit);
}

interface RawRankingResponse {
  deposits?: RawDeposit[];
  bbox?: string;
  count?: number;
}

export async function fetchBriefing(
  lat: number,
  lon: number,
  propellantT: number,
  iceFraction: number
): Promise<{ briefing: Briefing; source: "api" | "local" }> {
  const remote = await tryFetch<RawBriefing>("/api/briefing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lat,
      lon,
      propellant_t: propellantT,
      ice_fraction: iceFraction,
    }),
  });
  if (remote) return { briefing: adapterBriefing(remote), source: "api" };

  // Fallback local: calcula ISRU vía backend cuando sea posible (mismo contrato).
  const isruRemote = await calculateIsru({
    propellant_t: propellantT,
    ice_fraction: iceFraction,
  });
  const water = isruRemote.water_required_t;
  const soil = isruRemote.soil_volume_m3;
  const energy = isruRemote.energy_kwh;
  const days = isruRemote.days_estimate;
  const ch4 = isruRemote.products.ch4_t;
  const o2 = isruRemote.products.o2_t;
  const sample = syntheticIce(lat, lon);
  const score = sample.swim.swim_1_0 ?? 0;

  const briefing: Briefing = {
    site: {
      id: "AP-1",
      name: "AP-1 · Arcadia/Amazonis",
      lat: 39.8,
      lon: 202.1,
      elevation_km: -3.9,
      ice_table_cm: "8–12",
      weh_percent: "15–20",
      landing_safety: "PRIME",
    },
    deposit: {
      lat,
      lon,
      score,
      priority: score >= 0.75 ? "ALTA" : score >= 0.5 ? "MEDIA" : "BAJA",
      swim_0_1m: sample.swim.consistency_0_1m ?? 0,
      weh_percent: sample.weh_percent ?? 0,
    },
    isru: {
      water_required_t: Number(water.toFixed(1)),
      soil_volume_m3: Number(soil.toFixed(0)),
      energy_kwh: Number(energy.toFixed(0)),
      days_estimate: days,
      ch4_t: Number(ch4.toFixed(1)),
      o2_t: Number(o2.toFixed(1)),
    },
    recommendation:
      score >= 0.75
        ? "EXTRAER AQUÍ — consistencia de hielo alta"
        : score >= 0.5
          ? "CANDIDATO — verificar con radar en sitio"
          : "BAJA PRIORIDAD — buscar vecindario con score mayor",
    generated_at: new Date().toISOString(),
  };
  return { briefing, source: "local" };
}

/** Leyenda del colormap SWIM (-1 … +1 → riesgo → hielo). */
export const SWIM_LEGEND = [
  { label: "−1 · sin hielo", color: "#FF6B35" },
  { label: "0 · incierto", color: "#FFC857" },
  { label: "+1 · hielo probable", color: "#5DD6FC" },
] as const;
