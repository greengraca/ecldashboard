import { getDb } from "./mongodb";
import { getRatesForMonth } from "./subscription-rates";
import { fetchGuildMembers } from "./discord";
import { fetchPublicPData } from "./topdeck-cache";
import { getHistoricalMonths } from "./topdeck";
import { getRegisteredDiscordIds } from "./bracket-registration";
import { PATREON_TIER_NET, TOPDECK_BRACKET_ID } from "./constants";
import type { SubscriptionIncome, SubscriptionIncomeBreakdown } from "./types";
import type { DiscordMember } from "./types";

// Bronze/Silver only count for income in January 2026
const BRONZE_SILVER_TIERS = new Set(["Bronze", "Silver"]);
const BRONZE_SILVER_ELIGIBLE_MONTH = "2026-01";

// Nov 2025 was setup, Dec 2025 was free — zero subscription income
const ZERO_INCOME_MONTHS = new Set(["2025-11", "2025-12"]);

export async function getSubscriptionIncome(
  month: string
): Promise<SubscriptionIncome> {
  // Free month: no subscription income for any source
  if (ZERO_INCOME_MONTHS.has(month)) {
    return {
      patreon: { count: 0, amount: 0 },
      kofi: { count: 0, amount: 0 },
      manual: { count: 0, amount: 0 },
      total: 0,
    };
  }

  const [db, rates, registeredIds] = await Promise.all([
    getDb(),
    getRatesForMonth(month),
    getRegisteredDiscordIds(month),
  ]);

  // Tiers that require bracket registration to count
  const REGISTRATION_REQUIRED_TIERS = new Set(["Gold", "Diamond"]);

  // 1. Ko-fi: merge all sources (snapshots, events, backfill), deduplicate by discord_id
  const kofiIds = new Set<string>();

  const [kofiSnapshots_inc, kofiEvents_inc, kofiBackfill_inc] = await Promise.all([
    db.collection("dashboard_kofi_snapshots")
      .find({ month, cancelled_at: null }, { projection: { discord_id: 1 } })
      .toArray(),
    db.collection("subs_kofi_events")
      .aggregate<{ _id: unknown }>([
        { $match: { purchase_month: month } },
        { $group: { _id: "$user_id" } },
      ])
      .toArray(),
    db.collection("dashboard_kofi_backfill")
      .aggregate<{ _id: string }>([
        { $match: { month } },
        { $group: { _id: "$discord_username" } },
      ])
      .toArray(),
  ]);

  for (const s of kofiSnapshots_inc) {
    const id = s.discord_id?.toString() ?? "";
    if (id) kofiIds.add(id);
  }
  for (const e of kofiEvents_inc) {
    const id = typeof e._id === "object" && e._id !== null && "toString" in e._id
      ? (e._id as { toString(): string }).toString()
      : String(e._id);
    if (id) kofiIds.add(id);
  }
  // Backfill uses usernames — resolve to IDs via guild members (fetched later for breakdown)
  // For count purposes, add as-is if no other source covers them
  if (kofiSnapshots_inc.length === 0 && kofiEvents_inc.length === 0) {
    for (const b of kofiBackfill_inc) {
      kofiIds.add(b._id); // username as key — still deduped
    }
  }
  const totalKofi = kofiIds.size;

  // 2. Patreon: fetch all snapshots, filter Gold/Diamond by registration
  const allSnapshots = await db
    .collection("dashboard_patreon_snapshots")
    .find({ month })
    .toArray();

  let patreonCount = 0;
  let patreonAmount = 0;
  for (const s of allSnapshots) {
    const tier = ((s.tier as string) || "").trim();
    // Skip Bronze/Silver unless it's their eligible month
    if (BRONZE_SILVER_TIERS.has(tier) && month !== BRONZE_SILVER_ELIGIBLE_MONTH) {
      continue;
    }
    const netRate = PATREON_TIER_NET[tier];
    if (netRate === undefined) continue;

    // Only Gold/Diamond require bracket registration
    if (REGISTRATION_REQUIRED_TIERS.has(tier) && registeredIds !== null) {
      const rawDiscord = s.discord_id ? s.discord_id.toString().trim() : "";
      const isRegistered =
        (rawDiscord && registeredIds.has(rawDiscord)) ||
        (rawDiscord && registeredIds.has(rawDiscord.toLowerCase()));
      if (!isRegistered) continue;
    }

    patreonCount++;
    patreonAmount += netRate;
  }
  patreonAmount = Math.round(patreonAmount * 100) / 100;

  // 3. Manual: count from dashboard_manual_payments
  const manualCount = await db
    .collection("dashboard_manual_payments")
    .countDocuments({ month });

  const kofiAmount = Math.round(totalKofi * rates.kofi_net * 100) / 100;
  const manualAmount = Math.round(manualCount * rates.manual_net * 100) / 100;

  return {
    patreon: { count: patreonCount, amount: patreonAmount },
    kofi: { count: totalKofi, amount: kofiAmount },
    manual: { count: manualCount, amount: manualAmount },
    total: Math.round((patreonAmount + kofiAmount + manualAmount) * 100) / 100,
  };
}

