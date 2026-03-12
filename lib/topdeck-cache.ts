// lib/topdeck-cache.ts
//
// Shared cache for all TopDeck external fetches.
// Consolidates PublicPData fetching behind a single cache with 30-min TTL,
// and provides a unified clear/refresh mechanism.

import { clearLiveCache } from "./topdeck-live";
import { clearDumpCache } from "./topdeck";

// ─── Types ───

interface CacheEntry<T> {
  data: T;
  expires: number;
}

export type PublicPDataRecord = Record<string, { name?: string; discord?: string }>;

// ─── Cache state ───

const publicPDataCache = new Map<string, CacheEntry<PublicPDataRecord>>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let lastManualRefresh = 0;
const MANUAL_REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// ─── PublicPData fetch with cache ───

export async function fetchPublicPData(bracketId: string): Promise<PublicPDataRecord> {
  const entry = publicPDataCache.get(bracketId);
  if (entry && Date.now() < entry.expires) {
    return entry.data;
  }

  const res = await fetch(`https://topdeck.gg/PublicPData/${bracketId}`);
  if (!res.ok) {
    throw new Error(`TopDeck PublicPData returned ${res.status}`);
  }

  const data: PublicPDataRecord = await res.json();
  publicPDataCache.set(bracketId, { data, expires: Date.now() + CACHE_TTL_MS });
  return data;
}

// ─── Cache clearing ───

export function clearAllTopDeckCaches(): void {
  publicPDataCache.clear();
  clearLiveCache();
  clearDumpCache();
}

// ─── Rate limiting for manual refresh ───

export function canManualRefresh(): boolean {
  return Date.now() - lastManualRefresh >= MANUAL_REFRESH_COOLDOWN_MS;
}

export function recordManualRefresh(): void {
  lastManualRefresh = Date.now();
}

export function getTopDeckCacheStatus(): {
  last_refresh: number;
  cooldown_remaining_ms: number;
  can_refresh: boolean;
} {
  const elapsed = Date.now() - lastManualRefresh;
  const remaining = Math.max(0, MANUAL_REFRESH_COOLDOWN_MS - elapsed);
  return {
    last_refresh: lastManualRefresh,
    cooldown_remaining_ms: remaining,
    can_refresh: remaining === 0,
  };
}
