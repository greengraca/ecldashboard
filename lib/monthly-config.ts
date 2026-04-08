import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { getPresignedDownloadUrl } from "./r2";
import { DISCORD_GUILD_ID } from "./constants";
import type { EclMonthlyConfig } from "./types";

const COLLECTION = "ecl_monthly_config";

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    await db.collection(COLLECTION).createIndex(
      { guild_id: 1, month: 1 },
      { unique: true, name: "uniq_guild_month" }
    );
    indexesEnsured = true;
  } catch {
    indexesEnsured = true;
  }
}

export async function getMonthlyConfig(month: string): Promise<EclMonthlyConfig | null> {
  await ensureIndexes();
  const db = await getDb();
  return db
    .collection<EclMonthlyConfig>(COLLECTION)
    .findOne({ guild_id: DISCORD_GUILD_ID, month });
}

export async function upsertMonthlyConfig(
  month: string,
  updates: Partial<Pick<EclMonthlyConfig,
    "bracket_id" | "join_channel_id"
  >>,
  userId: string,
  userName: string
): Promise<EclMonthlyConfig> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();

  const setFields: Record<string, unknown> = {
    ...updates,
    modified_by: userName,
    updated_at: now,
  };

  if (updates.bracket_id) {
    setFields.bracket_id_set_by = `dashboard:${userName}`;
    setFields.bracket_id_set_at = now;
  }

  const result = await db.collection<EclMonthlyConfig>(COLLECTION).findOneAndUpdate(
    { guild_id: DISCORD_GUILD_ID, month },
    {
      $set: setFields,
      $setOnInsert: {
        guild_id: DISCORD_GUILD_ID,
        month,
        flip_status: "pending",
        flip_completed_at: null,
        flip_steps_completed: [],
        flip_error: null,
        created_by: userName,
        created_at: now,
        ...(updates.bracket_id ? {} : { bracket_id: "", bracket_id_set_by: "", bracket_id_set_at: "" }),
        ...(updates.join_channel_id ? {} : { join_channel_id: "" }),
        mostgames_prize_image_url: null,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  logActivity(
    "update",
    "league_config",
    month,
    { month, ...updates },
    userId,
    userName
  );

  return result!;
}

/**
 * Auto-fill the most games prize image URL from dashboard_prizes.
 * Returns the resolved image URL or null.
 */
export async function autoFillMostGamesImage(month: string): Promise<string | null> {
  const db = await getDb();
  const prize = await db.collection("dashboard_prizes").findOne({
    month,
    recipient_type: "most_games",
  });

  if (!prize) return null;

  if (prize.image_url) return prize.image_url as string;

  if (prize.r2_key) {
    try {
      return await getPresignedDownloadUrl(prize.r2_key as string, 86400);
    } catch {
      return null;
    }
  }

  return null;
}

export async function getFlipStatus(month: string): Promise<{
  flip_status: string;
  flip_completed_at: string | null;
  flip_steps_completed: string[];
  flip_error: string | null;
} | null> {
  const config = await getMonthlyConfig(month);
  if (!config) return null;
  return {
    flip_status: config.flip_status,
    flip_completed_at: config.flip_completed_at,
    flip_steps_completed: config.flip_steps_completed,
    flip_error: config.flip_error,
  };
}
