import { getDb } from "./mongodb";
import { fetchPublicPData } from "./topdeck-cache";
import { fetchGuildMembers } from "./discord";
import { TOPDECK_BRACKET_ID } from "./constants";
import { getHistoricalMonths } from "./topdeck";

const COLLECTION = "dashboard_player_identities";

export interface PlayerIdentity {
  discord_id: string;
  discord_username: string;
  topdeck_uid: string;
  display_name: string;
  updated_at: string;
}

/**
 * Build and persist identity mappings from PublicPData + Discord guild members.
 * Chain: PublicPData (uid → discord_username) + Guild (username → discord_id)
 */
export async function syncPlayerIdentities(): Promise<number> {
  const db = await getDb();

  // Get the current bracket's PublicPData, plus historical brackets for wider coverage
  const months = await getHistoricalMonths();
  const bracketIds = new Set<string>();
  if (TOPDECK_BRACKET_ID) bracketIds.add(TOPDECK_BRACKET_ID);
  for (const m of months) bracketIds.add(m.bracket_id);

  // Build uid → discord_username from all known brackets
  const uidToDiscord = new Map<string, string>();
  const uidToName = new Map<string, string>();
  for (const bracketId of bracketIds) {
    try {
      const pdata = await fetchPublicPData(bracketId);
      for (const [uid, info] of Object.entries(pdata)) {
        const discord = info.discord?.toLowerCase().trim();
        if (discord) uidToDiscord.set(uid, discord);
        if (info.name && !uidToName.has(uid)) uidToName.set(uid, info.name);
      }
    } catch {
      // skip brackets that fail to fetch
    }
  }

  // Build discord_username → discord_id from guild members
  let members;
  try {
    members = await fetchGuildMembers();
  } catch {
    return 0;
  }

  const usernameToMember = new Map<string, { id: string; display_name: string }>();
  for (const m of members) {
    usernameToMember.set(m.username.toLowerCase(), { id: m.id, display_name: m.display_name });
  }

  // Join: uid → discord_username → discord_id
  const now = new Date().toISOString();
  const col = db.collection(COLLECTION);
  let upserted = 0;

  for (const [uid, discordUsername] of uidToDiscord) {
    const member = usernameToMember.get(discordUsername);
    if (!member) continue;

    await col.updateOne(
      { discord_id: member.id },
      {
        $set: {
          discord_id: member.id,
          discord_username: discordUsername,
          topdeck_uid: uid,
          display_name: uidToName.get(uid) || member.display_name,
          updated_at: now,
        },
      },
      { upsert: true }
    );
    upserted++;
  }

  return upserted;
}

/**
 * Look up TopDeck uid for a discord_id. Returns null if no mapping found.
 */
export async function getUidByDiscordId(discordId: string): Promise<string | null> {
  const db = await getDb();
  const doc = await db.collection(COLLECTION).findOne({ discord_id: discordId });
  return doc?.topdeck_uid ?? null;
}

/**
 * Bulk look up TopDeck uids for a set of discord_ids.
 * Returns a Map<discord_id, topdeck_uid>.
 */
export async function getUidsByDiscordIds(discordIds: string[]): Promise<Map<string, string>> {
  if (discordIds.length === 0) return new Map();
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({ discord_id: { $in: discordIds } })
    .toArray();
  return new Map(docs.map((d) => [d.discord_id as string, d.topdeck_uid as string]));
}

/**
 * Return all discord_id → topdeck_uid mappings as a plain object.
 */
export async function getAllIdentityMappings(): Promise<Record<string, string>> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({}, { projection: { discord_id: 1, topdeck_uid: 1, _id: 0 } })
    .toArray();
  return Object.fromEntries(docs.map((d) => [d.discord_id as string, d.topdeck_uid as string]));
}

/**
 * Get total count of identity mappings.
 */
export async function getIdentityCount(): Promise<number> {
  const db = await getDb();
  return db.collection(COLLECTION).countDocuments();
}
