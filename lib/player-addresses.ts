import { getDb } from "./mongodb";
import type { PlayerAddress } from "./types";

const COLLECTION = "dashboard_player_addresses";

export async function getPlayerAddress(playerUid: string): Promise<PlayerAddress | null> {
  const db = await getDb();
  return db.collection<PlayerAddress>(COLLECTION).findOne({ player_uid: playerUid });
}

export async function getAllAddresses(): Promise<PlayerAddress[]> {
  const db = await getDb();
  return db.collection<PlayerAddress>(COLLECTION).find().toArray();
}

export async function upsertPlayerAddress(
  playerUid: string,
  data: {
    player_name: string;
    full_name: string;
    street: string;
    city: string;
    postal_code: string;
    country: string;
  },
  userId: string
): Promise<PlayerAddress> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.collection<PlayerAddress>(COLLECTION).findOneAndUpdate(
    { player_uid: playerUid },
    {
      $set: {
        ...data,
        updated_at: now,
        updated_by: userId,
      },
      $setOnInsert: {
        player_uid: playerUid,
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  return result!;
}
