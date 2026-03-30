import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { fetchLiveStandings } from "@/lib/topdeck-live";
import { fetchGuildMembers } from "@/lib/discord";
import { getDb } from "@/lib/mongodb";
import { TOPDECK_BRACKET_ID, TOP16_MIN_ONLINE_GAMES, TOP16_MIN_TOTAL_GAMES, TOP16_NO_RECENCY_GAMES, TOP16_RECENCY_AFTER_DAY } from "@/lib/constants";
import type { LiveStanding } from "@/lib/types";

const MIN_ONLINE_GAMES = TOP16_MIN_ONLINE_GAMES;
const MIN_TOTAL_GAMES = TOP16_MIN_TOTAL_GAMES;
const NO_RECENCY_GAMES = TOP16_NO_RECENCY_GAMES;
const RECENCY_AFTER_DAY = TOP16_RECENCY_AFTER_DAY;

async function getOnlineGameCounts(voidedMatchIds: { season: number; table: number }[]): Promise<Map<string, number>> {
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchFilter: Record<string, any> = {
    bracket_id: TOPDECK_BRACKET_ID,
    year,
    month,
    online: true,
  };

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

/** UIDs that have at least one online game on or after RECENCY_AFTER_DAY of the current month */
async function getRecentGameUids(voidedMatchIds: { season: number; table: number }[]): Promise<Set<string>> {
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const cutoffTs = new Date(Date.UTC(year, month - 1, RECENCY_AFTER_DAY)).getTime() / 1000;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchFilter: Record<string, any> = {
    bracket_id: TOPDECK_BRACKET_ID,
    year,
    month,
    online: true,
    start_ts: { $gte: cutoffTs },
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

export const GET = withAuthRead(async () => {
  const [liveResult, guildMembers] = await Promise.all([
    fetchLiveStandings(),
    fetchGuildMembers(),
  ]);

  const [onlineCounts, recentUids] = await Promise.all([
    getOnlineGameCounts(liveResult.voidedMatchIds),
    getRecentGameUids(liveResult.voidedMatchIds),
  ]);

  // Build discord username → avatar_url lookup
  const avatarByUsername = new Map<string, string>();
  for (const m of guildMembers) {
    if (m.avatar_url) {
      avatarByUsername.set(m.username.toLowerCase(), m.avatar_url);
      avatarByUsername.set(m.display_name.toLowerCase(), m.avatar_url);
    }
  }

  // Recency requirement only applies from 2026-03 onwards
  const now = new Date();
  const recencyApplies = now.getFullYear() > 2026 || (now.getFullYear() === 2026 && now.getMonth() + 1 >= 3);

  // Build standings with eligibility
  let rank = 0;
  const standings: LiveStanding[] = liveResult.rows.map((r) => {
    rank++;
    const onlineGames = r.uid ? (onlineCounts.get(r.uid) ?? 0) : 0;
    const meetsRecency = !recencyApplies ||
      onlineGames >= NO_RECENCY_GAMES ||
      onlineGames < MIN_ONLINE_GAMES ||
      (r.uid ? recentUids.has(r.uid) : false);
    const eligible =
      !r.dropped &&
      r.games >= MIN_TOTAL_GAMES &&
      onlineGames >= MIN_ONLINE_GAMES &&
      meetsRecency;

    // Match discord handle to guild member avatar
    const discordLower = r.discord?.toLowerCase().trim() || "";
    const avatar = avatarByUsername.get(discordLower) || null;

    return {
      rank,
      uid: r.uid || r.entrant_id.toString(),
      name: r.name,
      discord: r.discord,
      avatar_url: avatar,
      points: r.points,
      games: r.games,
      wins: r.wins,
      losses: r.losses,
      draws: r.draws,
      win_pct: r.win_pct,
      ow_pct: r.ow_pct,
      online_games: onlineGames,
      dropped: r.dropped,
      eligible,
      meets_recency: meetsRecency,
    };
  });

  return NextResponse.json({
    data: {
      standings,
      total_matches: liveResult.totalMatches,
      in_progress: liveResult.inProgress,
      voided: liveResult.voided,
      bracket_id: TOPDECK_BRACKET_ID,
    },
  });
}, "players/standings/live:GET");
