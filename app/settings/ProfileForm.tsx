"use client";

import { useActionState } from "react";
import { updateProfile } from "./actions";
import { Button } from "@/components/ui/Button";

interface ProfileFormProps {
  email: string;
  initialDisplayName: string;
}

export function ProfileForm({ email, initialDisplayName }: ProfileFormProps) {
  const [state, action, pending] = useActionState(updateProfile, null);

  return (
    <form
      action={action}
      className="rounded-xl border border-gray-100 bg-white divide-y divide-gray-50 overflow-hidden"
    >
      <div className="px-4 py-3">
        <p className="text-sm text-gray-500 mb-1">メールアドレス</p>
        <p className="text-sm font-medium text-gray-900">{email}</p>
      </div>
      <div className="px-4 py-3 flex flex-col gap-2">
        <label htmlFor="display_name" className="text-sm text-gray-500">表示名</label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          defaultValue={initialDisplayName}
          maxLength={50}
          placeholder="名前を入力（任意）"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>
      {state?.error && (
        <div className="px-4 py-2 text-sm text-red-600 bg-red-50">{state.error}</div>
      )}
      {state?.success && (
        <div className="px-4 py-2 text-sm text-green-700 bg-green-50">保存しました ✓</div>
      )}
      <div className="px-4 py-3">
        <Button type="submit" size="sm" loading={pending}>
          保存する
        </Button>
      </div>
    </form>
  );
}
