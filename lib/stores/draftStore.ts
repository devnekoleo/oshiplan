import { create } from "zustand";

export interface PlaceDetails {
  name: string | null;
  address: string | null;
  rating: number | null;
  phone: string | null;
  website: string | null;
  openingHours: string[] | null;
  description: string | null;
  photoNames: string[];
}

export interface Draft {
  lat: number;
  lng: number;
  title?: string;
  placeId?: string;
  defaultDayId?: string | null;
  placeDetails?: PlaceDetails | null;
}

interface DraftStore {
  draft: Draft | null;
  setDraft: (draft: Draft) => void;
  updateDraft: (patch: Partial<Draft>) => void;
  clearDraft: () => void;
}

export const useDraftStore = create<DraftStore>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
  updateDraft: (patch) =>
    set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : s)),
  clearDraft: () => set({ draft: null }),
}));
