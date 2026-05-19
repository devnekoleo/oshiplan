/**
 * シンプルなIPベースレート制限
 * Vercel KV が設定されていない場合はインメモリで動作（サーバーレス環境では不完全だが許容）
 * KV が設定されている場合は永続的なカウントを使用
 */

const GUEST_DAILY_LIMIT = 3;

interface KVStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<void>;
}

function getKVStore(): KVStore | null {
  if (
    !process.env.KV_REST_API_URL ||
    !process.env.KV_REST_API_TOKEN ||
    process.env.KV_REST_API_URL.includes("...")
  ) {
    return null;
  }
  return {
    async get(key: string): Promise<string | null> {
      try {
        const res = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
          headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.result ?? null;
      } catch {
        return null;
      }
    },
    async set(key: string, value: string, options?: { ex?: number }): Promise<void> {
      try {
        const url = options?.ex
          ? `${process.env.KV_REST_API_URL}/set/${key}/${encodeURIComponent(value)}?ex=${options.ex}`
          : `${process.env.KV_REST_API_URL}/set/${key}/${encodeURIComponent(value)}`;
        await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
        });
      } catch {
        // silently fail
      }
    },
  };
}

export async function checkGuestRateLimit(ip: string): Promise<boolean> {
  const kv = getKVStore();
  const today = new Date().toISOString().split("T")[0];
  const key = `guest_rate:${ip}:${today}`;

  if (!kv) {
    // KV 未設定: ゲストを通過させる（Vercel KV 設定後に完全施行）
    return true;
  }

  try {
    const current = await kv.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= GUEST_DAILY_LIMIT) return false;

    // 翌日 0 時まで残り秒数で TTL を設定
    const now = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const ttl = Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);

    await kv.set(key, String(count + 1), { ex: ttl });
    return true;
  } catch {
    return true;
  }
}
