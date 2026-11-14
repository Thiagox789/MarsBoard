"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AP1, type LayerId } from "@/lib/mars";
import { useApp } from "@/store/app-store";
import { subscribeSelected } from "@/lib/bus";
import type { Deposit } from "@/lib/api";

interface Props {
  activeLayers: LayerId[];
  deposits: Deposit[];
  onPick: (p: { lat: number; lon: number }) => void;
  onFocusDeposit: (d: Deposit) => void;
}

const MOLA_URL =
  "https://api.nasa.gov/mars-wmts/catalog/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0//default/default028mm/{z}/{y}/{x}.jpg";

const THEMIS_URL =
  "https://api.nasa.gov/mars-wmts/catalog/Mars_MO_THEMIS-IR-Day_mosaic_global_100m_v12_clon0_ly/1.0.0//default/default028mm/{z}/{y}/{x}.jpg";

const HIRISE_CTX_URL =
  "https://api.nasa.gov/mars-wmts/catalog/CTX_beta01_uncontrolled_5m_Caltech/1.0.0//default/default028mm/{z}/{y}/{x}.png";

/**
 * Capa SWIM simulada en el cliente (overlay CSS) hasta que el backend
 * sirva tiles GeoTIFF. Pinta una malla translúcida con colormap por score.
 */
function swimOverlayUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FF6B35" stop-opacity="0.55"/>
        <stop offset="45%" stop-color="#FFC857" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#5DD6FC" stop-opacity="0.55"/>
      </linearGradient>
      <pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="url(#g)"/>
        <path d="M0 16h32M16 0v32" stroke="#0A0E14" stroke-opacity="0.25" stroke-width="0.5"/>
      </pattern>
    </defs>
    <rect width="256" height="256" fill="url(#p)"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function MarsMap({
  activeLayers,
  deposits,
  onPick,
  onFocusDeposit,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.TileLayer | null>>({});
  const swimOverlayRef = useRef<L.ImageOverlay | null>(null);
  const pickRef = useRef(onPick);
  const focusRef = useRef(onFocusDeposit);
  const depositsLayerRef = useRef<L.LayerGroup | null>(null);
  const prospectMarkerRef = useRef<L.Marker | null>(null);

  const { layerOpacity, setRightTab, probe } = useApp();

  pickRef.current = onPick;
  focusRef.current = onFocusDeposit;

  // Init mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [AP1.lat, AP1.lon180],
      zoom: 7,
      zoomControl: true,
      attributionControl: true,
    });

    map.on("click", (e) => {
      pickRef.current({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    map.on("mousemove", (e) => {
      const el = document.getElementById("mars-cursor-coords");
      if (el) {
        el.textContent = `${e.latlng.lat.toFixed(4)}° · ${e.latlng.lng.toFixed(4)}°`;
      }
    });

    // Marker AP-1 (F7)
    const apIcon = L.divIcon({
      className: "mars-marker",
      html: `<div style="width:16px;height:16px;border:2px solid #FF6B35;background:rgba(255,107,53,0.35);transform:rotate(45deg);box-shadow:0 0 14px rgba(255,107,53,0.85);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([AP1.lat, AP1.lon180], { icon: apIcon, zIndexOffset: 1000 })
      .bindPopup(
        `<div style="font-family:monospace;font-size:11px;color:#E8EDF7;background:#121826;padding:8px;border:1px solid #2A3548;min-width:180px">
          <strong style="color:#FF6B35">AP-1 · PRIME</strong><br/>
          ${AP1.lat}°N · ${(AP1.lon - 360).toFixed(1)}°E<br/>
          elev. ${AP1.elevationKm} km<br/>
          ice table ${AP1.iceTableCm[0]}–${AP1.iceTableCm[1]} cm<br/>
          WEH ${AP1.wehPercent[0]}–${AP1.wehPercent[1]}%
        </div>`
      )
      .addTo(map);

    depositsLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;
    // Fix tamaño al montar
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = {};
      swimOverlayRef.current = null;
      depositsLayerRef.current = null;
      prospectMarkerRef.current = null;
    };
  }, []);

  // Capas tile + opacidad
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const ensure = (id: string, url: string) => {
      if (!layersRef.current[id]) {
        layersRef.current[id] = L.tileLayer(url, {
          maxZoom: 12,
          attribution: "NASA",
          errorTileUrl:
            "data:image/svg+xml;utf8," +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#121826"/></svg>`
            ),
        });
      }
      return layersRef.current[id]!;
    };

    const mola = ensure("mola", MOLA_URL);
    const themis = ensure("themis", THEMIS_URL);
    const hirise = ensure("hirise", HIRISE_CTX_URL);

    const apply = (layer: L.TileLayer, on: boolean, id: string) => {
      const op = layerOpacity[id] ?? 1;
      layer.setOpacity(op);
      if (on && !map.hasLayer(layer)) layer.addTo(map);
      if (!on && map.hasLayer(layer)) map.removeLayer(layer);
    };

    apply(mola, activeLayers.includes("mola"), "mola");
    apply(themis, activeLayers.includes("themis"), "themis");
    apply(hirise, activeLayers.includes("hirise"), "hirise");

    // SWIM overlay (mock cliente) — bbox ventana AP-1
    const swimOn = activeLayers.includes("swim");
    const bounds: L.LatLngBoundsExpression = [
      [38, 202.1 - 180 - 2.5],
      [42, 202.1 - 180 + 2.5],
    ];
    if (swimOn) {
      if (!swimOverlayRef.current) {
        swimOverlayRef.current = L.imageOverlay(swimOverlayUrl(), bounds, {
          opacity: layerOpacity.swim ?? 0.75,
          interactive: false,
        });
      }
      swimOverlayRef.current.setOpacity(layerOpacity.swim ?? 0.75);
      if (!map.hasLayer(swimOverlayRef.current))
        swimOverlayRef.current.addTo(map);
    } else if (swimOverlayRef.current && map.hasLayer(swimOverlayRef.current)) {
      map.removeLayer(swimOverlayRef.current);
    }

    // WEH: mismo overlay con tinte distinto si está activo (placeholder)
    // (backend B3 lo reemplaza por tiles reales)
  }, [activeLayers, layerOpacity]);

  // Marcadores de ranking (F9)
  useEffect(() => {
    const group = depositsLayerRef.current;
    if (!group) return;
    group.clearLayers();

    deposits.forEach((d) => {
      const color =
        d.priority === "ALTA"
          ? "#3DFFA0"
          : d.priority === "MEDIA"
            ? "#FFC857"
            : "#FF6B35";
      const icon = L.divIcon({
        className: "",
        html: `<div title="${d.score}" style="
          width:10px;height:10px;border-radius:50%;
          background:${color};border:2px solid #0A0E14;
          box-shadow:0 0 8px ${color};
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });
      const m = L.marker([d.lat, d.lon < 0 ? d.lon + 360 : d.lon], { icon });
      m.bindTooltip(
        `score ${d.score.toFixed(2)} · ${d.priority} · ${d.distance_from_ap1_km} km`,
        { direction: "top", offset: [0, -6] }
      );
      m.on("click", () => {
        focusRef.current(d);
        setRightTab("ranking");
        void probe(d.lat, d.lon);
        mapRef.current?.flyTo([d.lat, d.lon < 0 ? d.lon + 360 : d.lon], 9, {
          duration: 0.6,
        });
      });
      group.addLayer(m);
    });
  }, [deposits, setRightTab, probe]);

  // Ping del prospector + lock-on (F6)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const unsub = subscribeSelected((p) => {
      if (prospectMarkerRef.current) {
        map.removeLayer(prospectMarkerRef.current);
        prospectMarkerRef.current = null;
      }
      if (!p) return;
      const icon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:18px;height:18px">
          <span style="position:absolute;inset:0;border:2px solid #5DD6FC;border-radius:50%;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite"></span>
          <span style="position:absolute;inset:4px;background:#5DD6FC;border-radius:50%;box-shadow:0 0 10px #5DD6FC"></span>
        </div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      prospectMarkerRef.current = L.marker([p.lat, p.lon], {
        icon,
        zIndexOffset: 900,
      }).addTo(map);
    });

    return unsub;
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
