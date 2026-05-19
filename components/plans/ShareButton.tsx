"use client";

import { useState } from "react";

interface ShareButtonProps {
  planId: string;
  currentToken: string | null;
}

export function ShareButton({ planId, currentToken }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState(currentToken);

  const handleShare = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plans/${planId}/share`, { method: "POST" });
      const data = await res.json();
      if (data.share_token) {
        setToken(data.share_token);
        await navigator.clipboard.writeText(data.share_url);
        alert("共有URLをコピーしました！");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const url = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(url);
    alert("URLをコピーしました！");
  };

  return (
    <button
      onClick={token ? handleCopy : handleShare}
      disabled={loading}
      className="rounded-full border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? "..." : "🔗 共有"}
    </button>
  );
}
