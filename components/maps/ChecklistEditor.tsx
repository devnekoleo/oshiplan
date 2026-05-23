"use client";

import { useState } from "react";
import {
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from "@/app/maps/[id]/actions";
import type { ChecklistItem } from "@/types";

interface ChecklistEditorProps {
  mapId: string;
  initialItems: ChecklistItem[];
}

function ChecklistSection({
  title,
  category,
  items,
  mapId,
  onAdd,
  onToggle,
  onDelete,
}: {
  title: string;
  category: "packing" | "todo";
  items: ChecklistItem[];
  mapId: string;
  onAdd: (item: ChecklistItem) => void;
  onToggle: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setAdding(true);
    try {
      const result = await addChecklistItem(mapId, { category, label: newLabel.trim() });
      if (result.error) { alert(result.error); return; }
      const newItem: ChecklistItem = {
        id: result.id!,
        map_id: mapId,
        category,
        label: newLabel.trim(),
        is_checked: false,
        order_index: items.length,
        created_at: new Date().toISOString(),
      };
      onAdd(newItem);
      setNewLabel("");
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    const newChecked = !item.is_checked;
    onToggle(item.id, newChecked);
    await toggleChecklistItem(item.id, newChecked);
  };

  const handleDelete = async (id: string) => {
    onDelete(id);
    await deleteChecklistItem(id);
  };

  const checkedCount = items.filter((i) => i.is_checked).length;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{category === "packing" ? "🎒" : "✅"}</span>
          <h2 className="font-bold text-gray-800">{title}</h2>
        </div>
        <span className="text-xs text-gray-400">
          {checkedCount} / {items.length}
        </span>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="px-5 py-6 text-center text-sm text-gray-400">
          アイテムがありません
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition">
              <button
                onClick={() => handleToggle(item)}
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition ${
                  item.is_checked
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-gray-300 bg-white hover:border-blue-400"
                }`}
              >
                {item.is_checked && (
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span
                className={`flex-1 text-sm transition ${
                  item.is_checked ? "text-gray-400 line-through" : "text-gray-800"
                }`}
              >
                {item.label}
              </span>
              <button
                onClick={() => handleDelete(item.id)}
                className="flex-shrink-0 text-gray-300 hover:text-red-500 transition text-sm"
                title="削除"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add input */}
      <div className="border-t border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            placeholder="＋ 追加..."
            disabled={adding}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          />
          <button
            onClick={handleAdd}
            disabled={!newLabel.trim() || adding}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition flex-shrink-0"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChecklistEditor({ mapId, initialItems }: ChecklistEditorProps) {
  const [items, setItems] = useState<ChecklistItem[]>(initialItems);

  const packingItems = items.filter((i) => i.category === "packing");
  const todoItems = items.filter((i) => i.category === "todo");

  const handleAdd = (item: ChecklistItem) => {
    setItems((prev) => [...prev, item]);
  };

  const handleToggle = (id: string, checked: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_checked: checked } : i)));
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const totalChecked = items.filter((i) => i.is_checked).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-6">
      {/* Progress summary */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">全体の進捗</span>
            <span className="text-sm font-bold text-blue-700">{totalChecked} / {items.length}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-blue-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: items.length > 0 ? `${(totalChecked / items.length) * 100}%` : "0%" }}
            />
          </div>
        </div>
      )}

      {/* Packing list */}
      <ChecklistSection
        title="持ち物リスト"
        category="packing"
        items={packingItems}
        mapId={mapId}
        onAdd={handleAdd}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />

      {/* Todo list */}
      <ChecklistSection
        title="やることリスト"
        category="todo"
        items={todoItems}
        mapId={mapId}
        onAdd={handleAdd}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
    </div>
  );
}
