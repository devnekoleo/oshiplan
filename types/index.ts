export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface TravelMap {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface MapPoint {
  id: string;
  map_id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  order_index: number;
  images: PointImage[];
  created_at: string;
  day_id: string | null;
  start_time: string | null;
  end_time: string | null;
  cost: number;
  marker_color: string | null;
  category: string | null;
}

export interface MapLine {
  id: string;
  map_id: string;
  day_id: string | null;
  name: string | null;
  color: string;
  width: number;
  coordinates: [number, number][];
  created_at: string;}

export interface PointImage {
  url: string;
  caption: string | null;
}

export interface MapDay {
  id: string;
  map_id: string;
  day_number: number;
  date: string | null;
  title: string | null;
  color: string | null;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  map_id: string;
  category: 'packing' | 'todo';
  label: string;
  is_checked: boolean;
  order_index: number;
  created_at: string;
}

export const DAY_COLORS = [
  '#3B82F6', // blue-500   — Day 1
  '#10B981', // emerald-500 — Day 2
  '#F59E0B', // amber-500  — Day 3
  '#8B5CF6', // violet-500 — Day 4
  '#EF4444', // red-500    — Day 5
  '#06B6D4', // cyan-500   — Day 6
  '#F97316', // orange-500 — Day 7
  '#EC4899', // pink-500   — Day 8+
];

export function getDayColor(dayNumber: number): string {
  return DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    spot: '📍',
    restaurant: '🍽️',
    hotel: '🏨',
    transport: '🚗',
  };
  return icons[category] ?? '📍';
}
