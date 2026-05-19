import { cn } from "@/lib/utils";
import { ArtistCategory } from "@/types";

const CATEGORY_LABELS: Record<ArtistCategory, string> = {
  idol: "アイドル",
  artist: "アーティスト",
  "2.5d": "2.5次元",
  anime: "アニメ",
  sports: "スポーツ",
  other: "その他",
};

const CATEGORY_ICONS: Record<ArtistCategory, string> = {
  idol: "🎤",
  artist: "🎵",
  "2.5d": "🎭",
  anime: "🎌",
  sports: "⚽",
  other: "⭐",
};

interface CategoryBadgeProps {
  category: ArtistCategory;
  className?: string;
}

export function CategoryBadge({ category, className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700",
        className
      )}
    >
      {CATEGORY_ICONS[category]} {CATEGORY_LABELS[category]}
    </span>
  );
}
