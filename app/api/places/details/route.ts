import { NextRequest, NextResponse } from "next/server";

const SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY;

export async function POST(req: NextRequest) {
  if (!SERVER_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.placeId) {
    return NextResponse.json({ error: "placeId required" }, { status: 400 });
  }

  const { placeId } = body as { placeId: string };

  const fieldMask = [
    "id",
    "displayName",
    "formattedAddress",
    "rating",
    "regularOpeningHours",
    "internationalPhoneNumber",
    "websiteUri",
    "editorialSummary",
    "photos",
  ].join(",");

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": SERVER_KEY,
        "X-Goog-FieldMask": fieldMask,
        "Accept-Language": "ja",
      },
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Places API error" }, { status: 502 });
  }

  const data = await res.json();

  return NextResponse.json({
    name: data.displayName?.text ?? null,
    address: data.formattedAddress ?? null,
    rating: data.rating ?? null,
    phone: data.internationalPhoneNumber ?? null,
    website: data.websiteUri ?? null,
    openingHours: data.regularOpeningHours?.weekdayDescriptions ?? null,
    description: data.editorialSummary?.text ?? null,
    photoNames: (data.photos ?? [])
      .slice(0, 3)
      .map((p: { name: string }) => p.name),
  });
}
