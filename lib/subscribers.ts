import { fetchGuildMembers } from "./discord";
import { getDb } from "./mongodb";
import { Long } from "mongodb";
import {
  PATREON_ROLE_IDS,
  KOFI_ROLE_IDS,
  FREE_ENTRY_ROLE_IDS,
  JUDGE_ROLE_IDS,
  ECL_MOD_ROLE_IDS,
  ARENA_VANGUARD_ROLE_IDS,
  DISCORD_GUILD_ID,
  TOPDECK_BRACKET_ID,
} from "./constants";
import { fetchPublicPData } from "./topdeck-cache";
import { getHistoricalMonths, reassembleMonthDump, computeStandings } from "./topdeck";
import { getStandings } from "./players";
import { getRegisteredDiscordUsernames } from "./bracket-registration";
import type { Subscriber, SubscriberSummary, SubscriptionSource, DataHealthWarning } from "./types";

/**
 * Get game counts per discord username from dump data for a given month.
 * Loads the dump (same source as standings), computes game counts per TopDeck UID,
 * then maps UIDs to discord usernames via PublicPData for each dump's bracket_id.
 */
async function getGamesFromDump(month: string): Promise<Map<string, number>> {
  const gamesPerDiscord = new Map<string, number>();

  try {
    // Don't filter by bracket — historical months may use different bracket IDs
    const historicalMonths = await getHistoricalMonths();
    const monthInfos = historicalMonths.filter((m) => m.month === month);
    if (monthInfos.length === 0) return gamesPerDiscord;

    // Collect unique bracket IDs for this month's dumps
    const bracketIds = [...new Set(monthInfos.map((m) => m.bracket_id))];

    // Fetch PublicPData for each bracket to map TopDeck UID → discord username
    const allPublicPData: Record<string, { name?: string; discord?: string }> = {};
    const pdataResults = await Promise.all(
      bracketIds.map(bid => fetchPublicPData(bid).catch(() => ({} as Record<string, { name?: string; discord?: string }>)))
    );
    for (const pdata of pdataResults) Object.assign(allPublicPData, pdata);

    // Build TopDeck UID → game count from dump matches
    const gamesByUid = new Map<string, number>();
    const dumps = await Promise.all(monthInfos.map(mi => reassembleMonthDump(mi)));
    for (const dump of dumps) {
      const allEntrantIds = Object.keys(dump.entrant_to_uid).map(Number);
      const standings = computeStandings(dump.matches, allEntrantIds);

      for (const [eidStr, uid] of Object.entries(dump.entrant_to_uid)) {
        const stats = standings.get(Number(eidStr));
        if (stats && stats.games > 0) {
          gamesByUid.set(uid, (gamesByUid.get(uid) || 0) + stats.games);
        }
      }
    }

    // Map TopDeck UID → discord username (lowercased)
    for (const [topdeckUid, games] of gamesByUid.entries()) {
      const info = allPublicPData[topdeckUid];
      const discordHandle = info?.discord?.toLowerCase().trim();
      if (discordHandle && games > 0) {
        gamesPerDiscord.set(
          discordHandle,
          (gamesPerDiscord.get(discordHandle) || 0) + games
        );
      }
    }
  } catch (err) {
    console.error("Failed to get game counts from dump:", err);
  }

  return gamesPerDiscord;
}

function roleSetHasAny(memberRoles: string[], roleSet: Set<string>): boolean {
  return memberRoles.some((r) => roleSet.has(r));
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
        if (roleSetHasAny(roles, JUDGE_ROLE_IDS)) return "Judge";
        if (roleSetHasAny(roles, ECL_MOD_ROLE_IDS)) return "ECL Mod";
      }
      return "Manual";
  }
}

// Cache December 2025 topcut discord usernames (immutable historical data)
let decTopcut: Set<string> | null = null;

async function getDecemberTopcut(): Promise<Set<string>> {
  if (decTopcut) return decTopcut;

  try {
    const { standings } = await getStandings("2025-12");
    // Topcut = top 16 with 10+ games (eligibility threshold)
    const eligible = standings.filter((s) => s.games >= 10);

    // Map TopDeck UIDs to discord usernames via PublicPData
    const months = await getHistoricalMonths();
    const decMonths = months.filter((m) => m.month === "2025-12");
    const bracketIds = [...new Set(decMonths.map((m) => m.bracket_id))];

    const discordUsernames = new Set<string>();
    const decPdataResults = await Promise.all(
      bracketIds.map(bid => fetchPublicPData(bid).catch(() => ({} as Record<string, { name?: string; discord?: string }>)))
    );
    for (const pdata of decPdataResults) {
      for (const standing of eligible) {
        const info = pdata[standing.uid];
        if (info?.discord) {
          discordUsernames.add(info.discord.toLowerCase().trim());
        }
      }
    }

    decTopcut = discordUsernames;
    return decTopcut;
  } catch {
    return new Set();
  }
}

