export interface VenueInfo {
  name: string;
  address: string;
  lat: number;
  lng: number;
  nearestStation?: string;
}

interface PlacesSearchResponse {
  places?: Array<{
    displayName?: { text: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
  }>;
}

export async function getVenueInfo(venueName: string): Promise<VenueInfo | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.location",
        },
        body: JSON.stringify({
          textQuery: `${venueName} 日本`,
          languageCode: "ja",
          maxResultCount: 1,
        }),
      }
    );

    if (!res.ok) return null;

    const data: PlacesSearchResponse = await res.json();
    const place = data.places?.[0];
    if (!place || !place.location) return null;

    return {
      name: place.displayName?.text ?? venueName,
      address: place.formattedAddress ?? "",
      lat: place.location.latitude,
      lng: place.location.longitude,
    };
  } catch {
    return null;
  }
}

export async function getMapsContext(
  venueName: string,
  _departure: string
): Promise<string> {
  const venue = await getVenueInfo(venueName);
  if (!venue) return "";

  const lines: string[] = [
    `会場: ${venue.name}（${venue.address}、緯度${venue.lat.toFixed(4)}, 経度${venue.lng.toFixed(4)}）`,
  ];

  if (venue.nearestStation) {
    lines.push(`最寄り駅: ${venue.nearestStation}`);
  }

  return lines.join("\n");
}
