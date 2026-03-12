import { getDb } from "./mongodb";
import {
  getHistoricalMonths,
  reassembleMonthDump,
  computeStandings,
  getPlayerStatsFromDump,
} from "./topdeck";
import type { MonthDumpPayload, EntrantStats } from "./topdeck";
import { fetchPublicPData } from "./topdeck-cache";
import type {
  Player,
  PlayerDetail,
  PlayerMonthStats,
  Standing,
  SubscriptionSource,
} from "./types";

// ─── Helpers ───

interface UidInfo {
  name: string;
  is_subscriber: boolean;
  subscription_source: SubscriptionSource | null;
}

async function getSubscriberLookup(): Promise<Map<string, { source: SubscriptionSource }>> {
  const db = await getDb();
  const lookup = new Map<string, { source: SubscriptionSource }>();

  // Check subs_access for current subscribers
  try {
    const accessDocs = await db
      .collection("subs_access")
      .find({})
      .project({ user_id: 1, kind: 1 })
      .toArray();

    for (const doc of accessDocs) {
      const userId = doc.user_id as string;
      const kind = doc.kind as string;
      let source: SubscriptionSource = "free";
      if (kind?.includes("patreon")) source = "patreon";
      else if (kind?.includes("kofi")) source = "kofi";
      lookup.set(userId, { source });
    }
  } catch {
    // collection may not exist
  }

  return lookup;
}

async function getUidNameLookup(bracketId?: string): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();

  // Fetch names from TopDeck PublicPData (keyed by TopDeck uid)
  if (bracketId) {
    try {
      const data = await fetchPublicPData(bracketId);
      for (const [uid, info] of Object.entries(data)) {
        if (info?.name) {
          lookup.set(uid, info.name);
        }
      }
    } catch {
      // fall through to discord_members
    }
  }

  // Fall back to discord_members for any UIDs not found
  if (lookup.size === 0) {
    const db = await getDb();
    try {
      const members = await db
        .collection("discord_members")
        .find({})
        .project({ user_id: 1, display_name: 1, username: 1 })
        .toArray();

      for (const m of members) {
        const uid = (m.user_id || m._id) as string;
        const name = (m.display_name || m.username || uid) as string;
        lookup.set(uid, name);
      }
    } catch {
      // collection may not exist
    }
  }

  return lookup;
}

function buildRankedPlayers(
  dump: MonthDumpPayload,
  subscriberLookup: Map<string, { source: SubscriptionSource }>,
  nameLookup: Map<string, string>
): Player[] {
  const allEntrantIds = Object.keys(dump.entrant_to_uid).map(Number);
  const standings = computeStandings(dump.matches, allEntrantIds);

  // Aggregate by uid (a uid may have multiple entrant_ids)
  const uidStats = new Map<string, EntrantStats>();

  for (const [eidStr, uid] of Object.entries(dump.entrant_to_uid)) {
    const eid = Number(eidStr);
    const stats = standings.get(eid);
    if (!stats) continue;

    const existing = uidStats.get(uid);
    if (existing) {
      existing.points += stats.points;
      existing.games += stats.games;
      existing.wins += stats.wins;
      existing.losses += stats.losses;
      existing.draws += stats.draws;
      existing.win_pct =
        existing.games > 0
          ? Math.round((existing.wins / existing.games) * 10000) / 100
          : 0;
    } else {
      uidStats.set(uid, { ...stats });
    }
  }

  // Convert to Player array
  const players: Player[] = [];

  for (const [uid, stats] of uidStats.entries()) {
    const subInfo = subscriberLookup.get(uid);
    players.push({
      uid,
      name: nameLookup.get(uid) || uid,
      games: stats.games,
      wins: stats.wins,
      losses: stats.losses,
      draws: stats.draws,
      points: Math.round(stats.points * 100) / 100,
      win_pct: stats.win_pct,
      rank: null, // assigned below
      is_subscriber: !!subInfo,
      subscription_source: subInfo?.source ?? null,
    });
  }

  // Sort by (-points, -games) and assign ranks
  players.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.games - a.games;
  });

  for (let i = 0; i < players.length; i++) {
    players[i].rank = i + 1;
  }

  return players;
}

// ─── Public API ───

/**
 * Get player list with game counts, points, rank.
 * If month provided, use that month's dump. Otherwise use latest available month.
 */
