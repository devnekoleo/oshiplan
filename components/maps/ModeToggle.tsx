"use client";

import { useModeStore, type EditorMode } from "@/lib/stores/modeStore";

const MODES: { id: EditorMode; icon: string; label: string }[] = [
  { id: "view",    icon: "👁",  label: "閲覧" },
  { id: "add",     icon: "📍", label: "追加" },
  { id: "draw",    icon: "✏️", label: "描画" },
];

export function ModeToggle() {
  const { mode, setMode } = useModeStore();

  return (
    <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {MODES.map((m) => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          title={m.label}
          aria-pressed={mode === m.id}
          className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
            mode === m.id
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <span>{m.icon}</span>
          <span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