export async function getSubscriptionIncomeBreakdown(
  month: string
): Promise<SubscriptionIncomeBreakdown> {
  if (ZERO_INCOME_MONTHS.has(month)) {
    return { patreon: [], kofi: [], manual: [] };
  }

  const [db, rates, registeredIds] = await Promise.all([
    getDb(),
    getRatesForMonth(month),
    getRegisteredDiscordIds(month),
  ]);

  // Tiers that require bracket registration to count
  const REGISTRATION_REQUIRED_TIERS = new Set(["Gold", "Diamond"]);

  // ─── Build lookup maps from guild members ───
  let members: DiscordMember[] = [];
  try {
    members = await fetchGuildMembers();
  } catch {
    // proceed without — links just won't resolve
  }
  // discord_id → display_name
  const idToName = new Map(members.map((m) => [m.id, m.display_name]));
  // lowercase discord_username → discord_id
  const usernameToId = new Map(members.map((m) => [m.username.toLowerCase(), m.id]));
  // lowercase display_name → discord_id (fallback for patreon_name matching)
  const displayToId = new Map(members.map((m) => [m.display_name.toLowerCase(), m.id]));

  const resolveName = (discordId: string) => idToName.get(discordId) || discordId;

  // ─── Build discord_id → topdeck_uid map from PublicPData ───
  const discordIdToUid = new Map<string, string>();
  try {
    const monthInfos = await getHistoricalMonths();
    const bracketIds = new Set<string>();
    if (TOPDECK_BRACKET_ID) bracketIds.add(TOPDECK_BRACKET_ID);
    for (const m of monthInfos) bracketIds.add(m.bracket_id);

    const pdataResults = await Promise.all(
      [...bracketIds].map(bid => fetchPublicPData(bid).catch(() => ({} as Record<string, { name?: string; discord?: string }>)))
    );
    for (const pdata of pdataResults) {
      for (const [uid, info] of Object.entries(pdata)) {
        const discord = info.discord?.toLowerCase().trim();
        if (!discord) continue;
        const discordId = usernameToId.get(discord);
        if (discordId && !discordIdToUid.has(discordId)) {
          discordIdToUid.set(discordId, uid);
        }
      }
    }
  } catch {
    // proceed without uid mapping
  }

  // ─── 1. Patreon: individual snapshots with tier + net rate ───
  const patreonSnapshots = await db
    .collection("dashboard_patreon_snapshots")
    .find({ month })
    .toArray();

  const patreonEntries = patreonSnapshots
    .map((s) => {
      const tier = (s.tier as string || "").trim();
      if (BRONZE_SILVER_TIERS.has(tier) && month !== BRONZE_SILVER_ELIGIBLE_MONTH) {
        return null;
      }
      const netRate = PATREON_TIER_NET[tier];
      if (netRate === undefined) return null;

      // Resolve discord_id — the field may be a real snowflake (API sync)
      // or a discord username string (CSV backfill). Detect by checking if it's all digits.
      let discordId: string | undefined;
      const rawDiscord = s.discord_id ? s.discord_id.toString().trim() : "";
      if (rawDiscord) {
        if (/^\d+$/.test(rawDiscord)) {
          // Real snowflake from Patreon API sync
          discordId = rawDiscord;
        } else {
          // Username from CSV backfill — look up the actual discord_id
          discordId = usernameToId.get(rawDiscord.toLowerCase()) || undefined;
        }
      }
      // Fallback: match patreon_name against guild members
      if (!discordId) {
        const patreonName = (s.patreon_name as string || "").toLowerCase().trim();
        discordId = usernameToId.get(patreonName) || displayToId.get(patreonName) || undefined;
      }

      // Only Gold/Diamond require bracket registration
      if (REGISTRATION_REQUIRED_TIERS.has(tier) && registeredIds !== null) {
        const isRegistered =
          (discordId && registeredIds.has(discordId)) ||
          (rawDiscord && registeredIds.has(rawDiscord.toLowerCase()));
        if (!isRegistered) return null;
      }

      return {
        name: (s.patreon_name as string) || (discordId ? resolveName(discordId) : "Unknown"),
        discord_id: discordId,
        topdeck_uid: discordId ? discordIdToUid.get(discordId) : undefined,
        tier,
        amount: netRate,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  // ─── 2. Ko-fi: merge all sources, deduplicate by discord_id ───
  type BreakdownEntry = { name: string; discord_id?: string; topdeck_uid?: string; amount: number };
  const kofiMap = new Map<string, BreakdownEntry>();

  const [kofiSnaps, kofiEvts, kofiBf] = await Promise.all([
    db.collection("dashboard_kofi_snapshots")
      .find({ month, cancelled_at: null }, { projection: { discord_id: 1, display_name: 1, username: 1 } })
      .toArray(),
    db.collection("subs_kofi_events")
      .aggregate<{ _id: unknown }>([
        { $match: { purchase_month: month } },
        { $group: { _id: "$user_id" } },
      ])
      .toArray(),
    db.collection("dashboard_kofi_backfill")
      .aggregate<{ _id: string }>([
        { $match: { month } },
        { $group: { _id: "$discord_username" } },
      ])
      .toArray(),
  ]);

  // Snapshots have the best name info
  for (const s of kofiSnaps) {
    const id = s.discord_id?.toString() ?? "";
    if (!id) continue;
    kofiMap.set(id, {
      name: (s.display_name as string) || (s.username as string) || resolveName(id),
      discord_id: id,
      topdeck_uid: discordIdToUid.get(id),
      amount: rates.kofi_net,
    });
  }
  // Events fill in anyone not already covered
  for (const e of kofiEvts) {
    const id = typeof e._id === "object" && e._id !== null && "toString" in e._id
      ? (e._id as { toString(): string }).toString()
      : String(e._id);
    if (!id || kofiMap.has(id)) continue;
    kofiMap.set(id, {
      name: resolveName(id),
      discord_id: id,
      topdeck_uid: discordIdToUid.get(id),
      amount: rates.kofi_net,
    });
  }
  // Backfill only if no other sources covered this month
  if (kofiSnaps.length === 0 && kofiEvts.length === 0) {
    for (const b of kofiBf) {
      const username = b._id.toLowerCase().trim();
      const discordId = usernameToId.get(username);
      const key = discordId || b._id;
      if (kofiMap.has(key)) continue;
      kofiMap.set(key, {
        name: b._id,
        discord_id: discordId,
        topdeck_uid: discordId ? discordIdToUid.get(discordId) : undefined,
        amount: rates.kofi_net,
      });
    }
  }
  const kofiEntries = [...kofiMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  // ─── 3. Manual: individual payments ───
  const manualPayments = await db
    .collection("dashboard_manual_payments")
    .find({ month })
    .toArray();

  const manualEntries = manualPayments
    .map((m) => {
      const id = (m.discord_id as string);
      return {
        name: resolveName(id),
        discord_id: id,
        topdeck_uid: discordIdToUid.get(id),
        amount: rates.manual_net,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    patreon: patreonEntries,
    kofi: kofiEntries,
    manual: manualEntries,
  };
}
