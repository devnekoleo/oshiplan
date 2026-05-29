"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { MapPoint, PointImage, MapDay } from "@/types";
import { getDayColor, getCategoryIcon } from "@/types";
import type { PlaceDetails } from "@/lib/stores/draftStore";

const MARKER_COLORS = [
  "#3B82F6","#10B981","#F59E0B","#8B5CF6","#EF4444",
  "#06B6D4","#F97316","#EC4899","#6366F1","#78716C",
];

const CATEGORIES = [
  { value: "spot",       label: "スポット" },
  { value: "restaurant", label: "グルメ"   },
  { value: "hotel",      label: "ホテル"   },
  { value: "transport",  label: "移動"     },
];

interface PointPanelProps {
  point: MapPoint | null;
  isNew?: boolean;
  days: MapDay[];
  defaultDayId?: string | null;
  placeDetails?: PlaceDetails | null;
  saveTrigger?: number;
  onSave: (data: {
    title: string;
    description: string;
    images: PointImage[];
    day_id: string | null;
    start_time: string | null;
    end_time: string | null;
    cost: number;
    category: string;
    marker_color: string | null;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

export function PointPanel({ point, isNew, days, defaultDayId, placeDetails, saveTrigger, onSave, onDelete, onClose }: PointPanelProps) {
  const [title,          setTitle]          = useState(point?.title ?? "");
  const [description,    setDescription]    = useState(point?.description ?? "");
  const [images,         setImages]         = useState<PointImage[]>(point?.images ?? []);
  const [newImageUrl,    setNewImageUrl]    = useState("");
  const [newImageCaption,setNewImageCaption]= useState("");
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState("");
  const [dayId,          setDayId]          = useState<string | null>(point?.day_id ?? defaultDayId ?? null);
  const [startTime,      setStartTime]      = useState(point?.start_time ?? "");
  const [endTime,        setEndTime]        = useState(point?.end_time ?? "");
  const [cost,           setCost]           = useState(point?.cost ?? 0);
  const [category,       setCategory]       = useState(point?.category ?? "spot");
  const [markerColor,    setMarkerColor]    = useState<string | null>(point?.marker_color ?? null);
  const prevSaveTrigger = useRef(0);

  useEffect(() => {
    setTitle(point?.title ?? "");
    setDescription(point?.description ?? "");
    setImages(point?.images ?? []);
    setNewImageUrl("");
    setNewImageCaption("");
    setError("");
    setDayId(point?.day_id ?? defaultDayId ?? null);
    setStartTime(point?.start_time ?? "");
    setEndTime(point?.end_time ?? "");
    setCost(point?.cost ?? 0);
    setCategory(point?.category ?? "spot");
    setMarkerColor(point?.marker_color ?? null);
  }, [point, defaultDayId]);

  // Place Detailsが来たとき、新規かつtitleが空なら自動set
  useEffect(() => {
    if (isNew && placeDetails) {
      if (!title && placeDetails.name) setTitle(placeDetails.name);
      if (!description && placeDetails.description) setDescription(placeDetails.description);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeDetails, isNew]);

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    setImages(prev => [...prev, { url: newImageUrl.trim(), caption: newImageCaption || null }]);
    setNewImageUrl("");
    setNewImageCaption("");
  };
  const handleRemoveImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = useCallback(async () => {
    if (!title.trim()) { setError("タイトルを入力してください"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave({
        title: title.trim(), description: description.trim(), images,
        day_id: dayId, start_time: startTime || null, end_time: endTime || null,
        cost, category, marker_color: markerColor,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "保存に失敗しました");
    }
    finally { setSaving(false); }
  }, [title, description, images, dayId, startTime, endTime, cost, category, markerColor, onSave, onClose]);

  // saveTrigger が変化したら保存を実行（Cmd+S / DraftBanner 保存ボタン）
  useEffect(() => {
    if (saveTrigger !== undefined && saveTrigger > 0 && saveTrigger !== prevSaveTrigger.current) {
      prevSaveTrigger.current = saveTrigger;
      handleSave();
    }
  }, [saveTrigger, handleSave]);

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm("このポイントを削除しますか？")) return;
    setSaving(true);
    try { await onDelete(); onClose(); }
    catch { setError("削除に失敗しました"); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="font-semibold text-gray-900">{isNew ? "ポイントを追加" : "ポイントを編集"}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
      </div>

      {/* フォーム */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {isNew && (
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            💡 地図をクリックすると緑のピンが移動します
          </div>
        )}
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

        {/* Google Places 情報バッジ */}
        {isNew && placeDetails && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-blue-700">📍 Google Placesから取得した情報</p>
            {placeDetails.rating != null && (
              <p className="text-xs text-gray-700">⭐ {placeDetails.rating.toFixed(1)}</p>
            )}
            {placeDetails.phone && (
              <p className="text-xs text-gray-600">📞 {placeDetails.phone}</p>
            )}
            {placeDetails.address && (
              <p className="text-xs text-gray-500 truncate">🏠 {placeDetails.address}</p>
            )}
            {placeDetails.openingHours && placeDetails.openingHours.length > 0 && (
              <details className="text-xs text-gray-600">
                <summary className="cursor-pointer text-blue-600">🕐 営業時間を見る</summary>
                <ul className="mt-1 pl-2 space-y-0.5">
                  {placeDetails.openingHours.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </details>
            )}
            {placeDetails.website && (
              <a href={placeDetails.website} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-500 underline truncate block">
                🌐 {placeDetails.website}
              </a>
            )}
          </div>
        )}

        <Input id="point-title" label="タイトル *" value={title}
          onChange={e => setTitle(e.target.value)} placeholder="例: 東京タワー" maxLength={100} />

        {/* カテゴリ */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">カテゴリ</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition ${
                  category === cat.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}>
                <span>{getCategoryIcon(cat.value)}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* マーカーカラー */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">マーカーカラー</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button onClick={() => setMarkerColor(null)}
              title="日程カラーに従う"
              className={`h-6 w-6 rounded-full border-2 text-xs flex items-center justify-center transition ${
                markerColor === null ? "border-gray-700 scale-110" : "border-transparent"
              } bg-gradient-to-br from-gray-200 to-gray-400`}>
            </button>
            {MARKER_COLORS.map(c => (
              <button key={c} onClick={() => setMarkerColor(c)}
                className={`h-6 w-6 rounded-full border-2 transition ${
                  markerColor === c ? "border-gray-700 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          <p className="text-xs text-gray-400">グラデーションボタン = 日程カラーに従う</p>
        </div>

        {/* 日程 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">日程</label>
          <select value={dayId ?? ""}
            onChange={e => setDayId(e.target.value || null)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
            <option value="">日程なし</option>
            {days.map(day => (
              <option key={day.id} value={day.id}>
                Day {day.day_number}{day.title ? ` — ${day.title}` : ""}{day.date ? ` (${day.date})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* 時刻 */}
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">開始時刻</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">終了時刻</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>
        </div>

        {/* 費用 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">費用</label>
          <div className="flex items-center gap-2">
            <input type="number" min={0} value={cost}
              onChange={e => setCost(Math.max(0, parseInt(e.target.value) || 0))}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <span className="text-sm text-gray-500 flex-shrink-0">円</span>
          </div>
        </div>

        {/* 説明 */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">説明</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="このポイントについての説明やメモ..." rows={3}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none" />
        </div>

        {/* 画像 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">画像</label>
          {images.map((img, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.caption ?? ""} className="h-12 w-12 rounded object-cover"
                onError={e => { (e.target as HTMLImageElement).src = ""; }} />
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs text-gray-500">{img.url}</p>
                {img.caption && <p className="text-xs text-gray-400">{img.caption}</p>}
              </div>
              <button onClick={() => handleRemoveImage(i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
            </div>
          ))}
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-gray-200 p-3">
            <input type="url" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
              placeholder="画像URL を貼り付け"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <input type="text" value={newImageCaption} onChange={e => setNewImageCaption(e.target.value)}
              placeholder="キャプション（任意）"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <button type="button" onClick={handleAddImage} disabled={!newImageUrl.trim()}
              className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-40">
              ＋ 画像を追加
            </button>
          </div>
        </div>
      </div>

      {/* フッター */}
      <div className="border-t border-gray-100 p-4 flex flex-col gap-2">
        <Button className="w-full" onClick={handleSave} loading={saving}>
          {isNew ? "追加する" : "保存する"}
        </Button>
        {onDelete && (
          <button onClick={handleDelete} disabled={saving}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40">
            このポイントを削除
          </button>
        )}
      </div>
    </div>
  );
}