function hasFreeEntryRole(roles: string[]): boolean {
  return (
    roleSetHasAny(roles, FREE_ENTRY_ROLE_IDS) ||
    roleSetHasAny(roles, JUDGE_ROLE_IDS) ||
    roleSetHasAny(roles, ECL_MOD_ROLE_IDS) ||
    roleSetHasAny(roles, ARENA_VANGUARD_ROLE_IDS)
  );
}

async function detectFreeEntryReason(
  roles: string[],
  username: string,
  month: string,
  isPaidSource: boolean
): Promise<string | null> {
  // Judge/Mod — highest priority, always shown (requires role)
  if (roleSetHasAny(roles, JUDGE_ROLE_IDS)) return "Judge";
  if (roleSetHasAny(roles, ECL_MOD_ROLE_IDS)) return "Mod";

  // Topcut: January 2026 only, based on standings (no role needed)
  if (month === "2026-01") {
    const topcut = await getDecemberTopcut();
    if (topcut.has(username.toLowerCase().trim())) return "Topcut";
  }

  // Vanguard — only for January 2026
  if (month === "2026-01" && roleSetHasAny(roles, ARENA_VANGUARD_ROLE_IDS)) return "Vanguard";

  if (!hasFreeEntryRole(roles)) return null;

  // Generic fallback for paid subscribers with free entry roles
  if (isPaidSource && roleSetHasAny(roles, FREE_ENTRY_ROLE_IDS)) return "Free Entry";

  return null;
}

