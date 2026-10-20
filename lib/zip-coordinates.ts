// Approximate zip-code centroids for the Nashville-area zips currently in use.
// These are general-knowledge approximations, not from a verified geocoding
// service — good enough for sorting matches by rough distance, not for anything
// safety- or precision-critical. No geocoding API is configured for this app.
const ZIP_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '42101': { lat: 39.993449, lng: -86.441620 }, // Downtown
  '42104': { lat: 39.909461, lng: -86.370727 }, // Midtown / Music Row
};

export function zipCoordinates(zip: string): { lat: number; lng: number } | null {
  return ZIP_COORDINATES[zip] ?? null;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Great-circle distance via the Haversine formula. Returns null if either zip
// isn't in the lookup table, rather than fabricating a distance.
export function haversineMiles(zipA: string, zipB: string): number | null {
  const a = zipCoordinates(zipA);
  const b = zipCoordinates(zipB);
  if (!a || !b) return null;

  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return earthRadiusMiles * c;
}
