export interface PlaceSuggestion {
  name: string;
  lat: number;
  lng: number;
}

// Shape of one GeoJSON feature from Photon -- komoot's free, typo-tolerant
// geocoder built on OpenStreetMap data. https://photon.komoot.io
export interface PhotonFeature {
  properties: {
    name?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
  };
  geometry: {
    coordinates: [lng: number, lat: number];
  };
}

export interface PhotonSearchResponse {
  features: PhotonFeature[];
}

const SEARCH_URL = "https://photon.komoot.io/api/";
const RESULT_LIMIT = 5;

export function buildPlaceSearchUrl(query: string): string {
  const params = new URLSearchParams({
    q: query,
    limit: String(RESULT_LIMIT),
    lang: "en",
    // Restricts results to settlements (city/town/village/hamlet/...),
    // excluding businesses, shops, and other points of interest that would
    // otherwise show up alongside actual places.
    osm_tag: "place",
  });
  return `${SEARCH_URL}?${params.toString()}`;
}

// Builds a Nominatim-style "Name, County, State, Country" label from
// Photon's separate address fields, skipping any that are missing or
// repeat a value already included (e.g. a city that matches the name).
function formatPlaceName(properties: PhotonFeature["properties"]): string {
  const parts = [properties.name, properties.city, properties.county, properties.state, properties.country];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    if (part && !seen.has(part)) {
      seen.add(part);
      unique.push(part);
    }
  }
  return unique.join(", ");
}

export function parsePlaceSearchResults(response: PhotonSearchResponse): PlaceSuggestion[] {
  return response.features
    .map((feature) => ({
      name: formatPlaceName(feature.properties),
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
    }))
    .filter((suggestion) => suggestion.name.length > 0);
}
