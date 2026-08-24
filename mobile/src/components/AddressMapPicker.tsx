import { useEffect, useRef } from "react";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

// Vite pakib Leafleti vaikimisi markeri pildid teistmoodi kui Leaflet ise
// ootab — määrame need käsitsi, muidu jääks marker nähtamatuks.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Eesti keskpunkt umbes — kasutatakse, kui objektil pole veel koordinaate.
const DEFAULT_CENTER: [number, number] = [58.65, 25.05];

interface AddressMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lon: number) => void;
}

export function AddressMapPicker({ latitude, longitude, onChange }: AddressMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const hasPosition = latitude !== null && longitude !== null;
    const center: [number, number] = hasPosition ? [latitude!, longitude!] : DEFAULT_CENTER;

    const map = L.map(containerRef.current).setView(center, hasPosition ? 15 : 7);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(center, { icon: defaultIcon, draggable: true }).addTo(map);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChangeRef.current(pos.lat, pos.lng);
    });

    map.on("click", (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onChangeRef.current(e.latlng.lat, e.latlng.lng);
    });

    // Capacitor WebView-s arvutatakse konteineri suurus mõnikord valesti
    // enne esimest renderdust — sunnib Leafleti mõõtu uuesti kontrollima.
    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kui koordinaadid muutuvad väljastpoolt (nt aadressi valik), liiguta märki.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || latitude === null || longitude === null) return;
    const pos: [number, number] = [latitude, longitude];
    markerRef.current.setLatLng(pos);
    mapRef.current.setView(pos, Math.max(mapRef.current.getZoom(), 15));
  }, [latitude, longitude]);

  return <div ref={containerRef} style={{ height: "260px", borderRadius: "0.75rem", overflow: "hidden" }} />;
}
