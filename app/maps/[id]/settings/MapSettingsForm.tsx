"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { updateMap } from "../../actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface MapSettingsFormProps {
  mapId: string;
  shareToken: string;
  initialTitle: string;
  initialDescription: string;
  initialIsPublic: boolean;
}

export function MapSettingsForm({
  mapId,
  shareToken,
  initialTitle,
  initialDescription,
  initialIsPublic,
}: MapSettingsFormProps) {
  const updateWithId = updateMap.bind(null, mapId);
  const [state, action, pending] = useActionState(updateWithId, null);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [copied, setCopied]     = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [saved, setSaved]       = useState(false);

  const origin   = typeof window !== "undefined" ? window.location.origin : "https://viamaps.app";
  const shareUrl = `${origin}/shared/${shareToken}`;
  const embedCode = `<iframe src="${shareUrl}" width="600" height="450" style="border:0" allowfullscreen loading="lazy"></iframe>`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/maps/${mapId}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← 編集に戻る
        </Link>
        <h1 className="text-xl font-bold text-gray-900">マップ設定</h1>
      </div>

      <form action={action} className="flex flex-col gap-5">
        {state?.error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</div>
        )}
        {state === null && saved && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">保存しました ✓</div>
        )}

        <Input
          id="title"
          name="title"
          label="マップ名 *"
          required
          maxLength={100}
          defaultValue={initialTitle}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-gray-700">説明</label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={500}
            defaultValue={initialDescription}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
          />
        </div>

        {/* 公開設定 */}
        <div className="rounded-xl border border-gray-200 p-4">
          <label className="flex cursor-pointer items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">マップを公開する</p>
              <p className="text-xs text-gray-500">ONにするとリンクで誰でも閲覧できます</p>
            </div>
            <input
              type="checkbox"
              name="is_public"
              value="true"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-5 w-5 accent-blue-600"
            />
          </label>

          {isPublic && (
            <div className="mt-3 flex flex-col gap-3">
              {/* 共有リンク */}
              <div>
                <p className="text-xs text-gray-500 mb-1">共有リンク</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={shareUrl}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 bg-gray-50" />
                  <button type="button" onClick={copyLink}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap">
                    {copied ? "コピー済み ✓" : "コピー"}
                  </button>
                </div>
              </div>
              {/* 埋め込みコード */}
              <div>
                <p className="text-xs text-gray-500 mb-1">埋め込みコード（iframe）</p>
                <div className="flex items-start gap-2">
                  <textarea readOnly value={embedCode} rows={3}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 resize-none font-mono" />
                  <button type="button" onClick={copyEmbed}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap flex-shrink-0">
                    {copiedEmbed ? "コピー済み ✓" : "コピー"}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">HTMLに貼り付けることでマップを埋め込めます</p>
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          loading={pending}
          className="w-full"
          onClick={() => setSaved(true)}
        >
          保存する
        </Button>
      </form>
    </main>
  );
}
