import { fetchGuildMembers } from "./discord";
import { getDb } from "./mongodb";
import {
  PATREON_ROLE_IDS,
  KOFI_ROLE_IDS,
  FREE_ENTRY_ROLE_IDS,
  JUDGE_ROLE_IDS,
  ECL_MOD_ROLE_IDS,
  DISCORD_GUILD_ID,
  TOPDECK_BRACKET_ID,
} from "./constants";
import { fetchPublicPData } from "./topdeck-cache";
import type { Subscriber, SubscriberSummary, SubscriptionSource } from "./types";

function roleSetHasAny(memberRoles: string[], roleSet: Set<number>): boolean {
  return memberRoles.some((r) => roleSet.has(Number(r)));
}

function determineSource(roles: string[]): SubscriptionSource | null {
  if (roleSetHasAny(roles, PATREON_ROLE_IDS)) return "patreon";
  if (roleSetHasAny(roles, KOFI_ROLE_IDS)) return "kofi";
  if (roleSetHasAny(roles, FREE_ENTRY_ROLE_IDS)) return "free";
  if (roleSetHasAny(roles, JUDGE_ROLE_IDS)) return "free";
  if (roleSetHasAny(roles, ECL_MOD_ROLE_IDS)) return "free";
  return null;
}

function determineTier(source: SubscriptionSource, roles?: string[]): string {
  switch (source) {
    case "patreon":
      return "Patreon Member";
    case "kofi":
      return "Ko-fi Supporter";
    case "free":
      if (roles) {
        if (roleSetHasAny(roles, JUDGE_ROLE_IDS)) return "Free Entry - Judge";
        if (roleSetHasAny(roles, ECL_MOD_ROLE_IDS)) return "Free Entry - ECL Mod";
      }
      return "Free Entry";
  }
}

