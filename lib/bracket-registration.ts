import { getHistoricalMonths, reassembleMonthDump } from "./topdeck";
import { fetchPublicPData } from "./topdeck-cache";
import { fetchLiveStandings } from "./topdeck-live";
import { fetchGuildMembers } from "./discord";

// ─── Cache with 5-min TTL ───

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const usernameCache = new Map<string, CacheEntry<Set<string> | null>>();
const idCache = new Map<string, CacheEntry<Set<string> | null>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

/**
 * Returns the set of lowercased Discord usernames registered in a month's bracket.
 * Returns null if no registration data is available (no filtering should be applied).
 */
export async function getRegisteredDiscordUsernames(
  month: string
): Promise<Set<string> | null> {
  const cached = getCached(usernameCache, month);
  if (cached !== undefined) return cached;

  const usernames = new Set<string>();

  try {
    // 1. Try dump data first
    const historicalMonths = await getHistoricalMonths();
    const monthInfos = historicalMonths.filter((m) => m.month === month);

    if (monthInfos.length > 0) {
      // Collect all TopDeck UIDs from dumps
      const allUids = new Set<string>();
      const bracketIds = new Set<string>();

      for (const mi of monthInfos) {
        bracketIds.add(mi.bracket_id);
        const dump = await reassembleMonthDump(mi);
        for (const uid of Object.values(dump.entrant_to_uid)) {
          allUids.add(uid);
        }
      }

      // Map UIDs to discord usernames via PublicPData
      for (const bid of bracketIds) {
        try {
          const pdata = await fetchPublicPData(bid);
          for (const [uid, info] of Object.entries(pdata)) {
            if (allUids.has(uid) && info.discord) {
              usernames.add(info.discord.toLowerCase().trim());
            }
          }
        } catch {
          // bracket may no longer exist
        }
      }

      if (usernames.size > 0) {
        setCache(usernameCache, month, usernames);
        return usernames;
      }
    }

    // 2. Fallback: try live standings (current month)
    try {
      const live = await fetchLiveStandings();
      for (const row of live.rows) {
        if (row.discord) {
          usernames.add(row.discord.toLowerCase().trim());
        }
      }
    } catch {
      // live standings unavailable
    }

    if (usernames.size > 0) {
      setCache(usernameCache, month, usernames);
      return usernames;
    }
  } catch (err) {
    console.error("Failed to get registered usernames:", err);
  }

  // No data found — return null (no filtering)
  setCache(usernameCache, month, null);
  return null;
}

/**
 * Returns a set containing both discord_ids and lowercased discord usernames
 * of registered players, for flexible matching against different ID formats.
 * Returns null if no registration data is available.
 */
export async function getRegisteredDiscordIds(
  month: string
): Promise<Set<string> | null> {
  const cached = getCached(idCache, month);
  if (cached !== undefined) return cached;

  const usernames = await getRegisteredDiscordUsernames(month);
  if (usernames === null) {
    setCache(idCache, month, null);
    return null;
  }

  // Start with usernames for flexible matching
  const ids = new Set<string>(usernames);

  // Map usernames → discord_ids via guild members
  try {
    const members = await fetchGuildMembers();
    const usernameToId = new Map(
      members.map((m) => [m.username.toLowerCase(), m.id])
    );

    for (const username of usernames) {
      const discordId = usernameToId.get(username);
      if (discordId) {
        ids.add(discordId);
      }
    }
  } catch {
    // proceed with usernames only
  }

  setCache(idCache, month, ids);
  return ids;
}
