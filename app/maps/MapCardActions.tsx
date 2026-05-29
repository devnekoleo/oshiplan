"use client";

import { useState, useTransition } from "react";
import { deleteMap, duplicateMap } from "./actions";

interface MapCardActionsProps {
  mapId: string;
  title: string;
}

export function MapCardActions({ mapId, title }: MapCardActionsProps) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"duplicate" | "delete" | null>(null);

  const handleDuplicate = () => {
    setBusy("duplicate");
    startTransition(async () => {
      await duplicateMap(mapId);
      setBusy(null);
    });
  };

  const handleDelete = () => {
    if (!confirm(`「${title}」を削除しますか？\nこの操作は取り消せません。`)) return;
    setBusy("delete");
    startTransition(async () => {
      await deleteMap(mapId);
      setBusy(null);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDuplicate}
        disabled={pending}
        className="rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
        title="マップを複製"
      >
        {busy === "duplicate" ? "..." : "複製"}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded-full border border-red-100 px-3 py-1.5 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-40"
      >
        {busy === "delete" ? "..." : "削除"}
      </button>
    </>
  );
}
