import { create } from "zustand";

export type EditorMode = "view" | "add" | "draw" | "measure";

interface ModeStore {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
}

export const useModeStore = create<ModeStore>((set) => ({
  mode: "view",
  setMode: (mode) => set({ mode }),
}));
