import { getDb } from "./mongodb";
import {
  getHistoricalMonths,
  reassembleMonthDump,
  computeStandings,
} from "./topdeck";
import type { MonthDumpPayload, EntrantStats } from "./topdeck";
import { fetchPublicPData } from "./topdeck-cache";
import { fetchLiveStandings } from "./topdeck-live";
import { fetchGuildMembers } from "./discord";
import {
  TOP16_MIN_ONLINE_GAMES,
  TOP16_MIN_TOTAL_GAMES,
  TOP16_NO_RECENCY_GAMES,
  TOP16_RECENCY_AFTER_DAY,
} from "./constants";
import { getBracketIdForMonth } from "./bracket-ids";
import type {
  Player,
  PlayerDetail,
  PlayerMonthStats,
  Standing,
  SubscriptionSource,
} from "./types";
import { getCurrentMonth } from "./utils";

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

  // Find the target month info
  let targetMonth: string;
  if (month) {
    targetMonth = month;
  } else if (months.length > 0) {
    // Use the latest month
    targetMonth = months[months.length - 1].month;
  } else {
    // No dump data at all — resolve bracket_id dynamically
    const bracketId = await getBracketIdForMonth(month || getCurrentMonth());
    return { players: [], bracket_id: bracketId };
  }

  // Find all bracket_ids for the target month
  const monthInfos = months.filter((m) => m.month === targetMonth);
  if (monthInfos.length === 0) {
    // No dump for this month — still return the resolved bracket_id
    const bracketId = await getBracketIdForMonth(targetMonth);
    return { players: [], bracket_id: bracketId };
  }

  // Use the first bracket_id for name lookups via PublicPData
  const bracketId = monthInfos[0].bracket_id;
  const [subscriberLookup, nameLookup] = await Promise.all([
    getSubscriberLookup(),
    getUidNameLookup(bracketId),
  ]);

  // Load and merge dumps for all brackets in the month
  const allPlayers = new Map<string, Player>();

  const dumpResults = await Promise.all(
    monthInfos.map(mi => reassembleMonthDump(mi).then(dump => ({ dump, mi })).catch(err => {
      console.error(`Failed to load dump for ${mi.bracket_id}/${mi.month}:`, err);
      return null;
    }))
  );
  for (const result of dumpResults) {
    if (!result) continue;
    const players = buildRankedPlayers(result.dump, subscriberLookup, nameLookup);

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

  const latestBracketId = months.length > 0
    ? months[months.length - 1].bracket_id
    : await getBracketIdForMonth(getCurrentMonth());
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

  // Process each historical month — compute rank inline to avoid O(N²)
  for (const [monthStr, monthInfos] of monthGroups.entries()) {
    // Aggregate all UIDs' stats across brackets for this month
    const allUidStats = new Map<string, EntrantStats>();

    const monthDumps = await Promise.all(
      monthInfos.map(mi => reassembleMonthDump(mi).catch(err => {
        console.error(`Failed to load dump for ${mi.bracket_id}/${mi.month}:`, err);
        return null;
      }))
    );
    for (const dump of monthDumps) {
      if (!dump) continue;
      const allEntrantIds = Object.keys(dump.entrant_to_uid).map(Number);
      const standings = computeStandings(dump.matches, allEntrantIds);

      for (const [eidStr, uidKey] of Object.entries(dump.entrant_to_uid)) {
        const eid = Number(eidStr);
        const stats = standings.get(eid);
        if (!stats) continue;

        const existing = allUidStats.get(uidKey);
        if (existing) {
          existing.points += stats.points;
          existing.games += stats.games;
          existing.wins += stats.wins;
          existing.losses += stats.losses;
          existing.draws += stats.draws;
        } else {
          allUidStats.set(uidKey, { ...stats });
        }
      }
    }

    const playerStats = allUidStats.get(uid);
    if (!playerStats || playerStats.games === 0) continue;

    // Compute rank by sorting all UIDs by (-points, -games)
    const sortedUids = Array.from(allUidStats.entries())
      .map(([u, s]) => ({ uid: u, points: Math.round(s.points * 100) / 100, games: s.games }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return b.games - a.games;
      });
    const rankIdx = sortedUids.findIndex((s) => s.uid === uid);
    const rank = rankIdx >= 0 ? rankIdx + 1 : null;

    monthlyHistory.push({
      month: monthStr,
      games: playerStats.games,
      wins: playerStats.wins,
      losses: playerStats.losses,
      draws: playerStats.draws,
      points: Math.round(playerStats.points * 100) / 100,
      win_pct:
        playerStats.games > 0
          ? Math.round((playerStats.wins / playerStats.games) * 10000) / 100
          : 0,
      rank,
    });
  }

  // Try live standings for current month data
  let livePlayerDiscord = "";
  let liveOwPct = 0;
  try {
    const liveResult = await fetchLiveStandings();
    const livePlayer = liveResult.rows.find(
      (r) => r.uid === uid || r.entrant_id.toString() === uid
    );
    if (livePlayer) {
      liveOwPct = livePlayer.ow_pct;
      // Ensure name lookup has this player's name from live data
      if (livePlayer.name && !nameLookup.has(uid)) {
        nameLookup.set(uid, livePlayer.name);
      }
      if (livePlayer.discord) {
        livePlayerDiscord = livePlayer.discord.toLowerCase().trim();
      }
      const currentMonth = getCurrentMonth();
      // Only add if not already covered by dump data
      if (!monthlyHistory.some((h) => h.month === currentMonth)) {
        // Compute rank from all live rows
        const sorted = [...liveResult.rows].sort((a, b) => b.points - a.points);
        const liveRank = sorted.findIndex(
          (r) => r.uid === uid || r.entrant_id.toString() === uid
        ) + 1;

        monthlyHistory.push({
          month: currentMonth,
          games: livePlayer.games,
          wins: livePlayer.wins,
          losses: livePlayer.losses,
          draws: livePlayer.draws,
          points: livePlayer.points,
          win_pct: livePlayer.win_pct,
          rank: liveRank || null,
        });
      }
    }
  } catch {
    // live data unavailable
  }

  if (monthlyHistory.length === 0) return null;

  // Query bracket results for achievements
  const db = await getDb();
  const achievements = { top16: [] as string[], top4: [] as string[], champion: [] as string[] };
  try {
    const bracketDocs = await db
      .collection("dashboard_bracket_results")
      .find({})
      .toArray();

    for (const doc of bracketDocs) {
      const m = doc.month as string;
      if (Array.isArray(doc.top16_winners) && doc.top16_winners.includes(uid)) {
        achievements.top16.push(m);
      }
      if (Array.isArray(doc.top4_order) && doc.top4_order.includes(uid)) {
        achievements.top4.push(m);
      }
      if (doc.top4_winner === uid) {
        achievements.champion.push(m);
      }
    }
  } catch {
    // collection may not exist
  }

  const firstMonth = monthlyHistory[0].month;

  // Look up avatar via discord handle from PublicPData or live data → guild member match
  let avatarUrl: string | null = null;
  let discordHandle = "";
  try {
    // Try PublicPData first
    const bracketIdForAvatar = latestBracketId;
    try {
      const pdata = await fetchPublicPData(bracketIdForAvatar);
      discordHandle = pdata[uid]?.discord?.toLowerCase().trim() || "";
    } catch {
      // fall through
    }
    // Fall back to cached live player discord handle
    if (!discordHandle && livePlayerDiscord) {
      discordHandle = livePlayerDiscord;
    }
    if (discordHandle) {
      const guildMembers = await fetchGuildMembers();
      for (const m of guildMembers) {
        if (
          m.avatar_url &&
          (m.username.toLowerCase() === discordHandle ||
            m.display_name.toLowerCase() === discordHandle)
        ) {
          avatarUrl = m.avatar_url;
          break;
        }
      }
    }
  } catch {
    // avatar will be null
  }

  // Use the latest month's stats as current
  const latestMonth = monthlyHistory[monthlyHistory.length - 1];
  const subInfo = subscriberLookup.get(uid);

  return {
    uid,
    name: nameLookup.get(uid) || uid,
    discord_username: discordHandle || null,
    avatar_url: avatarUrl,
    games: latestMonth.games,
    wins: latestMonth.wins,
    losses: latestMonth.losses,
    draws: latestMonth.draws,
    points: latestMonth.points,
    win_pct: latestMonth.win_pct,
    ow_pct: liveOwPct,
    rank: latestMonth.rank,
    is_subscriber: !!subInfo,
    subscription_source: subInfo?.source ?? null,
    monthly_history: monthlyHistory,
    first_month: firstMonth,
    achievements,
  };
}

