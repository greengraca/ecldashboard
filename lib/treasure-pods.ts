import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { DISCORD_GUILD_ID } from "./constants";
import type {
  TreasurePodSchedule,
  TreasurePod,
  TreasurePodClaim,
  TreasurePodData,
  TreasurePodTypeStat,
  TreasurePodWithClaim,
} from "./types";

const CLAIMS_COLLECTION = "dashboard_treasure_pod_claims";

export async function getTreasurePodData(month: string): Promise<TreasurePodData> {
  const db = await getDb();
  const guildId = DISCORD_GUILD_ID;

  const [schedule, pods, claims] = await Promise.all([
    db.collection<TreasurePodSchedule>("treasure_pod_schedule").findOne({ guild_id: guildId, month }),
    db.collection<TreasurePod>("treasure_pods").find({ guild_id: guildId, month }).toArray(),
    db.collection<TreasurePodClaim>(CLAIMS_COLLECTION).find({ month }).toArray(),
  ]);

  // Join claims onto pods
  const claimsByPodId = new Map(claims.map((c) => [c.treasure_pod_id, c]));
  const podsWithClaims: TreasurePodWithClaim[] = pods.map((pod) => ({
    ...pod,
    claim: claimsByPodId.get(String(pod._id)) || null,
  }));

  // Compute per-type stats
  const stats: TreasurePodTypeStat[] = [];
  if (schedule) {
    for (const config of schedule.pod_types_config) {
      const typePods = pods.filter((p) => p.pod_type === config.type);
      const typeClaims = claims.filter((c) => c.pod_type === config.type);
      stats.push({
        type: config.type,
        title: config.title,
        total: config.count,
        triggered: typePods.filter((p) => p.status !== "draw").length,
        won: typePods.filter((p) => p.status === "won").length,
        claimed: typeClaims.length,
      });
    }
  }

  return { schedule, pods: podsWithClaims, stats };
}

export async function claimTreasurePod(
  podId: string,
  data: {
    pod_type: string;
    month: string;
    friend_discord_id?: string | null;
    friend_name?: string | null;
    notes?: string | null;
  },
  userId: string,
  userName: string
): Promise<TreasurePodClaim> {
  const db = await getDb();

  // Validate pod exists and is won
  const pod = await db.collection<TreasurePod>("treasure_pods").findOne({ _id: new ObjectId(podId) });
  if (!pod) throw new Error("Pod not found");
  if (pod.status !== "won") throw new Error("Pod has not been won");

  // Check not already claimed
  const existing = await db.collection<TreasurePodClaim>(CLAIMS_COLLECTION).findOne({ treasure_pod_id: podId });
  if (existing) throw new Error("Pod already claimed");

  const now = new Date().toISOString();
  const doc: Omit<TreasurePodClaim, "_id"> = {
    treasure_pod_id: podId,
    month: data.month,
    pod_type: data.pod_type,
    claimed_at: now,
    claimed_by: userName,
    friend_discord_id: data.friend_discord_id || null,
    friend_name: data.friend_name || null,
    notes: data.notes || null,
  };

  const result = await db.collection(CLAIMS_COLLECTION).insertOne(doc);

  await logActivity("create", "treasure_pod_claim", podId, {
    pod_type: data.pod_type,
    winner: pod.winner_discord_handle,
    friend_name: data.friend_name || null,
  }, userId, userName);

  return { _id: result.insertedId, ...doc };
}

export async function unclaimTreasurePod(
  podId: string,
  userId: string,
  userName: string
): Promise<void> {
  const db = await getDb();

  const claim = await db.collection<TreasurePodClaim>(CLAIMS_COLLECTION).findOne({ treasure_pod_id: podId });
  if (!claim) throw new Error("No claim found for this pod");

  await db.collection(CLAIMS_COLLECTION).deleteOne({ treasure_pod_id: podId });

  await logActivity("delete", "treasure_pod_claim", podId, {
    pod_type: claim.pod_type,
  }, userId, userName);
}
