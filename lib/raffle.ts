import { getDb } from "./mongodb";
import { getStandings } from "./players";
import { logActivity } from "./activity";
import type { RaffleResult, RaffleCandidate } from "./types";

const COLLECTION = "dashboard_raffle_results";

export async function getRaffleCandidates(
  month: string,
  excludeFinalists: boolean
): Promise<RaffleCandidate[]> {
  const { standings } = await getStandings(month);

  // Sort by games desc to get top 5 most-games players
  const byGames = [...standings].sort((a, b) => b.games - a.games);
  const top5 = byGames.slice(0, 5);

  // Finalists = top 2 by points (they play in the final)
  const finalistUids = new Set(standings.slice(0, 2).map((s) => s.uid));

  return top5.map((player) => ({
    player_uid: player.uid,
    player_name: player.name,
    game_count: player.games,
    excluded: excludeFinalists && finalistUids.has(player.uid),
  }));
}

export async function getRaffleResult(month: string): Promise<RaffleResult | null> {
  const db = await getDb();
  return db.collection<RaffleResult>(COLLECTION).findOne({ month });
}

export async function saveRaffleResult(
  month: string,
  data: {
    candidates: RaffleCandidate[];
    exclude_finalists: boolean;
    winner_uid: string;
    winner_name: string;
    prize_id: string | null;
  },
  userId: string,
  userName: string
): Promise<RaffleResult> {
  const db = await getDb();
  const now = new Date().toISOString();
  const doc: Omit<RaffleResult, "_id"> = {
    month,
    ...data,
    created_at: now,
    created_by: userId,
  };

  const result = await db.collection<RaffleResult>(COLLECTION).findOneAndUpdate(
    { month },
    { $set: doc },
    { upsert: true, returnDocument: "after" }
  );

  await logActivity("create", "raffle_result", month, { winner: data.winner_name }, userId, userName);
  return result!;
}
