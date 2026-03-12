import { NextResponse } from "next/server";
import { fetchLiveStandings } from "@/lib/topdeck-live";
import { getDb } from "@/lib/mongodb";
import { TOPDECK_BRACKET_ID } from "@/lib/constants";
import type { LiveStanding } from "@/lib/types";

const MIN_ONLINE_GAMES = 10;
const MIN_TOTAL_GAMES = 10;

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

export async function GET() {
  try {
    const [rows, onlineCounts] = await Promise.all([
      fetchLiveStandings(),
      getOnlineGameCounts(),
    ]);

    // Build standings with eligibility
    let rank = 0;
    const standings: LiveStanding[] = rows.map((r) => {
      rank++;
      const onlineGames = r.uid ? (onlineCounts.get(r.uid) ?? 0) : 0;
      const eligible =
        !r.dropped &&
        r.games >= MIN_TOTAL_GAMES &&
        onlineGames >= MIN_ONLINE_GAMES;

      return {
        rank,
        uid: r.uid || r.entrant_id.toString(),
        name: r.name,
        discord: r.discord,
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
      };
    });

    return NextResponse.json({ data: { standings } });
  } catch (err) {
    console.error("GET /api/players/standings/live error:", err);
    return NextResponse.json(
      { error: "Failed to fetch live standings" },
      { status: 500 }
    );
  }
}
