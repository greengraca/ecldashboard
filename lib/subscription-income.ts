import { getDb } from "./mongodb";
import { getRatesForMonth } from "./subscription-rates";
import { fetchGuildMembers } from "./discord";
import { PATREON_TIER_NET } from "./constants";
import type { SubscriptionIncome, SubscriptionIncomeBreakdown } from "./types";

// Bronze/Silver only count for income in January 2026
const BRONZE_SILVER_TIERS = new Set(["Bronze", "Silver"]);
const BRONZE_SILVER_ELIGIBLE_MONTH = "2026-01";

// December 2025 was a free month — zero subscription income
const FREE_MONTH = "2025-12";

export async function getSubscriptionIncome(
  month: string
): Promise<SubscriptionIncome> {
  // Free month: no subscription income for any source
  if (month === FREE_MONTH) {
    return {
      patreon: { count: 0, amount: 0 },
      kofi: { count: 0, amount: 0 },
      manual: { count: 0, amount: 0 },
      total: 0,
    };
  }

  const db = await getDb();
  const rates = await getRatesForMonth(month);

  // 1. Ko-fi: count distinct user_ids from subs_kofi_events for this month
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

  // 2. Patreon: aggregate by tier from snapshots, apply per-tier net rates
  const tierCounts = await db
    .collection("dashboard_patreon_snapshots")
    .aggregate<{ _id: string; count: number }>([
      { $match: { month } },
      {
        $group: {
          _id: { $trim: { input: "$tier" } },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  let patreonCount = 0;
  let patreonAmount = 0;
  for (const { _id: tier, count } of tierCounts) {
    // Skip Bronze/Silver unless it's their eligible month
    if (BRONZE_SILVER_TIERS.has(tier) && month !== BRONZE_SILVER_ELIGIBLE_MONTH) {
      continue;
    }
    const netRate = PATREON_TIER_NET[tier];
    if (netRate === undefined) continue; // unknown tier, skip
    patreonCount += count;
    patreonAmount += count * netRate;
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
  if (month === FREE_MONTH) {
    return { patreon: [], kofi: [], manual: [] };
  }

  const db = await getDb();
  const rates = await getRatesForMonth(month);

  // 1. Patreon: individual snapshots with tier + net rate
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
      return {
        name: (s.patreon_name as string) || s.discord_id || "Unknown",
        tier,
        amount: netRate,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Build discord ID → display name lookup
  let memberMap: Map<string, string>;
  try {
    const members = await fetchGuildMembers();
    memberMap = new Map(members.map((m) => [m.id, m.display_name]));
  } catch {
    memberMap = new Map();
  }
  const resolveName = (discordId: string) => memberMap.get(discordId) || discordId;

  // 2. Ko-fi: individual users
  const kofiFromBot = await db
    .collection("subs_kofi_events")
    .aggregate<{ _id: number }>([
      { $match: { purchase_month: month } },
      { $group: { _id: "$user_id" } },
    ])
    .toArray();

  let kofiEntries: { name: string; amount: number }[];
  if (kofiFromBot.length > 0) {
    kofiEntries = kofiFromBot.map((k) => ({
      name: resolveName(String(k._id)),
      amount: rates.kofi_net,
    }));
  } else {
    const kofiBackfill = await db
      .collection("dashboard_kofi_backfill")
      .aggregate<{ _id: string }>([
        { $match: { month } },
        { $group: { _id: "$discord_username" } },
      ])
      .toArray();
    kofiEntries = kofiBackfill.map((k) => ({
      name: k._id,
      amount: rates.kofi_net,
    }));
  }
  kofiEntries.sort((a, b) => a.name.localeCompare(b.name));

  // 3. Manual: individual payments
  const manualPayments = await db
    .collection("dashboard_manual_payments")
    .find({ month })
    .toArray();

  const manualEntries = manualPayments
    .map((m) => ({
      name: resolveName(m.discord_id as string),
      amount: rates.manual_net,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    patreon: patreonEntries,
    kofi: kofiEntries,
    manual: manualEntries,
  };
}
