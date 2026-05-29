"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useJsApiLoader, GoogleMap, OverlayView, Polyline,
} from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";
import type { MapPoint, MapDay, MapLine } from "@/types";
import { getDayColor, getCategoryIcon } from "@/types";

const LIBRARIES: Libraries = ["geometry"];
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

interface MapViewerProps {
  points: MapPoint[];
  days: MapDay[];
  lines?: MapLine[];
  initialIndex?: number;
  mapTitle: string;
  isOwner?: boolean;
  mapId?: string;
}

interface RouteData {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}
function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

function MapViewerInner({
  points, days, lines = [], initialIndex = 0, mapTitle,
}: MapViewerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapType, setMapType] = useState("roadmap");
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(initialIndex, points.length - 1))
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [routeDataByDay, setRouteDataByDay] = useState<Record<string, RouteData | null>>({});
  const [routePathsByDay, setRoutePathsByDay] = useState<Record<string, google.maps.LatLng[]>>({});

  const sortedDays = useMemo(() => [...days].sort((a, b) => a.day_number - b.day_number), [days]);

  const { pointsByDay, ungroupedPoints, sortedPoints } = useMemo(() => {
    const byDay: Record<string, MapPoint[]> = {};
    for (const d of sortedDays) byDay[d.id] = [];
    const ungrouped: MapPoint[] = [];
    const sorted = [...points].sort((a, b) => a.order_index - b.order_index);
    for (const p of sorted) {
      if (p.day_id && p.day_id in byDay) byDay[p.day_id].push(p);
      else ungrouped.push(p);
    }
    return { pointsByDay: byDay, ungroupedPoints: ungrouped, sortedPoints: sorted };
  }, [points, sortedDays]);

  const current = sortedPoints[currentIndex] ?? null;
  const currentImages = current?.images ?? [];

  // Directions ルート取得
  useEffect(() => {
    sortedDays.forEach(async (day) => {
      const pts = (pointsByDay[day.id] ?? []).filter(p => p.lat != null && p.lng != null);
      if (pts.length < 2) { setRouteDataByDay(prev => ({ ...prev, [day.id]: null })); return; }
      try {
        const res = await fetch("/api/directions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waypoints: pts.map(p => ({ lat: p.lat, lng: p.lng })), travelMode: "DRIVE" }),
        });
        if (!res.ok) throw new Error();
        const route: RouteData = await res.json();
        setRouteDataByDay(prev => ({ ...prev, [day.id]: route }));
        if (route.encodedPolyline) {
          const path = google.maps.geometry.encoding.decodePath(route.encodedPolyline);
          setRoutePathsByDay(prev => ({ ...prev, [day.id]: path }));
        }
      } catch {
        const fallback = pts.map(p => new google.maps.LatLng(p.lat, p.lng));
        setRoutePathsByDay(prev => ({ ...prev, [day.id]: fallback }));
        setRouteDataByDay(prev => ({ ...prev, [day.id]: null }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sortedDays.map(d => d.id)), JSON.stringify(pointsByDay)]);

  const getPointIndex = (id: string) => sortedPoints.findIndex(p => p.id === id);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= sortedPoints.length) return;
    setCurrentIndex(index);
    setImageIndex(0);
    const target = sortedPoints[index];
    if (target && map) {
      map.panTo({ lat: target.lat, lng: target.lng });
      map.setZoom(14);
    }
  }, [map, sortedPoints]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goTo(currentIndex - 1);
      if (e.key === "ArrowRight") goTo(currentIndex + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, goTo]);

  useEffect(() => {
    if (map && current) {
      map.panTo({ lat: current.lat, lng: current.lng });
      map.setZoom(12);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (points.length === 0) {
    return (
      <div className="flex h-[calc(100vh-57px)] items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <p className="mb-2 text-5xl">📍</p>
          <p>ポイントがありません</p>
        </div>
      </div>
    );
  }

  const NavBar = () => (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
      <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 text-lg font-bold">
        ←
      </button>
      <span className="text-sm font-medium text-gray-500">{currentIndex + 1} / {sortedPoints.length}</span>
      <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === sortedPoints.length - 1}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 text-lg font-bold">
        →
      </button>
    </div>
  );

  const PointDetail = () => {
    if (!current) return null;
    return (
      <div className="overflow-y-auto p-4 max-h-56">
        <div className="flex items-start gap-2">
          <span className="text-base">{getCategoryIcon(current.category ?? "spot")}</span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-900 text-sm">{current.title}</h2>
            {current.start_time && (
              <p className="mt-0.5 text-xs text-blue-500">
                🕐 {current.start_time.slice(0, 5)}{current.end_time ? `〜${current.end_time.slice(0, 5)}` : ""}
              </p>
            )}
            {current.cost > 0 && <p className="mt-0.5 text-xs text-gray-400">💴 ¥{current.cost.toLocaleString()}</p>}
            {current.description && <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">{current.description}</p>}
          </div>
        </div>
        {currentImages.length > 0 && (
          <div className="mt-3">
            <div className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentImages[imageIndex].url}
                alt={currentImages[imageIndex].caption ?? current.title}
                className="h-36 w-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {currentImages[imageIndex].caption && (
                <p className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1 text-xs text-white">
                  {currentImages[imageIndex].caption}
                </p>
              )}
            </div>
            {currentImages.length > 1 && (
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <button onClick={() => setImageIndex(i => Math.max(0, i - 1))}
                  disabled={imageIndex === 0} className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30">‹</button>
                <span className="text-xs text-gray-400">{imageIndex + 1}/{currentImages.length}</span>
                <button onClick={() => setImageIndex(i => Math.min(currentImages.length - 1, i + 1))}
                  disabled={imageIndex === currentImages.length - 1} className="text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30">›</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* Desktop: 左パネル */}
      <div className="hidden sm:flex w-80 flex-shrink-0 flex-col border-r border-gray-100 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h1 className="font-semibold text-gray-900 truncate">{mapTitle}</h1>
        </div>
        <NavBar />
        <div className="flex-1 overflow-y-auto">
          <ul className="flex flex-col py-1">
            {sortedDays.map((day) => {
              const dayPts = pointsByDay[day.id] ?? [];
              const color  = day.color ?? getDayColor(day.day_number);
              const route  = routeDataByDay[day.id];
              return (
                <li key={day.id}>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100"
                    style={{ borderLeft: `3px solid ${color}` }}>
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-bold text-gray-600">Day {day.day_number}</span>
                        {day.title && <span className="text-xs text-gray-500">— {day.title}</span>}
                        {day.date && <span className="text-xs text-gray-400">({day.date})</span>}
                      </div>
                      {route && (
                        <p className="text-xs text-gray-400">
                          🚗 {fmtDist(route.distanceMeters)} · {fmtTime(route.durationSeconds)}
                        </p>
                      )}
                    </div>
                  </div>
                  {dayPts.map((point, idx) => {
                    const gi = getPointIndex(point.id);
                    return (
                      <button key={point.id} onClick={() => goTo(gi)}
                        className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50 ${gi === currentIndex ? "bg-blue-50" : ""}`}>
                        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: point.marker_color ?? color }}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${gi === currentIndex ? "text-blue-700" : "text-gray-800"}`}>
                            {point.title}
                          </p>
                          {point.start_time && <p className="text-xs text-gray-400">{point.start_time.slice(0, 5)}</p>}
                          {point.description && <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{point.description}</p>}
                        </div>
                        <span className="flex-shrink-0 text-xs text-gray-400 mt-0.5">{getCategoryIcon(point.category ?? "spot")}</span>
                      </button>
                    );
                  })}
                </li>
              );
            })}
            {ungroupedPoints.length > 0 && (
              <li>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100"
                  style={{ borderLeft: "3px solid #9ca3af" }}>
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-400 flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-500">日程なし</span>
                </div>
                {ungroupedPoints.map((point, idx) => {
                  const gi = getPointIndex(point.id);
                  return (
                    <button key={point.id} onClick={() => goTo(gi)}
                      className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50 ${gi === currentIndex ? "bg-blue-50" : ""}`}>
                      <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${gi === currentIndex ? "bg-gray-600" : "bg-gray-400"}`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${gi === currentIndex ? "text-blue-700" : "text-gray-800"}`}>{point.title}</p>
                        {point.description && <p className="mt-0.5 line-clamp-1 text-xs text-gray-400">{point.description}</p>}
                      </div>
                    </button>
                  );
                })}
              </li>
            )}
          </ul>
        </div>
        <div className="border-t border-gray-100">
          <PointDetail />
        </div>
      </div>

      {/* 地図 */}
      <div className="relative flex-1">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER_STYLE}
          center={current ? { lat: current.lat, lng: current.lng } : { lat: 35.6895, lng: 139.6917 }}
          zoom={12}
          onLoad={setMap}
          onUnmount={() => setMap(null)}
          options={{ gestureHandling: "greedy", mapTypeId: mapType }}
        >
          {/* Directions ルート */}
          {sortedDays.map(day => {
            const path = routePathsByDay[day.id];
            if (!path || path.length < 2) return null;
            return (
              <Polyline key={day.id} path={path}
                options={{ strokeColor: day.color ?? getDayColor(day.day_number), strokeWeight: 4, strokeOpacity: 0.85 }} />
            );
          })}

          {/* 描画ライン */}
          {lines.map(line => (
            <Polyline key={line.id}
              path={line.coordinates.map(([lng, lat]) => ({ lat, lng }))}
              options={{ strokeColor: line.color, strokeWeight: line.width, strokeOpacity: 1 }} />
          ))}

          {/* 日程別マーカー */}
          {sortedDays.map(day => {
            const dayPts = pointsByDay[day.id] ?? [];
            const color  = day.color ?? getDayColor(day.day_number);
            return dayPts.map((point, idx) => {
              const gi = getPointIndex(point.id);
              return (
                <OverlayView key={point.id} position={{ lat: point.lat, lng: point.lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                  <div onClick={() => goTo(gi)}
                    style={{
                      backgroundColor: point.marker_color ?? color,
                      transform: `translate(-50%, -50%) scale(${gi === currentIndex ? 1.3 : 1})`,
                      outline: gi === currentIndex ? "2px solid #1e40af" : "2px solid white",
                    }}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-bold text-white shadow-md transition-transform hover:scale-110">
                    {idx + 1}
                  </div>
                </OverlayView>
              );
            });
          })}

          {/* 日程なしマーカー */}
          {ungroupedPoints.map((point, idx) => {
            const gi = getPointIndex(point.id);
            return (
              <OverlayView key={point.id} position={{ lat: point.lat, lng: point.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div onClick={() => goTo(gi)}
                  style={{
                    backgroundColor: point.marker_color ?? "#9CA3AF",
                    transform: `translate(-50%, -50%) scale(${gi === currentIndex ? 1.3 : 1})`,
                    outline: gi === currentIndex ? "2px solid #374151" : "2px solid white",
                  }}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-bold text-white shadow-md transition-transform hover:scale-110">
                  {idx + 1}
                </div>
              </OverlayView>
            );
          })}
        </GoogleMap>

        {/* マップタイプ切替 */}
        <div className="absolute right-3 top-3 z-10 flex gap-1">
          {(["roadmap", "satellite", "hybrid"] as const).map((id) => (
            <button key={id} onClick={() => setMapType(id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium shadow-md transition ${
                mapType === id ? "bg-blue-600 text-white" : "bg-white/90 text-gray-700 hover:bg-white"
              }`}>
              {id === "roadmap" ? "道路" : id === "satellite" ? "衛星" : "混合"}
            </button>
          ))}
        </div>

        {/* モバイル: 下部パネル */}
        <div className="absolute bottom-0 left-0 right-0 sm:hidden bg-white border-t border-gray-200 shadow-lg">
          <NavBar />
          <PointDetail />
        </div>
      </div>
    </div>
  );
}

export function MapViewer(props: MapViewerProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script-viewer",
    googleMapsApiKey: MAPS_API_KEY,
    libraries: LIBRARIES,
    language: "ja",
    region: "JP",
  });

  if (loadError) return (
    <div className="flex h-[calc(100vh-57px)] items-center justify-center text-red-500">
      <p className="text-center text-sm">地図の読み込みに失敗しました</p>
    </div>
  );

  if (!isLoaded) return (
    <div className="flex h-[calc(100vh-57px)] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
    </div>
  );

  return <MapViewerInner {...props} />;
}
