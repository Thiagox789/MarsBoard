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

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Score de hielo determinista a partir de lat/lon (mock estable para demo). */
function syntheticIce(lat: number, lon: number): IceSample {
  // Ventana AP-1: 38–42°N, 200–204°E (0–360)
  const lon0360 = lon < 0 ? lon + 360 : lon;
  const inBox =
    lat >= 38 && lat <= 42 && lon0360 >= 200 && lon0360 <= 204;

  if (!inBox) {
    return {
      lat,
      lon,
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
    lon: lon0360,
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
      lon,
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

export async function fetchIceSample(
  lat: number,
  lon: number
): Promise<IceSample> {
  const remote = await tryFetch<IceSample>(
    `/api/ice/sample?lat=${lat}&lon=${lon}`
  );
  if (remote) return remote;
  return syntheticIce(lat, lon);
}

export async function fetchRanking(limit = 12): Promise<DepositRanking> {
  const remote = await tryFetch<DepositRanking>(
    `/api/deposits/rank?limit=${limit}`
  );
  if (remote) return remote;
  return syntheticRanking(limit);
}

export async function fetchBriefing(
  lat: number,
  lon: number,
  propellantT: number,
  iceFraction: number
): Promise<Briefing> {
  const remote = await tryFetch<Briefing>("/api/briefing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lat,
      lon,
      propellant_t: propellantT,
      ice_fraction: iceFraction,
    }),
  });
  if (remote) return remote;

  // Fallback local (mismas fórmulas que ISRUPanel)
  const water = propellantT * 0.45;
  const soil = water / (iceFraction * 0.9);
  const energy = water * 550;
  const days = Math.ceil(energy / (100 * 12));
  const ch4 = propellantT / 5.5;
  const o2 = propellantT - ch4;
  const sample = syntheticIce(lat, lon);
  const score = sample.swim.swim_1_0 ?? 0;

  return {
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
}

/** Leyenda del colormap SWIM (-1 … +1 → riesgo → hielo). */
export const SWIM_LEGEND = [
  { label: "−1 · sin hielo", color: "#FF6B35" },
  { label: "0 · incierto", color: "#FFC857" },
  { label: "+1 · hielo probable", color: "#5DD6FC" },
] as const;
