"use client";

import { useEffect } from "react";
import type { Plan } from "@/types";

const CACHE_KEY_PREFIX = "oshiplan:plan:";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7日

interface CacheEntry {
  plan: Plan;
  cachedAt: number;
}

/** プラン詳細を localStorage にキャッシュする（オフライン閲覧用） */
export function PlanOfflineCache({ plan }: { plan: Plan }) {
  useEffect(() => {
    try {
      const entry: CacheEntry = { plan, cachedAt: Date.now() };
      localStorage.setItem(CACHE_KEY_PREFIX + plan.id, JSON.stringify(entry));
    } catch {
      // localStorage 容量超過等は無視
    }
  }, [plan]);

  return null;
}

export function getCachedPlan(planId: string): Plan | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + planId);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(CACHE_KEY_PREFIX + planId);
      return null;
    }
    return entry.plan;
  } catch {
    return null;
  }
}
