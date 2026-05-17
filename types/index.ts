export type ArtistCategory =
  | "idol"
  | "artist"
  | "2.5d"
  | "anime"
  | "sports"
  | "other";

export type AffiliateType = "hotel" | "transit" | "goods";

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  home_station: string | null;
  daily_ai_used: number;
  daily_ai_reset_at: string | null;
  created_at: string;
}

export interface Artist {
  id: string;
  user_id: string;
  name: string;
  category: ArtistCategory;
  created_at: string;
}

export interface Venue {
  id: string;
  slug: string;
  name: string;
  prefecture: string;
  address: string;
  lat: number;
  lng: number;
  capacity: number | null;
  rakuten_area_code: string | null;
  created_at: string;
}

export interface ItineraryItem {
  time: string;
  action: string;
  cost: number | null;
}

export interface AffiliateLinks {
  rakuten?: string | null;
  jalan?: string | null;
}

export interface Accommodation {
  name: string;
  area: string | null;
  price_approx: number | null;
  affiliate_links: AffiliateLinks | null;
}

export interface TransitInfo {
  type: "shinkansen" | "airplane" | "bus" | "local" | "other";
  name: string;
  cost: number;
  duration_min: number;
  booking_url: string | null;
}

export interface GoodsLink {
  name: string;
  amazon_url: string | null;
}

export interface PlanJson {
  summary: string;
  estimated_cost: number;
  itinerary: ItineraryItem[];
  accommodation: Accommodation | null;
  transit: {
    outbound: TransitInfo | null;
    return: TransitInfo | null;
  };
  merch_line_advice: string | null;
  goods_links: GoodsLink[];
  tips: string[];
}

export interface Plan {
  id: string;
  user_id: string | null;
  artist_id: string | null;
  event_name: string;
  venue_name: string;
  venue_slug: string | null;
  event_date: string;
  event_time: string | null;
  departure: string;
  budget_hint: number | null;
  plan_json: PlanJson;
  share_token: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
