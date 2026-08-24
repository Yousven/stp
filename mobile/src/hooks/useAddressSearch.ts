import { useEffect, useRef, useState } from "react";

export interface AddressSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
}

// Port: public/admin_add_object.php fetchAddressSuggestions() — sama Nominatim
// (OpenStreetMap) otsing, Eesti aadressidele piiratud, nüüd debounce'itud.
export function useAddressSearch(query: string) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const requestId = useRef(0);

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const currentId = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=ee&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as Array<{ display_name: string; lat: string; lon: string }>;
        if (requestId.current !== currentId) return; // aegunud vastus, ignoreeri
        setSuggestions(
          data.map((item) => ({
            displayName: item.display_name,
            latitude: Number(item.lat),
            longitude: Number(item.lon),
          }))
        );
      } catch {
        // Vaikimisi ignoreeri võrguvigu — kasutaja saab koordinaadid ka kaardilt/käsitsi sisestada.
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return suggestions;
}
