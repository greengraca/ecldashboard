import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { fetchLiveStandings } from "@/lib/topdeck-live";
import { fetchGuildMembers } from "@/lib/discord";
import { getDb } from "@/lib/mongodb";
import { TOP16_RECENCY_AFTER_DAY } from "@/lib/constants";
import { isTop16Eligible } from "@/lib/top16-eligibility";
import { getBracketIdForMonth } from "@/lib/bracket-ids";
import { getCurrentMonth } from "@/lib/utils";
import type { LiveStanding } from "@/lib/types";

/** UIDs that have at least one game (any source) on or after the recency cutoff day. */
async function getRecentGameUids(bracketId: string, voidedMatchIds: { season: number; table: number }[]): Promise<Set<string>> {
  const db = await getDb();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const cutoffTs = new Date(Date.UTC(year, month - 1, TOP16_RECENCY_AFTER_DAY)).getTime() / 1000;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matchFilter: Record<string, any> = {
    bracket_id: bracketId,
    year,
    month,
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
  const bracketId = await getBracketIdForMonth(getCurrentMonth());

  const [liveResult, guildMembers] = await Promise.all([
    fetchLiveStandings(bracketId),
    fetchGuildMembers(),
  ]);

  const recentUids = await getRecentGameUids(bracketId, liveResult.voidedMatchIds);

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
  const recencyApplies =
    now.getFullYear() > 2026 || (now.getFullYear() === 2026 && now.getMonth() + 1 >= 3);
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Build standings with eligibility via the shared predicate (always current month → new rule)
  let rank = 0;
  const standings: LiveStanding[] = liveResult.rows.map((r) => {
    rank++;
    const hasRecent = r.uid ? recentUids.has(r.uid) : false;
    const eligible = isTop16Eligible({
      month,
      dropped: r.dropped,
      totalGames: r.games,
      onlineGames: 0, // ignored by the total-games rule
      recencyApplies,
      hasRecent,
    });

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
      dropped: r.dropped,
      eligible,
      // "meets_recency" now means "no recency check needed (auto-pass) OR has a recent game"
      meets_recency: !recencyApplies || r.games >= 20 || hasRecent,
    };
  });

  return NextResponse.json({
    data: {
      standings,
      total_matches: liveResult.totalMatches,
      in_progress: liveResult.inProgress,
      voided: liveResult.voided,
      bracket_id: bracketId,
    },
  });
}, "players/standings/live:GET");
