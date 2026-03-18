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

  const db = await getDb();
  const rates = await getRatesForMonth(month);
  const registeredIds = await getRegisteredDiscordIds(month);

  // Tiers that require bracket registration to count
  const REGISTRATION_REQUIRED_TIERS = new Set(["Gold", "Diamond"]);

  // 1. Ko-fi: count distinct user_ids (no registration filter — all Ko-fi counts)
  const kofiFromBot = await db
    .collection("subs_kofi_events")
    .aggregate<{ _id: null; count: number }>([
      { $match: { purchase_month: month } },
      { $group: { _id: "$user_id" } },
      { $count: "count" },
    ])
    .toArray()
    .then((r) => r[0]?.count ?? 0);

  // Only use backfill if bot has no data for this month (avoids double-counting)
  let totalKofi = kofiFromBot;
  if (kofiFromBot === 0) {
    const kofiBackfillCount = await db
      .collection("dashboard_kofi_backfill")
      .aggregate<{ _id: null; count: number }>([
        { $match: { month } },
        { $group: { _id: "$discord_username" } },
        { $count: "count" },
      ])
      .toArray()
      .then((r) => r[0]?.count ?? 0);
    totalKofi = kofiBackfillCount;
  }

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

  const db = await getDb();
  const rates = await getRatesForMonth(month);
  const registeredIds = await getRegisteredDiscordIds(month);

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

    for (const bracketId of bracketIds) {
      try {
        const pdata = await fetchPublicPData(bracketId);
        for (const [uid, info] of Object.entries(pdata)) {
          const discord = info.discord?.toLowerCase().trim();
          if (!discord) continue;
          const discordId = usernameToId.get(discord);
          if (discordId && !discordIdToUid.has(discordId)) {
            discordIdToUid.set(discordId, uid);
          }
        }
      } catch {
        // skip brackets that fail
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

  // ─── 2. Ko-fi: individual users ───
  const kofiFromBot = await db
    .collection("subs_kofi_events")
    .aggregate<{ _id: unknown }>([
      { $match: { purchase_month: month } },
      { $group: { _id: "$user_id" } },
    ])
    .toArray();

  type BreakdownEntry = { name: string; discord_id?: string; topdeck_uid?: string; amount: number };
  let kofiEntries: BreakdownEntry[];

  if (kofiFromBot.length > 0) {
    kofiEntries = kofiFromBot.map((k) => {
      // user_id may be BSON Long — use .toString() for safe conversion
      const id = typeof k._id === "object" && k._id !== null && "toString" in k._id
        ? (k._id as { toString(): string }).toString()
        : String(k._id);
      return {
        name: resolveName(id),
        discord_id: id,
        topdeck_uid: discordIdToUid.get(id),
        amount: rates.kofi_net,
      };
    });
  } else {
    const kofiBackfill = await db
      .collection("dashboard_kofi_backfill")
      .aggregate<{ _id: string }>([
        { $match: { month } },
        { $group: { _id: "$discord_username" } },
      ])
      .toArray();
    kofiEntries = kofiBackfill.map((k) => {
      const username = k._id.toLowerCase().trim();
      const discordId = usernameToId.get(username);
      return {
        name: k._id,
        discord_id: discordId,
        topdeck_uid: discordId ? discordIdToUid.get(discordId) : undefined,
        amount: rates.kofi_net,
      };
    });
  }
  kofiEntries.sort((a, b) => a.name.localeCompare(b.name));

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
