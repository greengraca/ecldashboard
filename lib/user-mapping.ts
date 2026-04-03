import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { fetchGuildMembers } from "./discord";
import type { UserMapping, TeamMemberColor } from "./types";

const COLLECTION = "dashboard_user_mapping";

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    const col = db.collection(COLLECTION);
    await col.createIndex({ discord_id: 1 }, { unique: true, name: "discord_id_unique" });
    indexesEnsured = true;
  } catch {
    indexesEnsured = true;
  }
}

export async function getAllMappings(): Promise<UserMapping[]> {
  await ensureIndexes();
  const db = await getDb();
  const mappings = await db.collection<UserMapping>(COLLECTION).find().sort({ display_name: 1 }).toArray();

  // Enrich with Discord avatar URLs
  try {
    const members = await fetchGuildMembers();
    const memberMap = new Map(members.map((m) => [m.id, m.avatar_url]));
    for (const mapping of mappings) {
      mapping.avatar_url = memberMap.get(mapping.discord_id) || null;
    }
  } catch {
    // Discord API unavailable — avatars stay null
  }

  return mappings;
}

export async function getMappingByDiscordId(discordId: string): Promise<UserMapping | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<UserMapping>(COLLECTION).findOne({ discord_id: discordId });
}

export async function getMappingByFirebaseUid(firebaseUid: string): Promise<UserMapping | null> {
  await ensureIndexes();
  const db = await getDb();
  return db.collection<UserMapping>(COLLECTION).findOne({ firebase_uid: firebaseUid });
}

export async function createMapping(
  data: {
    discord_id: string;
    discord_username: string;
    firebase_uid: string;
    display_name: string;
    color: TeamMemberColor;
  },
  userId: string,
  userName: string
): Promise<UserMapping> {
  await ensureIndexes();
  const db = await getDb();
  const now = new Date().toISOString();

  const doc: Omit<UserMapping, "_id"> = {
    ...data,
    created_at: now,
  };

  const result = await db.collection(COLLECTION).insertOne(doc);

  logActivity("create", "user_mapping", result.insertedId.toString(), {
    display_name: data.display_name,
    color: data.color,
  }, userId, userName);

  return { _id: result.insertedId, ...doc };
}

export async function updateMapping(
  id: string,
  data: Partial<{
    discord_username: string;
    firebase_uid: string;
    display_name: string;
    color: TeamMemberColor;
  }>,
  userId: string,
  userName: string
): Promise<UserMapping | null> {
  await ensureIndexes();
  const db = await getDb();

  const result = await db.collection<UserMapping>(COLLECTION).findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: "after" }
  );

  if (result) {
    logActivity("update", "user_mapping", id, data, userId, userName);
  }

  return result;
}

export async function deleteMapping(
  id: string,
  userId: string,
  userName: string
): Promise<void> {
  await ensureIndexes();
  const db = await getDb();

  const existing = await db.collection<UserMapping>(COLLECTION).findOne({ _id: new ObjectId(id) });

  await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });

  logActivity("delete", "user_mapping", id, {
    display_name: existing?.display_name,
  }, userId, userName);
}