export async function getSubscribers(month: string): Promise<Subscriber[]> {
  const db = await getDb();
  const guildId = DISCORD_GUILD_ID;

  // Parse "YYYY-MM" into numeric year/month for online_games query
  const [yearNum, monthNum] = month.split("-").map(Number);

  // Fetch Discord members, DB records, and game counts in parallel
  const [members, accessRecords, freeEntries, gameCountRows, publicPData] = await Promise.all([
    fetchGuildMembers(),
    db
      .collection("subs_access")
      .find({ guild_id: guildId, month })
      .toArray(),
    db
      .collection("subs_free_entries")
      .find({ guild_id: guildId, month })
      .toArray(),
    // Count games per topdeck_uid (same approach as live standings)
    db.collection("online_games").aggregate<{ _id: string; count: number }>([
      { $match: { bracket_id: TOPDECK_BRACKET_ID, year: yearNum, month: monthNum } },
      { $unwind: "$topdeck_uids" },
      { $group: { _id: "$topdeck_uids", count: { $sum: 1 } } },
    ]).toArray(),
    // Fetch PublicPData to map topdeck_uid → discord username
    (TOPDECK_BRACKET_ID
      ? fetchPublicPData(TOPDECK_BRACKET_ID).catch(() => ({}))
      : Promise.resolve({})) as Promise<Record<string, { name?: string; discord?: string }>>,
  ]);

  // Build lookup maps
  const accessByUser = new Map<string, Record<string, unknown>>();
  for (const rec of accessRecords) {
    accessByUser.set(rec.user_id, rec);
  }

  const freeEntryUserIds = new Set<string>();
  for (const entry of freeEntries) {
    freeEntryUserIds.add(entry.user_id);
  }

  // Build topdeck_uid → game count
  const gamesByTopdeckUid = new Map<string, number>();
  for (const row of gameCountRows) {
    const uid = String(row._id).trim();
    if (uid) gamesByTopdeckUid.set(uid, row.count);
  }

  // Build discord_username (lowercased) → game count via PublicPData
  const gamesPerDiscordUsername = new Map<string, number>();
  for (const [topdeckUid, info] of Object.entries(publicPData)) {
    const discordHandle = info?.discord?.toLowerCase().trim();
    if (!discordHandle) continue;
    const games = gamesByTopdeckUid.get(topdeckUid) ?? 0;
    if (games > 0) {
      // Sum in case multiple topdeck UIDs map to same discord handle
      gamesPerDiscordUsername.set(
        discordHandle,
        (gamesPerDiscordUsername.get(discordHandle) || 0) + games
      );
    }
  }

  // Helper to look up games for a Discord member by username
  function getGamesForMember(username: string): number {
    return gamesPerDiscordUsername.get(username.toLowerCase().trim()) || 0;
  }

  const subscribers: Subscriber[] = [];
  const processedIds = new Set<string>();

  // 1) Process Discord members with subscription roles
  for (const member of members) {
    const source = determineSource(member.roles);
    if (!source) continue;

    processedIds.add(member.id);

    const accessRec = accessByUser.get(member.id);
    const gamesPlayed = getGamesForMember(member.username);

    subscribers.push({
      discord_id: member.id,
      username: member.username,
      display_name: member.display_name,
      avatar_url: member.avatar_url,
      source,
      tier: determineTier(source, member.roles),
      is_playing: gamesPlayed > 0,
      games_played: gamesPlayed,
      joined_at: member.joined_at,
      expires_at: accessRec?.expires_at
        ? String(accessRec.expires_at)
        : null,
    });
  }

  // Build a lookup for Discord members by ID for step 2
  const memberById = new Map(members.map((m) => [m.id, m]));

  // 2) Check DB free entries for members without roles
  for (const userId of freeEntryUserIds) {
    if (processedIds.has(userId)) continue;
    processedIds.add(userId);

    const member = memberById.get(userId);
    const gamesPlayed = member ? getGamesForMember(member.username) : 0;

    subscribers.push({
      discord_id: userId,
      username: member?.username || userId,
      display_name: member?.display_name || userId,
      avatar_url: member?.avatar_url || null,
      source: "free",
      tier: "Free Entry",
      is_playing: gamesPlayed > 0,
      games_played: gamesPlayed,
      joined_at: member?.joined_at || null,
      expires_at: null,
    });
  }

  // 3) Check DB Ko-fi one-time passes for members without roles
  const now = new Date();
  for (const [userId, rec] of accessByUser.entries()) {
    if (processedIds.has(userId)) continue;
    if (rec.kind !== "kofi-one-time") continue;

    // Check valid time window
    const startsAt = rec.starts_at ? new Date(String(rec.starts_at)) : null;
    const expiresAt = rec.expires_at ? new Date(String(rec.expires_at)) : null;

    if (startsAt && now < startsAt) continue;
    if (expiresAt && now > expiresAt) continue;

    processedIds.add(userId);

    const member = memberById.get(userId);
    const gamesPlayed = member ? getGamesForMember(member.username) : 0;

    subscribers.push({
      discord_id: userId,
      username: member?.username || userId,
      display_name: member?.display_name || userId,
      avatar_url: member?.avatar_url || null,
      source: "kofi",
      tier: "Ko-fi One-Time",
      is_playing: gamesPlayed > 0,
      games_played: gamesPlayed,
      joined_at: member?.joined_at || null,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    });
  }

  return subscribers;
}

export async function getSubscriberSummary(
  month: string
): Promise<SubscriberSummary> {
  const subscribers = await getSubscribers(month);

  let patreon = 0;
  let kofi = 0;
  let free = 0;
  let payingNotPlaying = 0;

  for (const sub of subscribers) {
    switch (sub.source) {
      case "patreon":
        patreon++;
        break;
      case "kofi":
        kofi++;
        break;
      case "free":
        free++;
        break;
    }

    if ((sub.source === "patreon" || sub.source === "kofi") && !sub.is_playing) {
      payingNotPlaying++;
    }
  }

  return {
    total: subscribers.length,
    patreon,
    kofi,
    free,
    paying_not_playing: payingNotPlaying,
    churn: [], // Churn calculation to be implemented later
  };
}
