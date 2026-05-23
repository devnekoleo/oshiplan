"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Map, {
  Marker, NavigationControl, Source, Layer, Popup,
  type MapRef, type MapMouseEvent,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { PointPanel } from "./PointPanel";
import {
  createPoint, updatePoint, deletePoint, reorderPoints,
  addDay, updateDay, deleteDay,
  createLine, deleteLine,
} from "@/app/maps/[id]/actions";
import type { MapPoint, PointImage, MapDay, MapLine } from "@/types";
import { getDayColor, getCategoryIcon } from "@/types";

interface MapEditorProps {
  mapId: string;
  initialPoints: MapPoint[];
  initialDays: MapDay[];
  initialLines?: MapLine[];
}

interface PendingPoint { lat: number; lng: number; }
interface GeocodingFeature { id: string; place_name: string; center: [number, number]; }
interface RouteData {
  geometry: { type: "LineString"; coordinates: [number, number][] };
  distance: number;
  duration: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const MAP_STYLES = [
  { id: "streets-v12",          label: "地図", icon: "🗺️" },
  { id: "satellite-streets-v12", label: "衛星", icon: "🛰️" },
  { id: "outdoors-v12",         label: "地形", icon: "⛰️" },
] as const;
type MapStyleId = (typeof MAP_STYLES)[number]["id"];

const LINE_DRAW_COLORS = ["#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6","#EC4899"];

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`;
}
function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

function DayHeader({
  day, isCollapsed, routeData, onToggleCollapse, onDelete, onUpdateTitle, onUpdateDate,
}: {
  day: MapDay; isCollapsed: boolean; routeData?: RouteData | null;
  onToggleCollapse: () => void; onDelete: () => void;
  onUpdateTitle: (t: string) => void; onUpdateDate: (d: string) => void;
}) {
  const color = getDayColor(day.day_number);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(day.title ?? "");

  const commit = () => {
    setEditing(false);
    if (val !== (day.title ?? "")) onUpdateTitle(val);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100 select-none">
      <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <span className="text-xs font-bold text-gray-700 flex-shrink-0">Day {day.day_number}</span>
          {editing ? (
            <input autoFocus value={val}
              onChange={e => setVal(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(day.title ?? ""); setEditing(false); } }}
              className="text-xs text-gray-600 border-b border-blue-400 outline-none bg-transparent flex-1 min-w-0"
              placeholder="タイトルを追加..."
            />
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-600 truncate">
              {day.title || "タイトルを追加..."}
            </button>
          )}
          {day.date && <span className="text-xs text-gray-400 flex-shrink-0">({day.date})</span>}
        </div>
        {routeData && (
          <p className="text-xs text-gray-400 mt-0.5">
            🚗 {fmtDist(routeData.distance)} · {fmtTime(routeData.duration)}
          </p>
        )}
      </div>
      <input type="date" value={day.date ?? ""}
        onChange={e => onUpdateDate(e.target.value)}
        title="日付を設定"
        className="text-xs text-gray-500 border border-gray-200 rounded px-1 py-0.5 text-xs w-24 flex-shrink-0"
      />
      <button onClick={onToggleCollapse} className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0">
        {isCollapsed ? "▶" : "▼"}
      </button>
      <button
        onClick={() => { if (confirm(`Day ${day.day_number} を削除しますか？ポイントは日程なしになります。`)) onDelete(); }}
        className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0" title="削除"
      >🗑</button>
    </div>
  );
}

export function MapEditor({ mapId, initialPoints, initialDays, initialLines = [] }: MapEditorProps) {
  const mapRef = useRef<MapRef>(null);
  const [points, setPoints]           = useState<MapPoint[]>(initialPoints);
  const [days, setDays]               = useState<MapDay[]>(initialDays);
  const [lines, setLines]             = useState<MapLine[]>(initialLines);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [pendingPoint, setPendingPoint]   = useState<PendingPoint | null>(null);
  const [panelMode, setPanelMode]     = useState<"none" | "new" | "edit">("none");
  const [mapStyle, setMapStyle]       = useState<MapStyleId>("streets-v12");
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [routeDataByDay, setRouteDataByDay] = useState<Record<string, RouteData | null>>({});
  const [popupPoint, setPopupPoint]   = useState<MapPoint | null>(null);

  // Draw mode
  const [drawMode, setDrawMode]           = useState(false);
  const [drawingCoords, setDrawingCoords] = useState<[number, number][]>([]);
  const [drawColor, setDrawColor]         = useState(LINE_DRAW_COLORS[0]);
  const [drawName, setDrawName]           = useState("");

  // Search
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingFeature[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showResults, setShowResults]   = useState(false);
  const searchRef   = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Computed groupings
  const sortedDays = [...days].sort((a, b) => a.day_number - b.day_number);
  const pointsByDay: Record<string, MapPoint[]> = {};
  for (const d of sortedDays) pointsByDay[d.id] = [];
  const ungroupedPoints: MapPoint[] = [];
  const sortedPoints = [...points].sort((a, b) => a.order_index - b.order_index);
  for (const p of sortedPoints) {
    if (p.day_id && p.day_id in pointsByDay) pointsByDay[p.day_id].push(p);
    else ungroupedPoints.push(p);
  }

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
      } catch { /* fallback: keep null */ }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(pointsByDay)]);

  // Close search dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); setShowResults(false); return; }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&language=ja&limit=5`
        );
        const json = await res.json();
        setSearchResults(json.features ?? []);
        setShowResults(true);
      } catch { setSearchResults([]); } finally { setSearchLoading(false); }
    }, 400);
  }, []);

  const handleSelectResult = useCallback((f: GeocodingFeature) => {
    const [lng, lat] = f.center;
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1000 });
    setPendingPoint({ lat, lng });
    setSelectedPoint(null);
    setPanelMode("new");
    setSearchQuery(f.place_name);
    setShowResults(false);
    setSearchResults([]);
  }, []);

  // 既存ポイントの平均座標（centroid）を求めるヘルパー
  const getDayCentroid = (dayId: string | null): { lat: number; lng: number } | null => {
    const pts = dayId
      ? points.filter(p => p.day_id === dayId)
      : points.filter(p => !p.day_id);
    if (pts.length === 0) return null;
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return { lat, lng };
  };

  // 「＋ スポットを追加」ボタン: pending pinを地図中央(or 日程centroid)に置いてパネルを開く
  const [pendingDefaultDayId, setPendingDefaultDayId] = useState<string | null>(null);
  const handleAddSpot = (dayId: string | null) => {
    setPendingDefaultDayId(dayId);
    const centroid = getDayCentroid(dayId);
    let lat: number, lng: number;
    if (centroid) {
      ({ lat, lng } = centroid);
    } else {
      const c = mapRef.current?.getCenter();
      lat = c?.lat ?? 35.6895;
      lng = c?.lng ?? 139.6917;
    }
    setPendingPoint({ lat, lng });
    mapRef.current?.flyTo({ center: [lng, lat], zoom: Math.max(mapRef.current?.getZoom() ?? 10, 12), duration: 600 });
    setSelectedPoint(null);
    setPanelMode("new");
  };

  // Map click handler
  // - 描画モード時: 描画ラインに点を追加
  // - 編集モード時: 何もしない（誤操作で編集内容が消えないように）
  // - それ以外（"none" / "new"）: 新規ピンを置く / 既存のpendingPointを移動
  const handleMapClick = useCallback((e: MapMouseEvent) => {
    if (drawMode) {
      const { lng, lat } = e.lngLat;
      setDrawingCoords(prev => [...prev, [lng, lat]]);
      return;
    }
    if (panelMode === "edit") return;
    setPendingPoint({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    setSelectedPoint(null);
    setPanelMode("new");
  }, [drawMode, panelMode]);

  const handleMapDblClick = useCallback((e: MapMouseEvent) => {
    if (!drawMode || drawingCoords.length < 2) return;
    e.preventDefault();
    handleFinishDrawing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawMode, drawingCoords]);

  const handleFinishDrawing = async () => {
    if (drawingCoords.length < 2) return;
    const result = await createLine(mapId, {
      name: drawName || undefined,
      color: drawColor,
      width: 3,
      coordinates: drawingCoords,
    });
    if (!result.error && result.id) {
      const newLine: MapLine = {
        id: result.id,
        map_id: mapId,
        day_id: null,
        name: drawName || null,
        color: drawColor,
        width: 3,
        coordinates: drawingCoords,
        created_at: new Date().toISOString(),
      };
      setLines(prev => [...prev, newLine]);
    }
    setDrawingCoords([]);
    setDrawName("");
    setDrawMode(false);
  };

  const handleDeleteLine = async (lineId: string) => {
    await deleteLine(lineId, mapId);
    setLines(prev => prev.filter(l => l.id !== lineId));
  };

  const handleMarkerClick = useCallback((point: MapPoint) => {
    setSelectedPoint(point);
    setPendingPoint(null);
    setPanelMode("edit");
    setPopupPoint(null);
    mapRef.current?.flyTo({
      center: [point.lng, point.lat],
      zoom: Math.max(mapRef.current.getZoom(), 13),
      duration: 800,
    });
  }, []);

  const handleSaveNew = async (data: {
    title: string; description: string; images: PointImage[];
    day_id: string | null; start_time: string | null; end_time: string | null;
    cost: number; category: string; marker_color: string | null;
  }) => {
    if (!pendingPoint) return;
    const result = await createPoint(mapId, {
      title: data.title, description: data.description,
      lat: pendingPoint.lat, lng: pendingPoint.lng,
      day_id: data.day_id, start_time: data.start_time, end_time: data.end_time,
      cost: data.cost, category: data.category, marker_color: data.marker_color,
    });
    if (result.error) throw new Error(result.error);
    const newPoint: MapPoint = {
      id: result.id!, map_id: mapId, title: data.title,
      description: data.description || null,
      lat: pendingPoint.lat, lng: pendingPoint.lng,
      order_index: points.length, images: data.images,
      created_at: new Date().toISOString(),
      day_id: data.day_id, start_time: data.start_time, end_time: data.end_time,
      cost: data.cost, marker_color: data.marker_color, category: data.category,
    };
    setPoints(prev => [...prev, newPoint]);
    setPendingPoint(null);
    setPendingDefaultDayId(null);
    setSearchQuery("");
  };

  const handleSaveEdit = async (data: {
    title: string; description: string; images: PointImage[];
    day_id: string | null; start_time: string | null; end_time: string | null;
    cost: number; category: string; marker_color: string | null;
  }) => {
    if (!selectedPoint) return;
    const result = await updatePoint(mapId, selectedPoint.id, {
      title: data.title, description: data.description, images: data.images,
      day_id: data.day_id, start_time: data.start_time, end_time: data.end_time,
      cost: data.cost, category: data.category, marker_color: data.marker_color,
    });
    if (result.error) throw new Error(result.error);
    setPoints(prev => prev.map(p =>
      p.id === selectedPoint.id
        ? { ...p, title: data.title, description: data.description || null,
            images: data.images, day_id: data.day_id,
            start_time: data.start_time, end_time: data.end_time,
            cost: data.cost, marker_color: data.marker_color }
        : p
    ));
    setSelectedPoint(null);
  };

  const handleDelete = async () => {
    if (!selectedPoint) return;
    const result = await deletePoint(mapId, selectedPoint.id);
    if (result.error) throw new Error(result.error);
    setPoints(prev => prev.filter(p => p.id !== selectedPoint.id));
    setSelectedPoint(null);
  };

  const handleClose = () => {
    setPanelMode("none");
    setSelectedPoint(null);
    setPendingPoint(null);
    setPendingDefaultDayId(null);
  };

  const handleMovePoint = async (dayPoints: MapPoint[], idx: number, dir: "up" | "down") => {
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= dayPoints.length) return;
    // Build globally reordered ID list: swap only the two within the day group
    const allSorted = [...points].sort((a, b) => a.order_index - b.order_index);
    const ids = allSorted.map(p => p.id);
    const posA = ids.indexOf(dayPoints[idx].id);
    const posB = ids.indexOf(dayPoints[newIdx].id);
    if (posA === -1 || posB === -1) return;
    [ids[posA], ids[posB]] = [ids[posB], ids[posA]];
    await handleReorder(ids);
  };

  const handleReorder = async (orderedIds: string[]) => {
    const reordered = orderedIds.map((id, i) => {
      const p = points.find(pt => pt.id === id)!;
      return { ...p, order_index: i };
    });
    setPoints(reordered);
    await reorderPoints(mapId, orderedIds);
  };

  const handleAddDay = async () => {
    const result = await addDay(mapId);
    if (result.error || !result.id) return;
    const newDay: MapDay = {
      id: result.id, map_id: mapId, day_number: result.day_number!,
      date: null, title: null, created_at: new Date().toISOString(),
    };
    setDays(prev => [...prev, newDay]);
  };

  const handleDeleteDay = async (dayId: string) => {
    await deleteDay(dayId, mapId);
    setDays(prev => prev.filter(d => d.id !== dayId));
    setPoints(prev => prev.map(p => p.day_id === dayId ? { ...p, day_id: null } : p));
  };

  const handleUpdateDayTitle = async (dayId: string, title: string) => {
    await updateDay(dayId, { title });
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, title } : d));
  };

  const handleUpdateDayDate = async (dayId: string, date: string) => {
    await updateDay(dayId, { date });
    setDays(prev => prev.map(d => d.id === dayId ? { ...d, date: date || null } : d));
  };

  const toggleCollapse = (dayId: string) => {
    setCollapsedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId); else next.add(dayId);
      return next;
    });
  };

  const mapCursor = panelMode === "edit" ? "default" : "crosshair";

  return (
    <div className="flex h-[calc(100vh-57px)]">
      {/* ─── 左サイドバー ─── */}
      <div className="hidden w-72 flex-shrink-0 flex-col border-r border-gray-100 bg-white sm:flex overflow-hidden">
        {/* 場所検索 */}
        <div className="border-b border-gray-100 p-3" ref={searchRef}>
          <div className="relative flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <svg className="h-4 w-4 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="場所を検索..."
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
            />
            {searchLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />}
            {searchQuery && !searchLoading && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); setShowResults(false); }} className="text-gray-400 hover:text-gray-600">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          {showResults && searchResults.length > 0 && (
            <ul className="absolute left-3 right-3 z-50 mt-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
              {searchResults.map(f => (
                <li key={f.id}>
                  <button className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors"
                    onClick={() => handleSelectResult(f)}>
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="line-clamp-2 text-gray-700">{f.place_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 地図スタイル */}
        <div className="flex items-center gap-1.5 border-b border-gray-100 px-3 py-2">
          {MAP_STYLES.map(s => (
            <button key={s.id} onClick={() => setMapStyle(s.id)} title={s.label}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                mapStyle === s.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              <span>{s.icon}</span><span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* 日程追加 + 描画ツール */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
          <button onClick={handleAddDay}
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition">
            ＋ 日程を追加
          </button>
          <button
            onClick={() => { setDrawMode(m => !m); setDrawingCoords([]); }}
            className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              drawMode ? "bg-orange-500 text-white border-orange-500" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            title="ライン描画モード"
          >
            ✏️ ライン
          </button>
        </div>

        {/* Draw mode controls */}
        {drawMode && (
          <div className="border-b border-orange-100 bg-orange-50 px-3 py-2 flex flex-col gap-2">
            <p className="text-xs font-medium text-orange-700">地図をクリックしてラインを描画。ダブルクリックで完了。</p>
            <input type="text" value={drawName} onChange={e => setDrawName(e.target.value)}
              placeholder="ライン名（任意）"
              className="rounded-lg border border-orange-200 px-2 py-1 text-xs outline-none focus:border-orange-400" />
            <div className="flex items-center gap-1">
              {LINE_DRAW_COLORS.map(c => (
                <button key={c} onClick={() => setDrawColor(c)}
                  className={`h-5 w-5 rounded-full border-2 transition ${drawColor === c ? "border-gray-700 scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleFinishDrawing} disabled={drawingCoords.length < 2}
                className="flex-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-40">
                完了 ({drawingCoords.length}点)
              </button>
              <button onClick={() => { setDrawMode(false); setDrawingCoords([]); }}
                className="flex-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          </div>
        )}

        {/* ポイント一覧 (スクロール) */}
        <div className="flex-1 overflow-y-auto">
          {/* 日程ごと */}
          {sortedDays.map(day => {
            const dayPoints = pointsByDay[day.id] ?? [];
            const color = getDayColor(day.day_number);
            const isCollapsed = collapsedDays.has(day.id);
            return (
              <div key={day.id}>
                <DayHeader
                  day={day} isCollapsed={isCollapsed}
                  routeData={routeDataByDay[day.id]}
                  onToggleCollapse={() => toggleCollapse(day.id)}
                  onDelete={() => handleDeleteDay(day.id)}
                  onUpdateTitle={t => handleUpdateDayTitle(day.id, t)}
                  onUpdateDate={d => handleUpdateDayDate(day.id, d)}
                />
                {!isCollapsed && (
                  <>
                    {dayPoints.map((point, idx) => (
                      <div key={point.id}
                        className={`flex items-center border-b border-gray-50 hover:bg-blue-50 transition ${
                          selectedPoint?.id === point.id ? "bg-blue-50" : ""
                        }`}>
                        <button className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left min-w-0"
                          onClick={() => handleMarkerClick(point)}>
                          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: point.marker_color ?? color }}>
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{point.title}</p>
                            {point.start_time && <p className="text-xs text-gray-400">{point.start_time.slice(0, 5)}</p>}
                          </div>
                          <span className="flex-shrink-0 text-sm">{getCategoryIcon(point.category ?? "spot")}</span>
                        </button>
                        {/* 並び替えボタン */}
                        <div className="flex flex-col pr-2 flex-shrink-0">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMovePoint(dayPoints, idx, "up")}
                            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none py-0.5">▲</button>
                          <button
                            disabled={idx === dayPoints.length - 1}
                            onClick={() => handleMovePoint(dayPoints, idx, "down")}
                            className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none py-0.5">▼</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => handleAddSpot(day.id)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition">
                      <span>＋</span><span>この日にスポットを追加</span>
                    </button>
                  </>
                )}
              </div>
            );
          })}

          {/* 日程なし */}
          {ungroupedPoints.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <div className="h-3 w-3 flex-shrink-0 rounded-full bg-gray-400" />
                <span className="text-xs font-bold text-gray-500">日程なし</span>
              </div>
              {ungroupedPoints.map((point, idx) => (
                <button key={point.id} onClick={() => handleMarkerClick(point)}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition border-b border-gray-50 ${
                    selectedPoint?.id === point.id ? "bg-blue-50" : ""
                  }`}>
                  <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: point.marker_color ?? "#9CA3AF" }}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{point.title}</p>
                    {point.start_time && <p className="text-xs text-gray-400">{point.start_time.slice(0, 5)}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 描画ライン一覧 */}
          {lines.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500">✏️ 描画ライン</span>
              </div>
              {lines.map(line => (
                <div key={line.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-50">
                  <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: line.color }} />
                  <span className="flex-1 text-xs text-gray-700 truncate">{line.name || "ライン"}</span>
                  <button onClick={() => handleDeleteLine(line.id)}
                    className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0">🗑</button>
                </div>
              ))}
            </div>
          )}

          {points.length === 0 && days.length === 0 && !drawMode && (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <span className="mb-3 text-4xl">🗺️</span>
              <p className="text-sm font-medium text-gray-600">最初のポイントを追加しましょう</p>
              <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                右の地図を<strong className="text-blue-600">クリック</strong>するか、<br />
                上の<strong className="text-blue-600">検索バー</strong>から場所を選んでください
              </p>
              <button
                onClick={() => handleAddSpot(null)}
                className="mt-4 inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                ＋ ポイントを追加
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── 地図エリア ─── */}
      <div className="relative flex-1">
        <Map
          ref={mapRef}
          mapboxAccessToken={MAPBOX_TOKEN}
          initialViewState={{ longitude: 139.6917, latitude: 35.6895, zoom: 10 }}
          style={{ width: "100%", height: "100%" }}
          mapStyle={`mapbox://styles/mapbox/${mapStyle}`}
          onClick={handleMapClick}
          onDblClick={handleMapDblClick}
          cursor={mapCursor}
        >
          <NavigationControl position="top-right" />

          {/* Directions API ルート (実際の道路) */}
          {sortedDays.map(day => {
            const route = routeDataByDay[day.id];
            const color = getDayColor(day.day_number);
            if (!route) {
              // フォールバック: 直線
              const dayPts = pointsByDay[day.id] ?? [];
              if (dayPts.length < 2) return null;
              return (
                <Source key={`route-${day.id}`} id={`route-${day.id}`} type="geojson" data={{
                  type: "Feature", properties: {},
                  geometry: { type: "LineString", coordinates: dayPts.map(p => [p.lng, p.lat]) },
                }}>
                  <Layer id={`route-line-${day.id}`} type="line" paint={{
                    "line-color": color, "line-width": 2, "line-dasharray": [2, 1],
                  }} />
                </Source>
              );
            }
            return (
              <Source key={`route-${day.id}`} id={`route-${day.id}`} type="geojson" data={{
                type: "Feature", properties: {}, geometry: route.geometry,
              }}>
                <Layer id={`route-line-${day.id}`} type="line" paint={{
                  "line-color": color, "line-width": 3, "line-opacity": 0.8,
                }} />
              </Source>
            );
          })}

          {/* 描画済みライン */}
          {lines.map(line => (
            <Source key={line.id} id={`line-${line.id}`} type="geojson" data={{
              type: "Feature", properties: {},
              geometry: { type: "LineString", coordinates: line.coordinates },
            }}>
              <Layer id={`line-l-${line.id}`} type="line" paint={{
                "line-color": line.color, "line-width": line.width,
              }} />
            </Source>
          ))}

          {/* 現在描画中のライン */}
          {drawingCoords.length >= 2 && (
            <Source id="drawing-preview" type="geojson" data={{
              type: "Feature", properties: {},
              geometry: { type: "LineString", coordinates: drawingCoords },
            }}>
              <Layer id="drawing-preview-line" type="line" paint={{
                "line-color": drawColor, "line-width": 3, "line-dasharray": [2, 1],
              }} />
            </Source>
          )}
          {drawingCoords.map((coord, i) => (
            <Marker key={`draw-${i}`} longitude={coord[0]} latitude={coord[1]}>
              <div className="h-2.5 w-2.5 rounded-full border border-white shadow" style={{ backgroundColor: drawColor }} />
            </Marker>
          ))}

          {/* 日程別マーカー */}
          {sortedDays.map(day => {
            const dayPts = pointsByDay[day.id] ?? [];
            const color = getDayColor(day.day_number);
            return dayPts.map((point, idx) => (
              <Marker key={point.id} longitude={point.lng} latitude={point.lat}
                onClick={e => { e.originalEvent.stopPropagation(); handleMarkerClick(point); }}>
                <div
                  className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md transition-transform hover:scale-110 ${
                    selectedPoint?.id === point.id ? "scale-125 ring-2 ring-white ring-offset-1" : ""
                  }`}
                  style={{ backgroundColor: point.marker_color ?? color }}
                  onMouseEnter={() => !drawMode && setPopupPoint(point)}
                  onMouseLeave={() => setPopupPoint(null)}
                >
                  {idx + 1}
                </div>
              </Marker>
            ));
          })}

          {/* 日程なしマーカー */}
          {ungroupedPoints.map((point, idx) => (
            <Marker key={point.id} longitude={point.lng} latitude={point.lat}
              onClick={e => { e.originalEvent.stopPropagation(); handleMarkerClick(point); }}>
              <div
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md transition-transform hover:scale-110 ${
                  selectedPoint?.id === point.id ? "scale-125 ring-2 ring-white ring-offset-1" : ""
                }`}
                style={{ backgroundColor: point.marker_color ?? "#9CA3AF" }}
                onMouseEnter={() => !drawMode && setPopupPoint(point)}
                onMouseLeave={() => setPopupPoint(null)}
              >
                {idx + 1}
              </div>
            </Marker>
          ))}

          {/* 追加中ピン */}
          {pendingPoint && (
            <Marker longitude={pendingPoint.lng} latitude={pendingPoint.lat}>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-green-500 text-xs font-bold text-white shadow-md animate-bounce">
                ＋
              </div>
            </Marker>
          )}

          {/* ホバーポップアップ */}
          {popupPoint && (
            <Popup
              longitude={popupPoint.lng} latitude={popupPoint.lat}
              closeButton={false} closeOnClick={false} anchor="bottom"
              offset={16}
            >
              <div className="px-2 py-1.5 min-w-[120px]">
                <p className="font-semibold text-gray-900 text-sm leading-tight">{popupPoint.title}</p>
                {popupPoint.start_time && (
                  <p className="text-xs text-gray-500 mt-0.5">🕐 {popupPoint.start_time.slice(0, 5)}{popupPoint.end_time ? `〜${popupPoint.end_time.slice(0, 5)}` : ""}</p>
                )}
                {popupPoint.cost > 0 && (
                  <p className="text-xs text-gray-500">💴 ¥{popupPoint.cost.toLocaleString()}</p>
                )}
                {popupPoint.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{popupPoint.description}</p>
                )}
              </div>
            </Popup>
          )}
        </Map>

        {/* ポイント追加/編集パネル */}
        {panelMode !== "none" && (
          <div className="absolute bottom-0 right-0 top-0 w-full sm:w-80 shadow-xl">
            <PointPanel
              point={panelMode === "edit" ? selectedPoint : null}
              isNew={panelMode === "new"}
              days={days}
              defaultDayId={pendingDefaultDayId}
              onSave={panelMode === "new" ? handleSaveNew : handleSaveEdit}
              onDelete={panelMode === "edit" ? handleDelete : undefined}
              onClose={handleClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}
