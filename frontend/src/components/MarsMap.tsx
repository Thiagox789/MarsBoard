"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AP1, type LayerId } from "@/lib/mars";
import { useApp } from "@/store/app-store";
import { subscribeSelected } from "@/lib/bus";
import type { Deposit } from "@/lib/api";

export interface Waypoint {
  lat: number;
  lon: number; // 0–360
  label: string;
  type: "base" | "muestreo" | "comunicacion";
  depth?: string;
  diameter?: string;
  expected?: string;
}

interface Props {
  activeLayers: LayerId[];
  deposits: Deposit[];
  onPick: (p: { lat: number; lon: number }) => void;
  onFocusDeposit: (d: Deposit) => void;
  route?: Waypoint[];
  onToggleLayers?: () => void;
  onToggleInfo?: () => void;
}

const MOLA_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg";

const OPTICA_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg";

const GEOFISICA_URL =
  "https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.jpg";

export default function MarsMap({
  activeLayers,
  deposits,
  onPick,
  onFocusDeposit,
  route,
  onToggleLayers,
  onToggleInfo,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.TileLayer | null>>({});
  const pickRef = useRef(onPick);
  const focusRef = useRef(onFocusDeposit);
  const toggleLayersRef = useRef(onToggleLayers);
  const toggleInfoRef = useRef(onToggleInfo);
  const depositsLayerRef = useRef<L.LayerGroup | null>(null);
  const prospectMarkerRef = useRef<L.Marker | null>(null);
  const scaleBarRef = useRef<HTMLDivElement | null>(null);
  const gridLayersRef = useRef<L.Layer[]>([]);
  const routeLayersRef = useRef<L.Layer[]>([]);
  const drawRouteRef = useRef<((r: Waypoint[]) => void) | null>(null);

  const { layerOpacity, setRightTab, probe } = useApp();

  pickRef.current = onPick;
  focusRef.current = onFocusDeposit;
  toggleLayersRef.current = onToggleLayers;
  toggleInfoRef.current = onToggleInfo;

  // Init mapa
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [AP1.lat, AP1.lon180],
      zoom: 7,
      minZoom: 3,
      maxBounds: [[-90, -180], [90, 180]],
      maxBoundsViscosity: 1.0,
      zoomControl: true,
      attributionControl: true,
    });

    map.on("click", (e) => {
      pickRef.current({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    map.on("mousemove", (e) => {
      const lng = e.latlng.lng;
      const lat = e.latlng.lat;
      const lng360 = lng < 0 ? lng + 360 : lng;

      const el = document.getElementById("mars-cursor-coords");
      const el360 = document.getElementById("mars-cursor-coords-360");
      if (el) {
        el.textContent = `${lat.toFixed(4)}° · ${lng.toFixed(4)}°`;
      }
      if (el360) {
        el360.textContent = `(${lat.toFixed(4)}°N · ${lng360.toFixed(4)}°E)`;
      }
    });

    // Control de capas: queda apilado debajo de los botones + / -
    const layersBtn = L.DomUtil.create("button", "map-layers-btn");
    layersBtn.type = "button";
    layersBtn.title = "Mostrar u ocultar el panel lateral";
    layersBtn.setAttribute("aria-label", "Mostrar u ocultar el panel lateral");
    layersBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
    L.DomEvent.disableClickPropagation(layersBtn);
    L.DomEvent.on(layersBtn, "click", (e) => {
      L.DomEvent.stop(e);
      toggleLayersRef.current?.();
    });

    const LayersControl = L.Control.extend({
      onAdd: () => layersBtn,
    });
    new LayersControl({ position: "topright" }).addTo(map);

    // Control de información: panel lateral opuesto
    const infoBtn = L.DomUtil.create("button", "map-layers-btn");
    infoBtn.type = "button";
    infoBtn.title = "Mostrar u ocultar la información de la misión";
    infoBtn.setAttribute(
      "aria-label",
      "Mostrar u ocultar la información de la misión"
    );
    infoBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    L.DomEvent.disableClickPropagation(infoBtn);
    L.DomEvent.on(infoBtn, "click", (e) => {
      L.DomEvent.stop(e);
      toggleInfoRef.current?.();
    });

    const InfoControl = L.Control.extend({
      onAdd: () => infoBtn,
    });
    new InfoControl({ position: "topleft" }).addTo(map);

    depositsLayerRef.current = L.layerGroup().addTo(map);

    // Barra de escala de referencia fija: 500 km (recalculada con zoom y latitud)
    const scaleContainer = map.getContainer();
    const scaleBar = document.createElement("div");
    scaleBar.style.position = "absolute";
    scaleBar.style.bottom = "80px";
    scaleBar.style.right = "10px";
    scaleBar.style.zIndex = "1001";
    scaleBar.style.pointerEvents = "none";
    scaleBar.style.fontFamily = "var(--font-plex-mono), monospace";
    scaleBar.style.fontSize = "10px";
    scaleBar.style.color = "#e8edf7";
    scaleBar.style.background = "rgba(10, 14, 20, 0.85)";
    scaleBar.style.border = "1px solid #2a3548";
    scaleBar.style.padding = "6px 10px";
    scaleBar.style.borderRadius = "4px";
    scaleBar.style.display = "flex";
    scaleBar.style.flexDirection = "column";
    scaleBar.style.alignItems = "flex-start";
    scaleBar.style.gap = "2px";

    const barInner = document.createElement("div");
    barInner.style.height = "4px";
    barInner.style.background = "#5dd6fc";
    barInner.style.width = "100px";
    barInner.style.boxShadow = "0 0 8px rgba(93, 214, 252, 0.6)";
    scaleBar.appendChild(barInner);

    const label = document.createElement("div");
    label.style.fontSize = "9px";
    label.style.color = "#8b96ad";
    label.textContent = "500 km";
    scaleBar.appendChild(label);

    scaleContainer.appendChild(scaleBar);
    scaleBarRef.current = scaleBar;

    const updateScaleBar = () => {
      if (!map) return;
      const center = map.getCenter();
      const zoom = map.getZoom();
      const latRad = (center.lat * Math.PI) / 180;
      const groundResolution = (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
      const pixels = (500 * 1000) / groundResolution;
      barInner.style.width = `${Math.round(pixels)}px`;
    };

    updateScaleBar();
    map.on("zoomend moveend resize", updateScaleBar);

    mapRef.current = map;

    // Grilla de cuadrantes dinámica: se adapta al zoom y al área visible
    const gridStyle = {
      color: "#2a3548",
      weight: 1,
      opacity: 0.35,
      interactive: false,
      pointerEvents: false,
    } as const;

    const stepForZoom = (z: number): number => {
      if (z < 5) return 10;
      if (z < 7) return 5;
      return 1;
    };

    const updateGrid = () => {
      if (!map) return;

      // Limpiar grilla previa
      gridLayersRef.current.forEach((layer) => map.removeLayer(layer));
      gridLayersRef.current = [];

      const bounds = map.getBounds();
      const step = stepForZoom(map.getZoom());

      // Rango de latitudes visibles, alineado al paso
      const latMin = Math.floor(bounds.getSouth() / step) * step;
      const latMax = Math.ceil(bounds.getNorth() / step) * step;
      // Rango de longitudes visibles, alineado al paso
      const lonMin = Math.floor(bounds.getWest() / step) * step;
      const lonMax = Math.ceil(bounds.getEast() / step) * step;

      // Líneas horizontales (const lat)
      for (let lat = latMin; lat <= latMax; lat += step) {
        const line = L.polyline(
          [
            [lat, lonMin],
            [lat, lonMax],
          ],
          gridStyle
        ).addTo(map);
        gridLayersRef.current.push(line);
      }

      // Líneas verticales (const lon)
      for (let lon = lonMin; lon <= lonMax; lon += step) {
        const line = L.polyline(
          [
            [latMin, lon],
            [latMax, lon],
          ],
          gridStyle
        ).addTo(map);
        gridLayersRef.current.push(line);
      }
    };

    updateGrid();
    map.on("moveend zoomend resize", updateGrid);

    // Trazado de ruta (rutas de superficie entre estaciones)
    const routeStyle = {
      color: "#5dd6fc",
      weight: 3,
      opacity: 0.85,
      interactive: false,
      pointerEvents: false,
      dashArray: "8, 8",
    } as const;

    const wpIcon = (type: Waypoint["type"]) => {
      const baseStyles: Record<string, string> = {
        base: "#ff6b35",
        muestreo: "#3dfaa0",
        comunicacion: "#ffd166",
      };
      return L.divIcon({
        className: "",
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${baseStyles[type]};border:2px solid #0a0e14;box-shadow:0 0 10px ${baseStyles[type]};"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
    };

    const routeTooltipHtml = (w: Waypoint) => {
      const row = (name: string, value: string) =>
        `<div><span style="color:#8b96ad">${name}:</span> ${value}</div>`;
      const rows = [
        w.depth ? row("Profundidad", w.depth) : "",
        w.diameter ? row("Diámetro", w.diameter) : "",
        w.expected ? row("Qué se espera", w.expected) : "",
      ].join("");

      return `<div style="min-width:200px;max-width:280px">
        <div style="font-weight:600;color:#e8edf7;margin-bottom:4px">${w.label}</div>
        ${rows ? `<div style="display:flex;flex-direction:column;gap:2px;line-height:1.45">${rows}</div>` : ""}
      </div>`;
    };

    const drawRoute = (route: Waypoint[]) => {
      // Limpiar previa
      routeLayersRef.current.forEach((layer) => map.removeLayer(layer));
      routeLayersRef.current = [];

      if (!route || route.length < 2) return;

      const latlngs: [number, number][] = route.map((w) => [
        w.lat,
        w.lon > 180 ? w.lon - 360 : w.lon,
      ]);

      const polyline = L.polyline(latlngs, routeStyle).addTo(map);
      routeLayersRef.current.push(polyline);


      route.forEach((w, i) => {
        const m = L.marker([w.lat, w.lon > 180 ? w.lon - 360 : w.lon], {
          icon: wpIcon(w.type),
          zIndexOffset: 500 + i,
        }).bindTooltip(routeTooltipHtml(w), {
          permanent: false,
          direction: "top",
          offset: [0, -10],
          className: "route-tooltip",
        });
        m.addTo(map);
        routeLayersRef.current.push(m);
      });

      // Ajustar vista a la ruta
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8 });
    };
    drawRouteRef.current = drawRoute;
    setTimeout(() => map.invalidateSize(), 100);

    // El contenedor cambia de ancho al ocultar/mostrar el panel lateral:
    // sin esto Leaflet conserva el tamaño viejo y queda una franja sin pintar.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(map.getContainer());

    return () => {
      resizeObserver.disconnect();
      if (map) {
        map.off("zoomend moveend resize", updateScaleBar);
        map.off("moveend zoomend resize", updateGrid);
      }
      if (scaleBarRef.current && scaleBarRef.current.parentNode) {
        scaleBarRef.current.parentNode.removeChild(scaleBarRef.current);
        scaleBarRef.current = null;
      }
      gridLayersRef.current.forEach((layer) => map.removeLayer(layer));
      gridLayersRef.current = [];
      routeLayersRef.current.forEach((layer) => map.removeLayer(layer));
      routeLayersRef.current = [];
      map.remove();
      mapRef.current = null;
      layersRef.current = {};
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
          noWrap: true,
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
    const optica = ensure("optica", OPTICA_URL);
    const geofisica = ensure("geofisica", GEOFISICA_URL);

    const apply = (layer: L.TileLayer, on: boolean, id: string) => {
      const op = layerOpacity[id] ?? 1;
      layer.setOpacity(op);
      if (on && !map.hasLayer(layer)) layer.addTo(map);
      if (!on && map.hasLayer(layer)) map.removeLayer(layer);
    };

    apply(mola, activeLayers.includes("mola"), "mola");
    apply(optica, activeLayers.includes("optica"), "optica");
    apply(geofisica, activeLayers.includes("geofisica"), "geofisica");
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
      const m = L.marker([d.lat, d.lon > 180 ? d.lon - 360 : d.lon], { icon });
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

  // Trazado de ruta: reacciona a cambios en la prop route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !drawRouteRef.current) return;
    drawRouteRef.current(route ?? []);
  }, [route]);

  return <div ref={containerRef} className="h-full w-full" />;
}
