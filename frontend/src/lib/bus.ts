/** Bus de eventos mapa ↔ store (sin Leaflet, seguro para SSR). */
const bus = new EventTarget();

export type SelectedPoint = { lat: number; lon: number } | null;

export function emitSelected(p: SelectedPoint) {
  if (typeof EventTarget === "undefined") return;
  bus.dispatchEvent(new CustomEvent("selected", { detail: p }));
}

export function subscribeSelected(cb: (p: SelectedPoint) => void) {
  const h = (e: Event) => cb((e as CustomEvent).detail);
  bus.addEventListener("selected", h);
  return () => bus.removeEventListener("selected", h);
}
