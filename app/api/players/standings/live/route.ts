import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";
import { fetchLiveStandings } from "@/lib/topdeck-live";
import { fetchGuildMembers } from "@/lib/discord";
import { getDb } from "@/lib/mongodb";
import { TOPDECK_BRACKET_ID, TOP16_MIN_ONLINE_GAMES, TOP16_MIN_TOTAL_GAMES, TOP16_NO_RECENCY_GAMES, TOP16_RECENCY_AFTER_DAY } from "@/lib/constants";
import type { LiveStanding } from "@/lib/types";

const MIN_ONLINE_GAMES = TOP16_MIN_ONLINE_GAMES;
const MIN_TOTAL_GAMES = TOP16_MIN_TOTAL_GAMES;
const NO_RECENCY_GAMES = TOP16_NO_RECENCY_GAMES;
const RECENCY_AFTER_DAY = TOP16_RECENCY_AFTER_DAY;

async function getOnlineGameCounts(): Promise<Map<string, number>> {
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const pipeline = [
    {
      $match: {
        bracket_id: TOPDECK_BRACKET_ID,
        year,
        month,
        online: true,
      },
    },
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
async function getRecentGameUids(): Promise<Set<string>> {
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const cutoffTs = new Date(Date.UTC(year, month - 1, RECENCY_AFTER_DAY)).getTime() / 1000;

  const pipeline = [
    {
      $match: {
        bracket_id: TOPDECK_BRACKET_ID,
        year,
        month,
        online: true,
        start_ts: { $gte: cutoffTs },
      },
    },
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

export async function GET(request: NextRequest) {
  try {
    const [liveResult, onlineCounts, recentUids, guildMembers] = await Promise.all([
      fetchLiveStandings(),
      getOnlineGameCounts(),
      getRecentGameUids(),
      fetchGuildMembers(),
    ]);

    // Build discord username → avatar_url lookup
    const avatarByUsername = new Map<string, string>();
    for (const m of guildMembers) {
      if (m.avatar_url) {
        avatarByUsername.set(m.username.toLowerCase(), m.avatar_url);
        avatarByUsername.set(m.display_name.toLowerCase(), m.avatar_url);
      }
    }

    // Build standings with eligibility
    let rank = 0;
    const standings: LiveStanding[] = liveResult.rows.map((r) => {
      rank++;
      const onlineGames = r.uid ? (onlineCounts.get(r.uid) ?? 0) : 0;
      // Recency: 20+ online games skip check, 10-19 need a game after day 20
      const meetsRecency =
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
  } catch (err) {
    console.error("GET /api/players/standings/live error:", err);
    logApiError("players/standings/live:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch live standings" },
      { status: 500 }
    );
  }
}