export async function getPlayers(month?: string): Promise<{ players: Player[]; bracket_id: string }> {
  const months = await getHistoricalMonths();
  if (months.length === 0) return { players: [], bracket_id: "" };

  // Find the target month info
  let targetMonth: string;
  if (month) {
    targetMonth = month;
  } else {
    // Use the latest month
    targetMonth = months[months.length - 1].month;
  }

  // Find all bracket_ids for the target month
  const monthInfos = months.filter((m) => m.month === targetMonth);
  if (monthInfos.length === 0) return { players: [], bracket_id: "" };

  // Use the first bracket_id for name lookups via PublicPData
  const bracketId = monthInfos[0].bracket_id;
  const [subscriberLookup, nameLookup] = await Promise.all([
    getSubscriberLookup(),
    getUidNameLookup(bracketId),
  ]);

  // Load and merge dumps for all brackets in the month
  const allPlayers = new Map<string, Player>();

  for (const mi of monthInfos) {
    try {
      const dump = await reassembleMonthDump(mi);
      const players = buildRankedPlayers(dump, subscriberLookup, nameLookup);

      for (const p of players) {
        const existing = allPlayers.get(p.uid);
        if (existing) {
          existing.points += p.points;
          existing.games += p.games;
          existing.wins += p.wins;
          existing.losses += p.losses;
          existing.draws += p.draws;
          existing.win_pct =
            existing.games > 0
              ? Math.round((existing.wins / existing.games) * 10000) / 100
              : 0;
        } else {
          allPlayers.set(p.uid, { ...p });
        }
      }
    } catch (err) {
      console.error(`Failed to load dump for ${mi.bracket_id}/${mi.month}:`, err);
    }
  }

  // Re-sort and re-rank the merged results
  const result = Array.from(allPlayers.values());
  result.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.games - a.games;
  });

  for (let i = 0; i < result.length; i++) {
    result[i].rank = i + 1;
  }

  return { players: result, bracket_id: bracketId };
}

/**
 * Get single player with monthly history across all available dumps.
 */
export async function getPlayerDetail(uid: string): Promise<PlayerDetail | null> {
  const months = await getHistoricalMonths();
  if (months.length === 0) return null;

  // Use latest bracket for name lookups
  const latestBracketId = months[months.length - 1].bracket_id;
  const [subscriberLookup, nameLookup] = await Promise.all([
    getSubscriberLookup(),
    getUidNameLookup(latestBracketId),
  ]);

  const monthlyHistory: PlayerMonthStats[] = [];

  // Group months by month value (may have multiple brackets per month)
  const monthGroups = new Map<string, typeof months>();
  for (const mi of months) {
    const existing = monthGroups.get(mi.month) || [];
    existing.push(mi);
    monthGroups.set(mi.month, existing);
  }

  // Process each month
  for (const [monthStr, monthInfos] of monthGroups.entries()) {
    let totalPoints = 0;
    let totalGames = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalDraws = 0;
    let found = false;

    for (const mi of monthInfos) {
      try {
        const dump = await reassembleMonthDump(mi);
        const stats = getPlayerStatsFromDump(dump, uid);
        if (stats) {
          found = true;
          totalPoints += stats.points;
          totalGames += stats.games;
          totalWins += stats.wins;
          totalLosses += stats.losses;
          totalDraws += stats.draws;
        }
      } catch (err) {
        console.error(`Failed to load dump for ${mi.bracket_id}/${mi.month}:`, err);
      }
    }

    if (found) {
      // Compute rank for this month
      let rank: number | null = null;
      try {
        const { players: playersThisMonth } = await getPlayers(monthStr);
        const playerInList = playersThisMonth.find((p) => p.uid === uid);
        if (playerInList) rank = playerInList.rank;
      } catch {
        // rank will be null
      }

      monthlyHistory.push({
        month: monthStr,
        games: totalGames,
        wins: totalWins,
        losses: totalLosses,
        draws: totalDraws,
        points: Math.round(totalPoints * 100) / 100,
        win_pct:
          totalGames > 0
            ? Math.round((totalWins / totalGames) * 10000) / 100
            : 0,
        rank,
      });
    }
  }

  if (monthlyHistory.length === 0) return null;

  // Use the latest month's stats as current
  const latestMonth = monthlyHistory[monthlyHistory.length - 1];
  const subInfo = subscriberLookup.get(uid);

  return {
    uid,
    name: nameLookup.get(uid) || uid,
    games: latestMonth.games,
    wins: latestMonth.wins,
    losses: latestMonth.losses,
    draws: latestMonth.draws,
    points: latestMonth.points,
    win_pct: latestMonth.win_pct,
    rank: latestMonth.rank,
    is_subscriber: !!subInfo,
    subscription_source: subInfo?.source ?? null,
    monthly_history: monthlyHistory,
  };
}

/**
 * Get Top 16 standings for a given month.
 * Returns the resolved month so callers know which month data came from.
 */
export async function getStandings(month?: string): Promise<{ standings: Standing[]; resolvedMonth: string | null }> {
  const months = await getHistoricalMonths();
  if (months.length === 0) return { standings: [], resolvedMonth: null };

  // Resolve target month: use requested month if it has data, otherwise latest
  let resolvedMonth: string;
  if (month) {
    const hasData = months.some((m) => m.month === month);
    resolvedMonth = hasData ? month : months[months.length - 1].month;
  } else {
    resolvedMonth = months[months.length - 1].month;
  }

  const { players } = await getPlayers(resolvedMonth);

  const standings = players.slice(0, 16).map((p) => ({
    rank: p.rank!,
    uid: p.uid,
    name: p.name,
    points: p.points,
    games: p.games,
    wins: p.wins,
    losses: p.losses,
    draws: p.draws,
    win_pct: p.win_pct,
  }));

  return { standings, resolvedMonth };
}
