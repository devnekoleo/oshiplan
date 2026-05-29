"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  useJsApiLoader, GoogleMap, OverlayView, Polyline, InfoWindow,
} from "@react-google-maps/api";
import type { Libraries } from "@react-google-maps/api";

import { DraftBanner } from "./DraftBanner";
import { ModeToggle } from "./ModeToggle";
import { PointPanel } from "./PointPanel";
import {
  createPoint, updatePoint, deletePoint, reorderPoints,
  addDay, updateDay, deleteDay,
  createLine, deleteLine,
} from "@/app/maps/[id]/actions";
import type { MapPoint, PointImage, MapDay, MapLine } from "@/types";
import { getDayColor, getCategoryIcon } from "@/types";
import { useModeStore } from "@/lib/stores/modeStore";
import { useDraftStore, type PlaceDetails } from "@/lib/stores/draftStore";
import { useSelectionStore } from "@/lib/stores/selectionStore";

const LIBRARIES: Libraries = ["places", "geometry"];
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;

const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: 35.6895, lng: 139.6917 };

interface MapEditorProps {
  mapId: string;
  initialPoints: MapPoint[];
  initialDays: MapDay[];
  initialLines?: MapLine[];
}

interface RouteData { distanceMeters: number; durationSeconds: number; encodedPolyline: string; }