/**
 * Get Top 16 standings for a given month.
 * Returns the resolved month so callers know which month data came from.
 */
export async function getStandings(month?: string): Promise<{ standings: Standing[]; resolvedMonth: string | null; totalPlayers: number }> {
  const months = await getHistoricalMonths();
  if (months.length === 0) return { standings: [], resolvedMonth: null, totalPlayers: 0 };

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

  return { standings, resolvedMonth, totalPlayers: players.length };
}

// ─── Eligibility helpers (shared with live standings & Dragon Shield codes) ───

async function getOnlineGameCountsForMonth(
  bracketId: string, year: number, month: number,
  voidedMatchIds: { season: number; table: number }[] = [],
): Promise<Map<string, number>> {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchFilter: Record<string, any> = { bracket_id: bracketId, year, month, online: true };
  if (voidedMatchIds.length > 0) {
    matchFilter.$nor = voidedMatchIds.map((v) => ({ season: v.season, tid: v.table }));
  }
  const pipeline = [
    { $match: matchFilter },
    { $unwind: "$topdeck_uids" },
    { $group: { _id: "$topdeck_uids", count: { $sum: 1 } } },
  ];
  const results = await db.collection("online_games").aggregate(pipeline).toArray();
  const counts = new Map<string, number>();
  for (const row of results) {
    const uid = String(row._id).trim();
    if (uid) counts.set(uid, row.count as number);
  }
  return counts;
}

