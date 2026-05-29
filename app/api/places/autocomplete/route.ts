import { NextRequest, NextResponse } from "next/server";

const SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY;

export async function POST(req: NextRequest) {
  if (!SERVER_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.input) {
    return NextResponse.json({ error: "input required" }, { status: 400 });
  }

  const { input, lat, lng, radius = 50000 } = body as {
    input: string;
    lat?: number;
    lng?: number;
    radius?: number;
  };

  const payload: Record<string, unknown> = {
    input,
    languageCode: "ja",
    regionCode: "JP",
  };

  if (lat != null && lng != null) {
    payload.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius },
    };
  }

  const res = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": SERVER_KEY,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Places API error", suggestions: [] }, { status: 502 });
  }

  const json = await res.json();
  const suggestions = (json.suggestions ?? []).map(
    (s: { placePrediction?: { placeId: string; text: { text: string }; structuredFormat?: { mainText: { text: string }; secondaryText?: { text: string } } } }) => ({
      placeId: s.placePrediction?.placeId ?? "",
      text: s.placePrediction?.text?.text ?? "",
      primaryText: s.placePrediction?.structuredFormat?.mainText?.text ?? s.placePrediction?.text?.text ?? "",
      secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text ?? "",
    })
  );

  return NextResponse.json({ suggestions });
}