function fmtDist(m: number) { return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`; }
function fmtTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h > 0 ? `${h}時間${m}分` : `${m}分`;
}

// ─── Places 検索 ───────────────────────────────────────────
interface SuggestionResult { placeId: string; primaryText: string; secondaryText: string; }

function PlacesSearch({ map, onSelect }: {
  map: google.maps.Map | null;
  onSelect: (r: SuggestionResult, lat: number, lng: number, placeDetails: PlaceDetails | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleInput = (q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: q }),
        });
        const json = await res.json();
        setResults(json.suggestions ?? []);
        setOpen(true);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
  };

  const handleSelect = (r: SuggestionResult) => {
    setOpen(false);
    setQuery(r.primaryText || r.secondaryText);
    if (!map || !r.placeId) { onSelect(r, DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, null); return; }
    const service = new google.maps.places.PlacesService(map);
    service.getDetails({ placeId: r.placeId, fields: ["geometry"] }, async (place, status) => {
      let lat = DEFAULT_CENTER.lat, lng = DEFAULT_CENTER.lng;
      if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
        lat = place.geometry.location.lat();
        lng = place.geometry.location.lng();
      }
      let placeDetails: PlaceDetails | null = null;
      try {
        const res = await fetch("/api/places/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId: r.placeId }),
        });
        if (res.ok) placeDetails = await res.json();
      } catch { /* ignore */ }
      onSelect(r, lat, lng, placeDetails);
    });
  };

  return (
    <div ref={containerRef} className="relative border-b border-gray-100 p-3">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <svg className="h-4 w-4 flex-shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input type="text" value={query} onChange={e => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="場所を検索..."
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none" />
        {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />}
        {query && !loading && (
          <button onClick={() => { setQuery(""); setResults([]); setOpen(false); }} className="text-gray-400 hover:text-gray-600">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute left-3 right-3 z-50 mt-1 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {results.map(r => (
            <li key={r.placeId}>
              <button className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors"
                onClick={() => handleSelect(r)}>
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>
                  <span className="block text-gray-900 truncate">{r.primaryText}</span>
                  {r.secondaryText && <span className="block text-xs text-gray-400 truncate">{r.secondaryText}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Day ヘッダー ──────────────────────────────────────────
function DayHeader({ day, isCollapsed, routeData, isFocused, onToggleCollapse, onFocusDay, onDelete, onUpdateTitle, onUpdateDate }: {
  day: MapDay; isCollapsed: boolean; routeData?: RouteData | null; isFocused?: boolean;
  onToggleCollapse: () => void; onFocusDay?: () => void; onDelete: () => void;
  onUpdateTitle: (t: string) => void; onUpdateDate: (d: string) => void;
}) {
  const color = day.color ?? getDayColor(day.day_number);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(day.title ?? "");
  const commit = () => { setEditing(false); if (val !== (day.title ?? "")) onUpdateTitle(val); };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border-b border-gray-100 select-none ${isFocused ? "bg-blue-50" : "bg-gray-50"}`}>
      <button onClick={onFocusDay} title={isFocused ? "フィルター解除" : "この日だけ表示"}
        className={`h-3 w-3 flex-shrink-0 rounded-full transition-transform hover:scale-125 ${isFocused ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
        style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap min-w-0">
          <span className="text-xs font-bold text-gray-700 flex-shrink-0">Day {day.day_number}</span>
          {editing ? (
            <input autoFocus value={val} onChange={e => setVal(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(day.title ?? ""); setEditing(false); } }}
              className="text-xs text-gray-600 border-b border-blue-400 outline-none bg-transparent flex-1 min-w-0" />
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-600 truncate">
              {day.title || "タイトルを追加..."}
            </button>
          )}
          {day.date && <span className="text-xs text-gray-400 flex-shrink-0">({day.date})</span>}
        </div>
        {routeData && (
          <p className="text-xs text-gray-400 mt-0.5">🚗 {fmtDist(routeData.distanceMeters)} · {fmtTime(routeData.durationSeconds)}</p>
        )}
      </div>
      <input type="date" value={day.date ?? ""} onChange={e => onUpdateDate(e.target.value)}
        className="text-xs text-gray-500 border border-gray-200 rounded px-1 py-0.5 w-24 flex-shrink-0" />
      <button onClick={onToggleCollapse} className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0">
        {isCollapsed ? "▶" : "▼"}
      </button>
      <button onClick={() => { if (confirm(`Day ${day.day_number} を削除しますか？`)) onDelete(); }}
        className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0">🗑</button>
    </div>
  );
}

// ─── MapEditorContent ──────────────────────────────────────
function MapEditorContent({ mapId, initialPoints, initialDays, initialLines }: MapEditorProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [points, setPoints] = useState<MapPoint[]>(initialPoints);
  const [days, setDays]     = useState<MapDay[]>(initialDays);
  const [lines, setLines]   = useState<MapLine[]>(initialLines ?? []);
  const [routeDataByDay, setRouteDataByDay] = useState<Record<string, RouteData | null>>({});
  const [routePathsByDay, setRoutePathsByDay] = useState<Record<string, google.maps.LatLng[]>>({});
  const [collapsedDays, setCollapsedDays]   = useState<Set<string>>(new Set());
  const [hoveredPoint, setHoveredPoint]     = useState<MapPoint | null>(null);
  const [navIndex, setNavIndex]             = useState(0);
  const [drawColor, setDrawColor]           = useState("#3B82F6");
  const [drawName, setDrawName]             = useState("");
  const drawCoordsRef = useRef<[number, number][]>([]);
  const drawPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const [saveTrigger, setSaveTrigger] = useState(0);
  const [mapType, setMapType]         = useState("roadmap");

  const { mode, setMode } = useModeStore();
  const { draft, setDraft, clearDraft } = useDraftStore();
  const { editingPointId, setEditingPoint, selectedPointId, setSelectedPoint, focusedDayId, setFocusedDay } = useSelectionStore();

  const sortedDays = useMemo(() => [...days].sort((a, b) => a.day_number - b.day_number), [days]);

  const { pointsByDay, ungroupedPoints, allSortedPoints } = useMemo(() => {
    const byDay: Record<string, MapPoint[]> = {};
    for (const d of sortedDays) byDay[d.id] = [];
    const ungrouped: MapPoint[] = [];
    const sorted = [...points].sort((a, b) => a.order_index - b.order_index);
    for (const p of sorted) {
      if (p.day_id && p.day_id in byDay) byDay[p.day_id].push(p);
      else ungrouped.push(p);
    }
    return { pointsByDay: byDay, ungroupedPoints: ungrouped, allSortedPoints: sorted };
  }, [points, sortedDays]);

  const editingPoint = useMemo(() => points.find(p => p.id === editingPointId) ?? null, [points, editingPointId]);
  const panelOpen = editingPointId !== null || draft !== null;

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
        const data: RouteData = await res.json();
        setRouteDataByDay(prev => ({ ...prev, [day.id]: data }));
        if (data.encodedPolyline) {
          const path = google.maps.geometry.encoding.decodePath(data.encodedPolyline);
          setRoutePathsByDay(prev => ({ ...prev, [day.id]: path }));
        }
      } catch {
        setRouteDataByDay(prev => ({ ...prev, [day.id]: null }));
        const fallback = pts.map(p => new google.maps.LatLng(p.lat, p.lng));
        setRoutePathsByDay(prev => ({ ...prev, [day.id]: fallback }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(sortedDays.map(d => d.id)), JSON.stringify(pointsByDay)]);

  // 未保存ポイントがある場合にページ離脱を警告
  useEffect(() => {
    if (!draft) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [draft]);

  // 描画モードのクリックリスナー
  useEffect(() => {
    if (!map || mode !== "draw") return;
    drawCoordsRef.current = [];
    drawPolylinesRef.current.forEach(p => p.setMap(null));
    drawPolylinesRef.current = [];

    let previewPoly: google.maps.Polyline | null = null;

    const clickListener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      drawCoordsRef.current = [...drawCoordsRef.current, [e.latLng.lng(), e.latLng.lat()]];
      if (previewPoly) previewPoly.setMap(null);
      previewPoly = new google.maps.Polyline({
        path: drawCoordsRef.current.map(([lng, lat]) => ({ lat, lng })),
        strokeColor: drawColor, strokeWeight: 3, strokeOpacity: 0.7, map,
      });
      drawPolylinesRef.current = previewPoly ? [previewPoly] : [];
    });

    const dblClickListener = map.addListener("dblclick", async () => {
      if (drawCoordsRef.current.length < 2) return;
      const coords = drawCoordsRef.current;
      previewPoly?.setMap(null);
      drawPolylinesRef.current.forEach(p => p.setMap(null));
      setMode("view");
      const result = await createLine(mapId, { name: drawName || undefined, color: drawColor, width: 3, coordinates: coords });
      if (!result.error && result.id) {
        setLines(prev => [...prev, { id: result.id!, map_id: mapId, day_id: null, name: drawName || null, color: drawColor, width: 3, coordinates: coords, created_at: new Date().toISOString() }]);
      }
      setDrawName("");
    });

    return () => {
      google.maps.event.removeListener(clickListener);
      google.maps.event.removeListener(dblClickListener);
      previewPoly?.setMap(null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, mode, drawColor]);

  // Map click ─ ノンモーダル原則: 追加モードなら常に下書きピン配置
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (mode === "draw") return;
    if (mode === "add" && e.latLng) {
      setDraft({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
    setHoveredPoint(null);
  }, [mode, setDraft]);

  const handleMarkerClick = useCallback((point: MapPoint) => {
    setSelectedPoint(point.id);
    setEditingPoint(point.id);
    setHoveredPoint(null);
    map?.panTo({ lat: point.lat, lng: point.lng });
  }, [map, setSelectedPoint, setEditingPoint]);

  const handleSaveNew = useCallback(async (data: {
    title: string; description: string; images: PointImage[];
    day_id: string | null; start_time: string | null; end_time: string | null;
    cost: number; category: string; marker_color: string | null;
  }) => {
    if (!draft) return;
    const result = await createPoint(mapId, {
      title: data.title, description: data.description,
      lat: draft.lat, lng: draft.lng, images: data.images,
      day_id: data.day_id, start_time: data.start_time, end_time: data.end_time,
      cost: data.cost, category: data.category, marker_color: data.marker_color,
    });
    if (result.error) throw new Error(result.error);
    setPoints(prev => [...prev, {
      id: result.id!, map_id: mapId,
      title: data.title, description: data.description || null,
      lat: draft.lat, lng: draft.lng,
      order_index: result.order_index ?? prev.length,
      images: data.images, created_at: new Date().toISOString(),
      day_id: data.day_id, start_time: data.start_time, end_time: data.end_time,
      cost: data.cost, marker_color: data.marker_color, category: data.category,
    }]);
    clearDraft();
  }, [draft, mapId, clearDraft]);

  const handleSaveEdit = useCallback(async (data: {
    title: string; description: string; images: PointImage[];
    day_id: string | null; start_time: string | null; end_time: string | null;
    cost: number; category: string; marker_color: string | null;
  }) => {
    if (!editingPointId) return;
    const result = await updatePoint(mapId, editingPointId, { title: data.title, description: data.description, images: data.images, day_id: data.day_id, start_time: data.start_time, end_time: data.end_time, cost: data.cost, category: data.category, marker_color: data.marker_color });
    if (result.error) throw new Error(result.error);
    setPoints(prev => prev.map(p => p.id === editingPointId ? { ...p, ...data, description: data.description || null } : p));
  }, [editingPointId, mapId]);

  const handleDelete = useCallback(async () => {
    if (!editingPointId) return;
    await deletePoint(mapId, editingPointId);
    setPoints(prev => prev.filter(p => p.id !== editingPointId));
    setEditingPoint(null);
    setSelectedPoint(null);
  }, [editingPointId, mapId, setEditingPoint, setSelectedPoint]);

  const handlePanelClose = useCallback(() => {
    setEditingPoint(null);
    setSelectedPoint(null);
    // draft は保持（ノンモーダル原則）
  }, [setEditingPoint, setSelectedPoint]);

  const handleAddSpot = (dayId: string | null) => {
    const pts = dayId ? points.filter(p => p.day_id === dayId) : points;
    let lat = DEFAULT_CENTER.lat, lng = DEFAULT_CENTER.lng;
    if (pts.length > 0) {
      lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
      lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    } else {
      const c = map?.getCenter();
      if (c) { lat = c.lat(); lng = c.lng(); }
    }
    setDraft({ lat, lng, defaultDayId: dayId });
    setMode("add");
    map?.panTo({ lat, lng });
  };

  const handleMovePoint = async (dayPoints: MapPoint[], idx: number, dir: "up" | "down") => {
    const newIdx = dir === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= dayPoints.length) return;
    const allSorted = [...points].sort((a, b) => a.order_index - b.order_index);
    const ids = allSorted.map(p => p.id);
    const posA = ids.indexOf(dayPoints[idx].id);
    const posB = ids.indexOf(dayPoints[newIdx].id);
    if (posA === -1 || posB === -1) return;
    [ids[posA], ids[posB]] = [ids[posB], ids[posA]];
    setPoints(ids.map((id, i) => ({ ...points.find(p => p.id === id)!, order_index: i })));
    await reorderPoints(mapId, ids);
  };

  const handleAddDay = async () => {
    const result = await addDay(mapId);
    if (result.error || !result.id) return;
    setDays(prev => [...prev, { id: result.id!, map_id: mapId, day_number: result.day_number!, date: null, title: null, color: null, created_at: new Date().toISOString() }]);
  };

  const handleNav = (dir: "prev" | "next") => {
    if (allSortedPoints.length === 0) return;
    const next = dir === "next" ? (navIndex + 1) % allSortedPoints.length : (navIndex - 1 + allSortedPoints.length) % allSortedPoints.length;
    setNavIndex(next);
    const pt = allSortedPoints[next];
    map?.panTo({ lat: pt.lat, lng: pt.lng });
    setSelectedPoint(pt.id);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        setSaveTrigger(t => t + 1);
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") handleNav("prev");
      if (e.key === "ArrowRight") handleNav("next");
      if (e.key === "Escape") { if (mode === "draw") setMode("view"); handlePanelClose(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, navIndex, allSortedPoints]);

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col">
      <DraftBanner onSave={() => setSaveTrigger(t => t + 1)} />

      <div className="flex flex-1 overflow-hidden">
        {/* ─── 左サイドバー ─── */}
        <div className="hidden w-72 flex-shrink-0 flex-col border-r border-gray-100 bg-white sm:flex overflow-hidden">
          <PlacesSearch map={map} onSelect={(r, lat, lng, placeDetails) => {
            setDraft({ lat, lng, title: r.primaryText, placeId: r.placeId, placeDetails });
            setMode("add");
            map?.panTo({ lat, lng });
            map?.setZoom(15);
          }} />

          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <button onClick={handleAddDay}
              className="flex flex-1 items-center justify-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition">
              ＋ 日程を追加
            </button>
          </div>

          {mode === "draw" && (
            <div className="border-b border-orange-100 bg-orange-50 px-3 py-2 flex flex-col gap-2">
              <p className="text-xs font-medium text-orange-700">地図をクリックしてライン描画。ダブルクリックで完了。</p>
              <input type="text" value={drawName} onChange={e => setDrawName(e.target.value)}
                placeholder="ライン名（任意）"
                className="rounded-lg border border-orange-200 px-2 py-1 text-xs outline-none focus:border-orange-400" />
              <div className="flex gap-1 flex-wrap">
                {["#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6","#EC4899"].map(c => (
                  <button key={c} onClick={() => setDrawColor(c)}
                    className={`h-5 w-5 rounded-full border-2 transition ${drawColor === c ? "border-gray-700 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
              <button onClick={() => setMode("view")}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50">
                キャンセル
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {sortedDays.map(day => {
              const dayPoints = pointsByDay[day.id] ?? [];
              const color = day.color ?? getDayColor(day.day_number);
              const isCollapsed = collapsedDays.has(day.id);
              return (
                <div key={day.id}>
                  <DayHeader day={day} isCollapsed={isCollapsed} routeData={routeDataByDay[day.id]}
                    isFocused={focusedDayId === day.id}
                    onToggleCollapse={() => setCollapsedDays(prev => { const n = new Set(prev); n.has(day.id) ? n.delete(day.id) : n.add(day.id); return n; })}
                    onFocusDay={() => setFocusedDay(focusedDayId === day.id ? null : day.id)}
                    onDelete={() => { deleteDay(day.id, mapId); setDays(prev => prev.filter(d => d.id !== day.id)); setPoints(prev => prev.map(p => p.day_id === day.id ? { ...p, day_id: null } : p)); }}
                    onUpdateTitle={t => { updateDay(day.id, { title: t }); setDays(prev => prev.map(d => d.id === day.id ? { ...d, title: t } : d)); }}
                    onUpdateDate={d => { updateDay(day.id, { date: d }); setDays(prev => prev.map(dy => dy.id === day.id ? { ...dy, date: d || null } : dy)); }}
                  />
                  {!isCollapsed && (
                    <>
                      {dayPoints.map((point, idx) => (
                        <div key={point.id}
                          className={`flex items-center border-b border-gray-50 hover:bg-blue-50 transition ${selectedPointId === point.id ? "bg-blue-50" : ""}`}>
                          <button className="flex flex-1 items-center gap-2 px-3 py-2.5 text-left min-w-0" onClick={() => handleMarkerClick(point)}>
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
                          <div className="flex flex-col pr-2 flex-shrink-0">
                            <button disabled={idx === 0} onClick={() => handleMovePoint(dayPoints, idx, "up")}
                              className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none py-0.5">▲</button>
                            <button disabled={idx === dayPoints.length - 1} onClick={() => handleMovePoint(dayPoints, idx, "down")}
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

            {ungroupedPoints.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="h-3 w-3 flex-shrink-0 rounded-full bg-gray-400" />
                  <span className="text-xs font-bold text-gray-500">日程なし</span>
                </div>
                {ungroupedPoints.map((point, idx) => (
                  <button key={point.id} onClick={() => handleMarkerClick(point)}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 transition border-b border-gray-50 ${selectedPointId === point.id ? "bg-blue-50" : ""}`}>
                    <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-400 text-xs font-bold text-white">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{point.title}</p>
                      {point.start_time && <p className="text-xs text-gray-400">{point.start_time.slice(0, 5)}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {lines.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-500">✏️ 描画ライン</span>
                </div>
                {lines.map(line => (
                  <div key={line.id} className="flex items-center gap-2 px-3 py-2 border-b border-gray-50">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: line.color }} />
                    <span className="flex-1 text-xs text-gray-700 truncate">{line.name || "ライン"}</span>
                    <button onClick={async () => { await deleteLine(line.id, mapId); setLines(prev => prev.filter(l => l.id !== line.id)); }}
                      className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0">🗑</button>
                  </div>
                ))}
              </div>
            )}

            {points.length === 0 && days.length === 0 && mode !== "draw" && (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <span className="mb-3 text-4xl">🗺️</span>
                <p className="text-sm font-medium text-gray-600">最初のポイントを追加しましょう</p>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  上の<strong className="text-blue-600">検索バー</strong>から場所を選ぶか、<br />
                  「追加」モードで<strong className="text-blue-600">地図をクリック</strong>してください
                </p>
                <button onClick={() => handleAddSpot(null)}
                  className="mt-4 inline-flex items-center gap-1 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                  ＋ ポイントを追加
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── 地図エリア ─── */}
        <div className="relative flex-1">
          <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={DEFAULT_CENTER}
            zoom={10}
            onLoad={setMap}
            onUnmount={() => setMap(null)}
            onClick={handleMapClick}
            options={{ draggableCursor: mode === "add" || mode === "draw" ? "crosshair" : "default", mapTypeId: mapType }}
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
              const color = day.color ?? getDayColor(day.day_number);
              return dayPts.map((point, idx) => (
                <OverlayView key={point.id} position={{ lat: point.lat, lng: point.lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                  <div
                    onClick={() => handleMarkerClick(point)}
                    onMouseEnter={() => setHoveredPoint(point)}
                    onMouseLeave={() => setHoveredPoint(null)}
                    style={{
                      backgroundColor: point.marker_color ?? color,
                      transform: `translate(-50%, -50%) scale(${selectedPointId === point.id ? 1.3 : 1})`,
                      outline: selectedPointId === point.id ? "2px solid #1e40af" : "2px solid white",
                      opacity: focusedDayId && focusedDayId !== day.id ? 0.2 : 1,
                    }}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-bold text-white shadow-md transition-all hover:scale-110"
                  >
                    {idx + 1}
                  </div>
                </OverlayView>
              ));
            })}

            {/* 日程なしマーカー */}
            {ungroupedPoints.map((point, idx) => (
              <OverlayView key={point.id} position={{ lat: point.lat, lng: point.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div
                  onClick={() => handleMarkerClick(point)}
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{
                    backgroundColor: point.marker_color ?? "#9CA3AF",
                    transform: `translate(-50%, -50%) scale(${selectedPointId === point.id ? 1.3 : 1})`,
                    outline: selectedPointId === point.id ? "2px solid #374151" : "2px solid white",
                    opacity: focusedDayId ? 0.2 : 1,
                  }}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-bold text-white shadow-md transition-all hover:scale-110"
                >
                  {idx + 1}
                </div>
              </OverlayView>
            ))}

            {/* 下書きピン（緑・バウンス） */}
            {draft && (
              <OverlayView position={{ lat: draft.lat, lng: draft.lng }}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                <div style={{ transform: "translate(-50%, -50%)" }}
                  className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-green-500 text-sm font-bold text-white shadow-lg animate-bounce">
                  ＋
                </div>
              </OverlayView>
            )}

            {/* ホバー InfoWindow */}
            {hoveredPoint && (
              <InfoWindow position={{ lat: hoveredPoint.lat, lng: hoveredPoint.lng }}
                options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -20) }}
                onCloseClick={() => setHoveredPoint(null)}>
                <div className="px-1 py-0.5 min-w-[100px]">
                  <p className="font-semibold text-gray-900 text-sm">{hoveredPoint.title}</p>
                  {hoveredPoint.start_time && (
                    <p className="text-xs text-gray-500 mt-0.5">🕐 {hoveredPoint.start_time.slice(0, 5)}{hoveredPoint.end_time ? `〜${hoveredPoint.end_time.slice(0, 5)}` : ""}</p>
                  )}
                  {hoveredPoint.cost > 0 && <p className="text-xs text-gray-500">💴 ¥{hoveredPoint.cost.toLocaleString()}</p>}
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {/* ModeToggle */}
          <div className="absolute left-1/2 top-3 -translate-x-1/2 z-10">
            <ModeToggle />
          </div>

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

          {/* ← → ナビ */}
          {allSortedPoints.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full bg-white/90 shadow-lg px-4 py-2">
              <button onClick={() => handleNav("prev")} className="text-gray-600 hover:text-blue-600 text-lg px-2">←</button>
              <span className="text-xs text-gray-500 select-none">{navIndex + 1} / {allSortedPoints.length}</span>
              <button onClick={() => handleNav("next")} className="text-gray-600 hover:text-blue-600 text-lg px-2">→</button>
            </div>
          )}

          {/* PointPanel スライドオーバー */}
          {panelOpen && (
            <div className="absolute bottom-0 right-0 top-0 w-full sm:w-96 shadow-2xl z-20 overflow-hidden">
              <PointPanel
                point={draft !== null && editingPointId === null ? null : editingPoint}
                isNew={draft !== null && editingPointId === null}
                days={days}
                defaultDayId={draft?.defaultDayId ?? null}
                placeDetails={draft !== null && editingPointId === null ? (draft.placeDetails ?? null) : null}
                saveTrigger={saveTrigger}
                onSave={draft !== null && editingPointId === null ? handleSaveNew : handleSaveEdit}
                onDelete={editingPointId !== null ? handleDelete : undefined}
                onClose={handlePanelClose}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MapEditor（ローダー付きラッパー） ─────────────────────
export function MapEditor(props: MapEditorProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: MAPS_API_KEY,
    libraries: LIBRARIES,
    language: "ja",
    region: "JP",
  });

  if (loadError) return (
    <div className="flex h-[calc(100vh-57px)] items-center justify-center text-red-500">
      <div className="text-center">
        <p className="text-lg font-semibold">地図の読み込みに失敗しました</p>
        <p className="text-sm text-gray-400 mt-1">Google Maps API キーを確認してください</p>
      </div>
    </div>
  );

  if (!isLoaded) return (
    <div className="flex h-[calc(100vh-57px)] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <span className="text-sm">地図を読み込んでいます...</span>
      </div>
    </div>
  );

  return <MapEditorContent {...props} />;
}
