import { fetchGuildMembers } from "./discord";
import { getDb } from "./mongodb";
import {
  PATREON_ROLE_IDS,
  KOFI_ROLE_IDS,
  FREE_ENTRY_ROLE_IDS,
  DISCORD_GUILD_ID,
} from "./constants";
import type { Subscriber, SubscriberSummary, SubscriptionSource } from "./types";

function roleSetHasAny(memberRoles: string[], roleSet: Set<number>): boolean {
  return memberRoles.some((r) => roleSet.has(Number(r)));
}

function determineSource(roles: string[]): SubscriptionSource | null {
  if (roleSetHasAny(roles, PATREON_ROLE_IDS)) return "patreon";
  if (roleSetHasAny(roles, KOFI_ROLE_IDS)) return "kofi";
  if (roleSetHasAny(roles, FREE_ENTRY_ROLE_IDS)) return "free";
  return null;
}

function determineTier(source: SubscriptionSource): string {
  switch (source) {
    case "patreon":
      return "Patreon Member";
    case "kofi":
      return "Ko-fi Supporter";
    case "free":
      return "Free Entry";
  }
}

export async function getSubscribers(month: string): Promise<Subscriber[]> {
  const db = await getDb();
  const guildId = DISCORD_GUILD_ID;

  // Fetch Discord members and DB records in parallel
  const [members, accessRecords, freeEntries, games] = await Promise.all([
    fetchGuildMembers(),
    db
      .collection("subs_access")
      .find({ guild_id: guildId, month })
      .toArray(),
    db
      .collection("subs_free_entries")
      .find({ guild_id: guildId, month })
      .toArray(),
    db
      .collection("online_games")
      .find({ month })
      .toArray(),
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

  // Count games per entrant. entrant_ids contains Discord user IDs.
  const gamesPerUser = new Map<string, number>();
  for (const game of games) {
    const entrants: string[] = game.entrant_ids || [];
    for (const uid of entrants) {
      gamesPerUser.set(uid, (gamesPerUser.get(uid) || 0) + 1);
    }
  }

  const subscribers: Subscriber[] = [];
  const processedIds = new Set<string>();

  // 1) Process Discord members with subscription roles
  for (const member of members) {
    const source = determineSource(member.roles);
    if (!source) continue;

    processedIds.add(member.id);

    const accessRec = accessByUser.get(member.id);
    const gamesPlayed = gamesPerUser.get(member.id) || 0;

    subscribers.push({
      discord_id: member.id,
      username: member.username,
      display_name: member.display_name,
      avatar_url: member.avatar_url,
      source,
      tier: determineTier(source),
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
    const gamesPlayed = gamesPerUser.get(userId) || 0;

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
    const gamesPlayed = gamesPerUser.get(userId) || 0;

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
