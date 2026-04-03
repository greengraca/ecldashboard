import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { DISCORD_GUILD_ID } from "./constants";
import type { TreasurePodMonthlyConfig, TreasurePodTypeConfig } from "./types";

const COLLECTION = "dashboard_treasure_pod_config";

export async function getTreasurePodConfig(
  month: string
): Promise<TreasurePodMonthlyConfig | null> {
  const db = await getDb();
  return db
    .collection<TreasurePodMonthlyConfig>(COLLECTION)
    .findOne({ guild_id: DISCORD_GUILD_ID, month });
}

export async function upsertTreasurePodConfig(
  month: string,
  data: {
    pod_types: TreasurePodTypeConfig[];
    games_per_player: number;
    notes?: string;
  },
  userId: string,
  userName: string
): Promise<TreasurePodMonthlyConfig> {
  const db = await getDb();
  const now = new Date().toISOString();

  const result = await db.collection<TreasurePodMonthlyConfig>(COLLECTION).findOneAndUpdate(
    { guild_id: DISCORD_GUILD_ID, month },
    {
      $set: {
        pod_types: data.pod_types,
        games_per_player: data.games_per_player,
        notes: data.notes ?? "",
        modified_by: userName,
        updated_at: now,
      },
      $setOnInsert: {
        guild_id: DISCORD_GUILD_ID,
        month,
        status: "draft" as const,
        created_by: userName,
        created_at: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  logActivity(
    "update",
    "treasure_pod_config",
    month,
    {
      pod_types_count: data.pod_types.length,
      total_pods: data.pod_types.reduce((s, t) => s + t.count, 0),
    },
    userId,
    userName
  );

  return result!;
}

export async function activateTreasurePodConfig(
  month: string,
  userId: string,
  userName: string
): Promise<TreasurePodMonthlyConfig | null> {
  const db = await getDb();
  const now = new Date().toISOString();

  const result = await db
    .collection<TreasurePodMonthlyConfig>(COLLECTION)
    .findOneAndUpdate(
      { guild_id: DISCORD_GUILD_ID, month },
      { $set: { status: "active", modified_by: userName, updated_at: now } },
      { returnDocument: "after" }
    );

  if (result) {
    logActivity(
      "update",
      "treasure_pod_config",
      month,
      { action: "activate" },
      userId,
      userName
    );
  }

  return result;
}

export async function copyConfigFromMonth(
  sourceMonth: string,
  targetMonth: string,
  userId: string,
  userName: string
): Promise<TreasurePodMonthlyConfig | null> {
  const source = await getTreasurePodConfig(sourceMonth);
  if (!source) return null;

  return upsertTreasurePodConfig(
    targetMonth,
    {
      pod_types: source.pod_types,
      games_per_player: source.games_per_player,
      notes: "",
    },
    userId,
    userName
  );
}
