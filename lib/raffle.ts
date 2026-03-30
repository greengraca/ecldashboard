import { getDb } from "./mongodb";
import { getPlayers } from "./players";
import { fetchLiveStandings } from "./topdeck-live";
import { getCurrentMonth } from "./utils";
import { logActivity } from "./activity";
import type { RaffleResult, RaffleCandidate } from "./types";

const COLLECTION = "dashboard_raffle_results";

export async function getRaffleCandidates(
  month: string,
  excludeFinalists: boolean
): Promise<RaffleCandidate[]> {
  const db = await getDb();

  // Current month uses live data, past months use dumps
  let allPlayers: { uid: string; name: string; games: number }[];
  if (month === getCurrentMonth()) {
    const live = await fetchLiveStandings();
    allPlayers = live.rows
      .filter((r) => r.uid && !r.dropped)
      .map((r) => ({ uid: r.uid!, name: r.name, games: r.games }));
  } else {
    const { players } = await getPlayers(month);
    allPlayers = players.map((p) => ({ uid: p.uid, name: p.name, games: p.games }));
  }
  if (allPlayers.length === 0) return [];

  // Sort all players by games desc, take top 5
  const byGames = [...allPlayers].sort((a, b) => b.games - a.games);
  const top5 = byGames.slice(0, 5);

  // Finalists = top 4 from bracket results (top4 cut after top16 cut)
  let finalistUids = new Set<string>();
  if (excludeFinalists) {
    const bracketResults = await db.collection("dashboard_bracket_results").findOne({ month });
    const top4Order: Array<{ uid: string }> = bracketResults?.top4_order || [];
    finalistUids = new Set(top4Order.map((p) => p.uid));
  }

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

export async function getRaffleResults(month: string): Promise<RaffleResult[]> {
  const db = await getDb();
  return db.collection<RaffleResult>(COLLECTION).find({ month }).toArray();
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

  // Key by month+prize_id so each prize gets its own result
  const filter = data.prize_id ? { month, prize_id: data.prize_id } : { month };
  const result = await db.collection<RaffleResult>(COLLECTION).findOneAndUpdate(
    filter,
    { $set: doc },
    { upsert: true, returnDocument: "after" }
  );

  await logActivity("create", "raffle_result", month, { winner: data.winner_name, prize_id: data.prize_id }, userId, userName);
  return result!;
}

export async function deleteRaffleResult(
  month: string,
  userId: string,
  userName: string,
  prizeId?: string
): Promise<void> {
  const db = await getDb();
  const filter = prizeId ? { month, prize_id: prizeId } : { month };
  await db.collection<RaffleResult>(COLLECTION).deleteMany(filter);
  await logActivity("delete", "raffle_result", month, { prize_id: prizeId || "all" }, userId, userName);
}
