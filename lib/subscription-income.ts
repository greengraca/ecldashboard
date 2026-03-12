import { getDb } from "./mongodb";
import { getRatesForMonth } from "./subscription-rates";
import type { SubscriptionIncome } from "./types";

export async function getSubscriptionIncome(
  month: string
): Promise<SubscriptionIncome> {
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

  // 2. Patreon: count from dashboard_patreon_snapshots
  const patreonCount = await db
    .collection("dashboard_patreon_snapshots")
    .countDocuments({ month });

  // 3. Manual: count from dashboard_manual_payments
  const manualCount = await db
    .collection("dashboard_manual_payments")
    .countDocuments({ month });

  return {
    patreon: {
      count: patreonCount,
      amount: Math.round(patreonCount * rates.patreon_net * 100) / 100,
    },
    kofi: {
      count: totalKofi,
      amount: Math.round(totalKofi * rates.kofi_net * 100) / 100,
    },
    manual: {
      count: manualCount,
      amount: Math.round(manualCount * rates.manual_net * 100) / 100,
    },
    total:
      Math.round(
        (patreonCount * rates.patreon_net +
          totalKofi * rates.kofi_net +
          manualCount * rates.manual_net) *
          100
      ) / 100,
  };
}
