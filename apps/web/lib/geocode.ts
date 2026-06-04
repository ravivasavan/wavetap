/**
 * Best-effort server-side geocoding of an Australian suburb/postcode → lat/lng
 * via Nominatim (OpenStreetMap) — no API key. Returns null on any failure so it
 * never blocks onboarding. Low volume (one call per signup) stays within OSM's
 * usage policy; swap to a keyed provider or a bundled AU postcode dataset if
 * volume grows. SERVER-ONLY.
 */
export async function geocodeAU(input: {
  suburb?: string | null;
  postcode?: string | null;
  state?: string | null;
}): Promise<{ lat: number; lng: number } | null> {
  if (!input.suburb?.trim() && !input.postcode?.trim()) return null;
  const q = [input.suburb, input.postcode, input.state, "Australia"]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("countrycodes", "au");
    url.searchParams.set("limit", "1");

    const res = await fetch(url, {
      headers: { "User-Agent": "WaveTap/1.0 (https://wavetap.app)" },
      signal: AbortSignal.timeout(4000), // never hang signup on a slow geocoder
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return null;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
