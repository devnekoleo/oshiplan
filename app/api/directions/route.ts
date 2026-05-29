import { NextRequest, NextResponse } from "next/server";

const SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY;

export type TravelMode = "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";

export interface WaypointCoord {
  lat: number;
  lng: number;
}

function makeLoc(w: WaypointCoord) {
  return { location: { latLng: { latitude: w.lat, longitude: w.lng } } };
}

export async function POST(req: NextRequest) {
  if (!SERVER_KEY) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.waypoints || body.waypoints.length < 2) {
    return NextResponse.json({ error: "at least 2 waypoints required" }, { status: 400 });
  }

  const { waypoints, travelMode = "DRIVE" } = body as {
    waypoints: WaypointCoord[];
    travelMode?: TravelMode;
  };

  const [origin, ...rest] = waypoints;
  const destination = rest.pop()!;
  const intermediates = rest.map(makeLoc);

  const payload = {
    origin: makeLoc(origin),
    destination: makeLoc(destination),
    intermediates,
    travelMode,
    computeAlternativeRoutes: false,
    routingPreference: travelMode === "DRIVE" ? "TRAFFIC_AWARE" : undefined,
  };

  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": SERVER_KEY,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.duration,routes.legs.distanceMeters",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: "Routes API error" }, { status: 502 });
  }

  const json = await res.json();
  const route = json.routes?.[0];
  if (!route) {
    return NextResponse.json({ error: "No route found" }, { status: 404 });
  }

  return NextResponse.json({
    encodedPolyline: route.polyline?.encodedPolyline ?? "",
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: parseInt(route.duration?.replace("s", "") ?? "0"),
  });
}