async function getRecentGameUidsForMonth(
  bracketId: string, year: number, month: number,
  voidedMatchIds: { season: number; table: number }[] = [],
): Promise<Set<string>> {
  const db = await getDb();
  const cutoffTs = new Date(Date.UTC(year, month - 1, TOP16_RECENCY_AFTER_DAY)).getTime() / 1000;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchFilter: Record<string, any> = {
    bracket_id: bracketId, year, month, online: true, start_ts: { $gte: cutoffTs },
  };
  if (voidedMatchIds.length > 0) {
    matchFilter.$nor = voidedMatchIds.map((v) => ({ season: v.season, tid: v.table }));
  }
  const pipeline = [
    { $match: matchFilter },
    { $unwind: "$topdeck_uids" },
    { $group: { _id: "$topdeck_uids" } },
  ];
  const results = await db.collection("online_games").aggregate(pipeline).toArray();
  const uids = new Set<string>();
  for (const row of results) {
    const uid = String(row._id).trim();
    if (uid) uids.add(uid);
  }
  return uids;
}

function isEligible(
  uid: string | null,
  totalGames: number,
  onlineGames: number,
  dropped: boolean,
  recencyApplies: boolean,
  recentUids: Set<string>,
): boolean {
  const meetsRecency = !recencyApplies ||
    onlineGames >= TOP16_NO_RECENCY_GAMES ||
    onlineGames < TOP16_MIN_ONLINE_GAMES ||
    (uid ? recentUids.has(uid) : false);
  return !dropped &&
    totalGames >= TOP16_MIN_TOTAL_GAMES &&
    onlineGames >= TOP16_MIN_ONLINE_GAMES &&
    meetsRecency;
}

/**
 * Get the top 16 eligible players for a month, applying the same
 * eligibility rules as live standings (min games, online games, recency).
 * Uses live standings for the current month, dump-based for historical.
 */
export async function getEligibleTop16(month?: string): Promise<{ uid: string; name: string }[]> {
  const targetMonth = month || getCurrentMonth();
  const [yearStr, monthStr] = targetMonth.split("-");
  const year = parseInt(yearStr);
  const monthNum = parseInt(monthStr);
  const recencyApplies = year > 2026 || (year === 2026 && monthNum >= 3);
  const currentMonth = getCurrentMonth();

  // Resolve bracket ID dynamically (online_games → dumps → env var)
  const bracketId = await getBracketIdForMonth(targetMonth);

  if (targetMonth === currentMonth) {
    // Current month: use live standings (has dropped status + voided match IDs)
    const liveResult = await fetchLiveStandings();
    const [onlineCounts, recentUids] = await Promise.all([
      getOnlineGameCountsForMonth(bracketId, year, monthNum, liveResult.voidedMatchIds),
      getRecentGameUidsForMonth(bracketId, year, monthNum, liveResult.voidedMatchIds),
    ]);
    const eligible = liveResult.rows
      .filter((r) => isEligible(r.uid, r.games, onlineCounts.get(r.uid || "") ?? 0, r.dropped, recencyApplies, recentUids))
      .slice(0, 16)
      .map((r) => ({ uid: r.uid || r.entrant_id.toString(), name: r.name }));
    return eligible;
  }

  // Historical month: use dump-based standings (no voided match filtering needed — dumps are finalized)
  const [onlineCounts, recentUids] = await Promise.all([
    getOnlineGameCountsForMonth(bracketId, year, monthNum),
    getRecentGameUidsForMonth(bracketId, year, monthNum),
  ]);

  const { players } = await getPlayers(targetMonth);

  // If no online game data exists for this month, skip eligibility filter
  const hasOnlineData = onlineCounts.size > 0;
  if (!hasOnlineData) {
    return players.slice(0, 16).map((p) => ({ uid: p.uid, name: p.name }));
  }

  const eligible = players
    .filter((p) => isEligible(p.uid, p.games, onlineCounts.get(p.uid) ?? 0, false, recencyApplies, recentUids))
    .slice(0, 16)
    .map((p) => ({ uid: p.uid, name: p.name }));
  return eligible;
}
