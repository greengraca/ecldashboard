import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { DISCORD_GUILD_ID } from "./constants";

const COLLECTION = "dashboard_feature_flags";

export interface FeatureFlags {
  lfgelo_enabled: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  lfgelo_enabled: false,
};

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    await db.collection(COLLECTION).createIndex(
      { guild_id: 1 },
      { unique: true, name: "uniq_guild" }
    );
    indexesEnsured = true;
  } catch {
    indexesEnsured = true;
  }
}

/**
 * Returns the current feature flags for the guild.
 * Falls back to DEFAULT_FLAGS for any missing values, so adding new flags
 * later doesn't require a migration.
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  await ensureIndexes();
  const db = await getDb();
  const doc = await db
    .collection(COLLECTION)
    .findOne({ guild_id: DISCORD_GUILD_ID });

  return {
    ...DEFAULT_FLAGS,
    ...(doc?.flags ?? {}),
  };
}

/**
 * Set a single flag value. Upserts the guild's doc.
 */
export async function setFeatureFlag<K extends keyof FeatureFlags>(
  key: K,
  value: FeatureFlags[K],
  userId: string,
  userName: string
): Promise<FeatureFlags> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();

  await db.collection(COLLECTION).updateOne(
    { guild_id: DISCORD_GUILD_ID },
    {
      $set: {
        [`flags.${key}`]: value,
        updated_by: userName,
        updated_at: now,
      },
      $setOnInsert: {
        guild_id: DISCORD_GUILD_ID,
        created_by: userName,
        created_at: now,
      },
    },
    { upsert: true }
  );

  logActivity(
    "update",
    "feature_flag",
    key,
    { key, value },
    userId,
    userName
  );

  return getFeatureFlags();
}
