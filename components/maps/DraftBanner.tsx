"use client";

import { useDraftStore } from "@/lib/stores/draftStore";
import { useSelectionStore } from "@/lib/stores/selectionStore";

interface DraftBannerProps {
  onSave: () => void;
}

export function DraftBanner({ onSave }: DraftBannerProps) {
  const { draft, clearDraft } = useDraftStore();
  const { setEditingPoint } = useSelectionStore();

  if (!draft) return null;

  const handleDiscard = () => {
    clearDraft();
    setEditingPoint(null);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="animate-pulse text-base">📍</span>
        <span className="text-amber-800 truncate">
          未保存の地点があります
          {draft.title ? `「${draft.title}」` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleDiscard}
          className="rounded-full border border-amber-300 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
        >
          破棄
        </button>
        <button
          onClick={onSave}
          className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  );
}
