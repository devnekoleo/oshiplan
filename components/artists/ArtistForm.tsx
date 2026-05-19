"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArtistCategory } from "@/types";

const CATEGORIES: { value: ArtistCategory; label: string; icon: string }[] = [
  { value: "idol", label: "アイドル", icon: "🎤" },
  { value: "artist", label: "アーティスト", icon: "🎵" },
  { value: "2.5d", label: "2.5次元", icon: "🎭" },
  { value: "anime", label: "アニメ", icon: "🎌" },
  { value: "sports", label: "スポーツ", icon: "⚽" },
  { value: "other", label: "その他", icon: "⭐" },
];

type ActionFn = (
  prevState: { error: string } | null,
  formData: FormData
) => Promise<{ error: string } | null>;

interface ArtistFormProps {
  action: ActionFn;
  defaultName?: string;
  defaultCategory?: ArtistCategory;
  submitLabel?: string;
}

export function ArtistForm({
  action,
  defaultName = "",
  defaultCategory,
  submitLabel = "登録する",
}: ArtistFormProps) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {state.error}
        </div>
      )}

      <Input
        id="name"
        name="name"
        label="推しの名前"
        placeholder="例: ○○ (グループ名 / ソロ名)"
        defaultValue={defaultName}
        required
        maxLength={50}
      />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          カテゴリ <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map(({ value, label, icon }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm transition hover:border-purple-300 has-[:checked]:border-purple-500 has-[:checked]:bg-purple-50"
            >
              <input
                type="radio"
                name="category"
                value={value}
                defaultChecked={defaultCategory === value}
                className="accent-purple-600"
                required
              />
              <span>{icon}</span>
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" loading={pending} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
