"use client";

import { useRef, useState, useEffect } from "react";
import Map, { Marker, NavigationControl, Source, Layer, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapPoint, MapDay, MapLine } from "@/types";
import { getDayColor, getCategoryIcon } from "@/types";

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
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance: number;
  duration: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}
function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

export function MapViewer({
  points, days, lines = [], initialIndex = 0,
  mapTitle, isOwner, mapId,
}: MapViewerProps) {
  const desktopMapRef = useRef<MapRef>(null);
  const mobileMapRef  = useRef<MapRef>(null);
  const [currentIndex,  setCurrentIndex]  = useState(Math.max(0, Math.min(initialIndex, points.length - 1)));
  const [imageIndex,    setImageIndex]    = useState(0);
  const [desktopLoaded, setDesktopLoaded] = useState(false);
  const [mobileLoaded,  setMobileLoaded]  = useState(false);
  const [routeDataByDay, setRouteDataByDay] = useState<Record<string, RouteData | null>>({});

  const current = points[currentIndex] ?? null;

  // Group points by day
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);
  const pointsByDay: Record<string, MapPoint[]> = {};
  for (const d of sortedDays) pointsByDay[d.id] = [];
  const ungroupedPoints: MapPoint[] = [];
  const sortedPoints = [...points].sort((a, b) => a.order_index - b.order_index);
  for (const p of sortedPoints) {
    if (p.day_id && p.day_id in pointsByDay) pointsByDay[p.day_id].push(p);
    else ungroupedPoints.push(p);
  }
  const getPointIndex = (id: string) => points.findIndex(p => p.id === id);

  // Fetch Directions API routes for each day
  useEffect(() => {
    sortedDays.forEach(async (day) => {
      const pts = (pointsByDay[day.id] ?? []).filter(p => p.lat !== null && p.lng !== null);
      if (pts.length < 2) { setRouteDataByDay(prev => ({ ...prev, [day.id]: null })); return; }
      const coords = pts.map(p => `${p.lng},${p.lat}`).join(";");
      try {
        const res = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`
        );
        const json = await res.json();
        if (json.routes?.[0]) {
          setRouteDataByDay(prev => ({
            ...prev,
            [day.id]: {
              geometry: json.routes[0].geometry,
              distance: json.routes[0].distance,
              duration: json.routes[0].duration,
            },
          }));
        }
      } catch { /* fallback to straight line */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pointsByDay)]);

  const flyToPoint = (index: number) => {
    const target = points[index];
    if (!target) return;
    desktopMapRef.current?.flyTo({ center: [target.lng, target.lat], zoom: 14, duration: 1000, essential: true });
    mobileMapRef.current?.flyTo({ center: [target.lng, target.lat], zoom: 14, duration: 1000, essential: true });
  };

  useEffect(() => {
    if (desktopLoaded && current) {
      desktopMapRef.current?.flyTo({ center: [current.lng, current.lat], zoom: 14, duration: 1200, essential: true });
    }
  }, [desktopLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mobileLoaded && current) {
      mobileMapRef.current?.flyTo({ center: [current.lng, current.lat], zoom: 14, duration: 1200, essential: true });
    }
  }, [mobileLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setImageIndex(0); }, [currentIndex]);

  const goTo = (index: number) => {
    if (index < 0 || index >= points.length) return;
    setCurrentIndex(index);
    flyToPoint(index);
  };

  const currentImages = current?.images ?? [];

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

  // Shared map content (routes + markers + drawn lines)
  const MapContent = () => (
    <>
      {/* Directions API routes per day (or straight-line fallback) */}
      {sortedDays.map((day) => {
        const dayPts = pointsByDay[day.id] ?? [];
        const color  = getDayColor(day.day_number);
        const route  = routeDataByDay[day.id];
        if (route) {
          return (
            <Source key={`r-${day.id}`} id={`r-${day.id}`} type="geojson"
              data={{ type: "Feature", properties: {}, geometry: route.geometry }}>
              <Layer id={`rl-${day.id}`} type="line"
                paint={{ "line-color": color, "line-width": 3, "line-opacity": 0.8 }} />
            </Source>
          );
        }
        if (dayPts.length < 2) return null;
        return (
          <Source key={`r-${day.id}`} id={`r-${day.id}`} type="geojson" data={{
            type: "Feature", properties: {},
            geometry: { type: "LineString", coordinates: dayPts.map(p => [p.lng, p.lat]) },
          }}>
            <Layer id={`rl-${day.id}`} type="line"
              paint={{ "line-color": color, "line-width": 2, "line-dasharray": [2, 1] }} />
          </Source>
        );
      })}

      {/* User-drawn lines */}
      {lines.map(line => (
        <Source key={`ln-${line.id}`} id={`ln-${line.id}`} type="geojson" data={{
          type: "Feature", properties: {},
          geometry: { type: "LineString", coordinates: line.coordinates },
        }}>
          <Layer id={`lnl-${line.id}`} type="line"
            paint={{ "line-color": line.color, "line-width": line.width }} />
        </Source>
      ))}

      {/* Day-grouped markers */}
      {sortedDays.map((day) => {
        const dayPts = pointsByDay[day.id] ?? [];
        const color  = getDayColor(day.day_number);
        return dayPts.map((point, idx) => {
          const gi = getPointIndex(point.id);
          return (
            <Marker key={point.id} longitude={point.lng} latitude={point.lat}
              onClick={() => goTo(gi)}>
              <div className={`flex cursor-pointer items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-md transition-all ${
                gi === currentIndex ? "h-10 w-10 text-sm scale-110" : "h-7 w-7 text-xs hover:scale-105"
              }`} style={{ backgroundColor: point.marker_color ?? color }}>
                {idx + 1}
              </div>
            </Marker>
          );
        });
      })}

      {/* Ungrouped markers */}
      {ungroupedPoints.map((point, idx) => {
        const gi = getPointIndex(point.id);
        return (
          <Marker key={point.id} longitude={point.lng} latitude={point.lat}
            onClick={() => goTo(gi)}>
            <div className={`flex cursor-pointer items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-md transition-all ${
              gi === currentIndex ? "h-10 w-10 text-sm scale-110 bg-gray-600" : "h-7 w-7 text-xs hover:scale-105 bg-gray-400"
            }`}>
              {idx + 1}
            </div>
          </Marker>
        );
      })}
    </>
  );

  // Sidebar point list grouped by day
  const SidebarList = () => (
    <ul className="flex flex-col py-1">
      {sortedDays.map((day) => {
        const dayPts = pointsByDay[day.id] ?? [];
        const color  = getDayColor(day.day_number);
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
                  <p className="text-xs text-gray-400">🚗 {fmtDist(route.distance)} · {fmtTime(route.duration)}</p>
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
                <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  gi === currentIndex ? "bg-gray-600" : "bg-gray-400"
                }`}>{idx + 1}</div>
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
  );

  // Point detail panel (shared between desktop sidebar bottom and mobile)
  const PointDetail = ({ compact }: { compact?: boolean }) => {
    if (!current) return null;
    return (
      <div className={`overflow-y-auto p-4 ${compact ? "max-h-52" : "max-h-56"}`}>
        <div className="flex items-start gap-2">
          <span className="text-base">{getCategoryIcon(current.category ?? "spot")}</span>
          <div className="flex-1 min-w-0">
            <h2 className={`font-bold text-gray-900 ${compact ? "text-base" : "text-sm"}`}>{current.title}</h2>
            {current.start_time && (
              <p className="mt-0.5 text-xs text-blue-500">
                🕐 {current.start_time.slice(0, 5)}{current.end_time ? `〜${current.end_time.slice(0, 5)}` : ""}
              </p>
            )}
            {current.cost > 0 && <p className="mt-0.5 text-xs text-gray-400">💴 ¥{current.cost.toLocaleString()}</p>}
            {current.description && (
              <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">{current.description}</p>
            )}
          </div>
        </div>
        {currentImages.length > 0 && (
          <div className="mt-3">
            <div className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentImages[imageIndex].url}
                alt={currentImages[imageIndex].caption ?? current.title}
                className={compact ? "h-40 w-full object-cover" : "h-36 w-full object-cover"}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
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

  const NavBar = ({ compact }: { compact?: boolean }) => (
    <div className={`flex items-center justify-between border-b border-gray-100 px-4 ${compact ? "py-2" : "py-2"}`}>
      <button onClick={() => goTo(currentIndex - 1)} disabled={currentIndex === 0}
        className={`flex items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 ${compact ? "h-9 w-9 text-lg font-bold" : "h-8 w-8"}`}>
        ←
      </button>
      <span className={`font-medium text-gray-500 ${compact ? "text-sm" : "text-xs"}`}>
        {currentIndex + 1} / {points.length}
      </span>
      <button onClick={() => goTo(currentIndex + 1)} disabled={currentIndex === points.length - 1}
        className={`flex items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30 ${compact ? "h-9 w-9 text-lg font-bold" : "h-8 w-8"}`}>
        →
      </button>
    </div>
  );

  return (
    <>
      {/* ── デスクトップ: 左パネル + 右地図 ── */}
      <div className="hidden sm:flex h-[calc(100vh-57px)]">
        <div className="flex w-72 flex-shrink-0 flex-col border-r border-gray-100 bg-white">
          {/* ヘッダー */}
          <div className="border-b border-gray-100 px-4 py-4">
            <h1 className="truncate text-base font-bold text-gray-900">📍 {mapTitle}</h1>
            <p className="mt-0.5 text-xs text-gray-400">{points.length} ポイント</p>
            {isOwner && mapId && (
              <a href={`/maps/${mapId}`}
                className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-200 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                ✏️ 編集
              </a>
            )}
          </div>

          {/* ポイント一覧 */}
          <div className="flex-1 overflow-y-auto">
            <SidebarList />
          </div>

          {/* 選択中ポイント詳細 + ナビ */}
          {current && (
            <div className="border-t border-gray-100 bg-gray-50">
              <NavBar />
              <PointDetail />
            </div>
          )}
        </div>

        {/* 地図 */}
        <div className="relative flex-1">
          <Map ref={desktopMapRef} mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{ longitude: points[initialIndex]?.lng ?? 139.6917, latitude: points[initialIndex]?.lat ?? 35.6895, zoom: 13 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            onLoad={() => setDesktopLoaded(true)}>
            <NavigationControl position="top-right" />
            <MapContent />
          </Map>
        </div>
      </div>

      {/* ── モバイル: 地図上 + 情報下 ── */}
      <div className="flex sm:hidden h-[calc(100vh-57px)] flex-col">
        <div className="relative flex-1">
          <Map ref={mobileMapRef} mapboxAccessToken={MAPBOX_TOKEN}
            initialViewState={{ longitude: points[initialIndex]?.lng ?? 139.6917, latitude: points[initialIndex]?.lat ?? 35.6895, zoom: 13 }}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            onLoad={() => setMobileLoaded(true)}>
            <NavigationControl position="top-right" />
            <MapContent />
          </Map>

          {/* タイトルオーバーレイ */}
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <div className="rounded-full bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
              <span className="text-sm font-semibold text-gray-800">📍 {mapTitle}</span>
            </div>
            {isOwner && mapId && (
              <a href={`/maps/${mapId}`}
                className="rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-blue-600 shadow-sm backdrop-blur-sm hover:bg-white">
                ✏️ 編集
              </a>
            )}
          </div>
        </div>

        {/* ボトムパネル */}
        <div className="flex-shrink-0 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <NavBar compact />
          <PointDetail compact />
          {/* ドットインジケーター */}
          <div className="flex items-center justify-center gap-1.5 px-4 py-2">
            {points.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all ${i === currentIndex ? "w-5 bg-blue-600" : "w-2 bg-gray-200"}`} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