export async function getSubscribers(month: string): Promise<Subscriber[]> {
  const db = await getDb();
  const guildId = DISCORD_GUILD_ID;
  // guild_id may be stored as string or NumberLong — query for both
  const guildIdFilter = guildId
    ? { $in: [guildId, Long.fromString(guildId)] }
    : guildId;

  // Parse "YYYY-MM" into numeric year/month for online_games query
  const [yearNum, monthNum] = month.split("-").map(Number);

  // Fetch Discord members, DB records, and game counts in parallel
  const [members, accessRecords, freeEntries, gameCountRows, publicPData] = await Promise.all([
    fetchGuildMembers(),
    db
      .collection("subs_access")
      .find({ guild_id: guildIdFilter, month })
      .toArray(),
    db
      .collection("subs_free_entries")
      .find({ guild_id: guildIdFilter, month })
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
    accessByUser.set(rec.user_id?.toString() ?? String(rec.user_id), rec);
  }

  const freeEntryByUser = new Map<string, Record<string, unknown>>();
  for (const entry of freeEntries) {
    freeEntryByUser.set(String(entry.user_id), entry);
  }

  // Build topdeck_uid → game count from online_games
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

  // If online_games produced no matches, fall back to dump-based game counts
  // (fetches PublicPData for each historical bracket_id for accurate discord mapping)
  if (gamesPerDiscordUsername.size === 0) {
    const dumpGames = await getGamesFromDump(month);
    for (const [discord, games] of dumpGames.entries()) {
      gamesPerDiscordUsername.set(discord, games);
    }
  }

  // Helper to look up games for a Discord member by username
  function getGamesForMember(username: string): number {
    return gamesPerDiscordUsername.get(username.toLowerCase().trim()) || 0;
  }

  // Get registered players for this month (null = no filtering)
  const registeredUsernames = await getRegisteredDiscordUsernames(month);

  // Build set of Discord IDs with Ko-fi activity for this month
  const kofiActiveIds = new Set<string>();
  const [kofiEvents, kofiBackfill] = await Promise.all([
    db.collection("subs_kofi_events")
      .find({ purchase_month: month }, { projection: { user_id: 1 } })
      .toArray(),
    db.collection("dashboard_kofi_backfill")
      .find({ month }, { projection: { discord_username: 1 } })
      .toArray(),
  ]);
  for (const evt of kofiEvents) {
    kofiActiveIds.add(evt.user_id?.toString() ?? "");
  }
  // Backfill uses discord_username — resolve to IDs via guild members
  if (kofiBackfill.length > 0) {
    const backfillUsernames = new Set(
      kofiBackfill.map((b) => (b.discord_username as string).toLowerCase().trim())
    );
    for (const m of members) {
      if (backfillUsernames.has(m.username.toLowerCase().trim())) {
        kofiActiveIds.add(m.id);
      }
    }
  }

  // Build discord_id → patreon tier lookup (always — used for tier display + Gold/Diamond filtering)
  const patreonTierById = new Map<string, string>();
  const patreonSnapshots = await db
    .collection("dashboard_patreon_snapshots")
    .find({ month }, { projection: { discord_id: 1, tier: 1 } })
    .toArray();
  for (const s of patreonSnapshots) {
    const raw = s.discord_id ? s.discord_id.toString().trim() : "";
    const tier = ((s.tier as string) || "").trim();
    if (/^\d+$/.test(raw)) {
      patreonTierById.set(raw, tier);
    } else if (raw) {
      // CSV backfill: discord_id is actually a username — look up by username
      const member = members.find(
        (m) => m.username.toLowerCase() === raw.toLowerCase()
      );
      if (member) patreonTierById.set(member.id, tier);
    }
  }

  // Pre-fetch Topcut set for January 2026 so role-less topcut players get included
  const topcutUsernames = month === "2026-01" ? await getDecemberTopcut() : new Set<string>();

  const subscribers: Subscriber[] = [];
  const processedIds = new Set<string>();

  // 1) Process Discord members with subscription roles (or Topcut eligibility)
  for (const member of members) {
    let source = determineSource(member.roles);
    // Patreon snapshot overrides role-based source (dual-tag: e.g. paid + mod)
    if (source !== "patreon" && patreonTierById.has(member.id)) {
      source = "patreon";
    }
    // Topcut players without a subscription role still get free entry in Jan 2026
    if (!source && topcutUsernames.has(member.username.toLowerCase().trim())) {
      source = "free";
    }
    if (!source) continue;

    // Skip Bronze/Silver Patreon subscribers outside January (they only count in Jan)
    if (source === "patreon" && !month.endsWith("-01")) {
      const tier = patreonTierById.get(member.id) || "";
      if (tier === "Bronze" || tier === "Silver") continue;
    }

    // Skip Gold/Diamond Patreon subscribers not registered in the month's bracket
    if (source === "patreon" && registeredUsernames !== null) {
      const tier = patreonTierById.get(member.id) || "";
      if ((tier === "Gold" || tier === "Diamond") &&
          !registeredUsernames.has(member.username.toLowerCase().trim())) {
        continue;
      }
    }

    // Skip Ko-fi role holders without activity for this month
    if (source === "kofi" && !kofiActiveIds.has(member.id)) continue;

    processedIds.add(member.id);

    const accessRec = accessByUser.get(member.id);
    const gamesPlayed = getGamesForMember(member.username);

    const isPaid = source === "patreon" || source === "kofi";
    const freeReason = member.roles.length > 0
      ? await detectFreeEntryReason(member.roles, member.username, month, isPaid)
      : null;

    // Use actual Patreon tier from snapshots when available
    const tier = source === "patreon"
      ? (patreonTierById.get(member.id) || determineTier(source, member.roles))
      : determineTier(source, member.roles);

    subscribers.push({
      discord_id: member.id,
      username: member.username,
      display_name: member.display_name,
      avatar_url: member.avatar_url,
      source,
      tier,
      is_playing: gamesPlayed > 0,
      games_played: gamesPlayed,
      free_entry_reason: freeReason,
      joined_at: member.joined_at,
      expires_at: accessRec?.expires_at
        ? String(accessRec.expires_at)
        : null,
    });
  }

  // Build a lookup for Discord members by ID for step 2
  const memberById = new Map(members.map((m) => [m.id, m]));

  // 2) Check DB free entries for members without roles
  for (const [userId, freeEntry] of freeEntryByUser.entries()) {
    if (processedIds.has(userId)) continue;
    processedIds.add(userId);

    const member = memberById.get(userId);
    const dbUsername = freeEntry.discord_username as string | undefined;
    const dbDisplayName = freeEntry.discord_name as string | undefined;
    const gamesPlayed = member
      ? getGamesForMember(member.username)
      : dbUsername
        ? getGamesForMember(dbUsername)
        : 0;

    subscribers.push({
      discord_id: userId,
      username: member?.username || dbUsername || userId,
      display_name: member?.display_name || dbDisplayName || dbUsername || userId,
      avatar_url: member?.avatar_url || null,
      source: "free",
      tier: member ? determineTier("free", member.roles) : "Manual",
      is_playing: gamesPlayed > 0,
      games_played: gamesPlayed,
      free_entry_reason: null,
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
      free_entry_reason: null,
      joined_at: member?.joined_at || null,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    });
  }

  return subscribers;
}

export async function getSubscriberSummary(
  month: string
): Promise<SubscriberSummary> {
  const db = await getDb();
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

  // ─── Data health checks ───
  const warnings: DataHealthWarning[] = [];

  // Check Patreon role holders vs snapshots (both directions)
  // Bronze and Silver only count as subscribers in January
  const NON_SUBSCRIBER_TIERS = month.endsWith("-01")
    ? new Set<string>()
    : new Set(["Bronze", "Silver"]);
  const members = await fetchGuildMembers();
  const memberByUsername = new Map(members.map((m) => [m.username.toLowerCase(), m.id]));
  const patreonRoleHolderIds = new Set(
    members.filter((m) => roleSetHasAny(m.roles, PATREON_ROLE_IDS)).map((m) => m.id)
  );

  const subscriberSnapshots = await db
    .collection("dashboard_patreon_snapshots")
    .find({ month, tier: { $nin: [...NON_SUBSCRIBER_TIERS] } }, { projection: { discord_id: 1, tier: 1 } })
    .toArray();

  // Resolve snapshot discord_ids to numeric IDs (CSV backfill stores usernames)
  const snapshotDiscordIds = new Set<string>();
  for (const s of subscriberSnapshots) {
    const raw = s.discord_id?.toString().trim() ?? "";
    if (/^\d+$/.test(raw)) {
      snapshotDiscordIds.add(raw);
    } else if (raw) {
      const numericId = memberByUsername.get(raw.toLowerCase());
      if (numericId) snapshotDiscordIds.add(numericId);
    }
  }

  const roleHoldersNoSnapshot = [...patreonRoleHolderIds].filter((id) => !snapshotDiscordIds.has(id));
  const snapshotsNoRoleHolder = [...snapshotDiscordIds].filter((id) => !patreonRoleHolderIds.has(id));

  if (patreon > 0 && snapshotDiscordIds.size === 0) {
    warnings.push({
      source: "patreon",
      message: `${patreon} Patreon subscribers with roles but no snapshots synced — sync Patreon on Finance page`,
    });
  }
  if (roleHoldersNoSnapshot.length > 0) {
    warnings.push({
      source: "patreon",
      message: `${roleHoldersNoSnapshot.length} Patreon role holder${roleHoldersNoSnapshot.length > 1 ? "s" : ""} paying on Patreon but missing from snapshots — sync Patreon to resolve`,
    });
  }
  if (snapshotsNoRoleHolder.length > 0) {
    warnings.push({
      source: "patreon",
      message: `${snapshotsNoRoleHolder.length} paying Patreon subscriber${snapshotsNoRoleHolder.length > 1 ? "s" : ""} without a Patreon role on Discord — they may not have synced Patreon to Discord`,
    });
  }

  // Check Patreon subscribers without a snapshot tier (still showing generic "Patreon Member")
  const missingTier = subscribers.filter(
    (s) => s.source === "patreon" && s.tier === "Patreon Member"
  ).length;
  if (missingTier > 0) {
    warnings.push({
      source: "patreon",
      message: `${missingTier} Patreon subscriber${missingTier > 1 ? "s" : ""} without tier info — likely missing Discord link on Patreon`,
    });
  }

  // Check Ko-fi role holders vs events
  const kofiEventCount = await db
    .collection("subs_kofi_events")
    .aggregate<{ _id: null; count: number }>([
      { $match: { purchase_month: month } },
      { $group: { _id: "$user_id" } },
      { $count: "count" },
    ])
    .toArray()
    .then((r) => r[0]?.count ?? 0);
  if (kofi > 0 && kofiEventCount === 0) {
    const backfillCount = await db
      .collection("dashboard_kofi_backfill")
      .aggregate<{ _id: null; count: number }>([
        { $match: { month } },
        { $group: { _id: "$discord_username" } },
        { $count: "count" },
      ])
      .toArray()
      .then((r) => r[0]?.count ?? 0);
    if (backfillCount === 0) {
      warnings.push({
        source: "kofi",
        message: `${kofi} Ko-fi role holders but no Ko-fi events or backfill for this month`,
      });
    }
  }

  // Get registered player count from bracket
  let registeredPlayers: number | null = null;
  try {
    const regUsernames = await getRegisteredDiscordUsernames(month);
    registeredPlayers = regUsernames ? regUsernames.size : null;
  } catch {
    // ignore
  }

  return {
    total: subscribers.length,
    patreon,
    kofi,
    free,
    paying_not_playing: payingNotPlaying,
    churn: [],
    registered_players: registeredPlayers,
    data_warnings: warnings,
  };
}
