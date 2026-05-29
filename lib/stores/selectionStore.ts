import { create } from "zustand";

interface SelectionStore {
  selectedPointId: string | null;
  hoveredPointId: string | null;
  editingPointId: string | null;
  focusedDayId: string | null;
  setSelectedPoint: (id: string | null) => void;
  setHoveredPoint: (id: string | null) => void;
  setEditingPoint: (id: string | null) => void;
  setFocusedDay: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionStore>((set) => ({
  selectedPointId: null,
  hoveredPointId: null,
  editingPointId: null,
  focusedDayId: null,
  setSelectedPoint: (id) => set({ selectedPointId: id }),
  setHoveredPoint: (id) => set({ hoveredPointId: id }),
  setEditingPoint: (id) => set({ editingPointId: id }),
  setFocusedDay: (id) => set({ focusedDayId: id }),
}));
