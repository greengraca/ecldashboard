import { getDb } from "./mongodb";
import { getMonthlySummary, getMultiMonthSummary } from "./finance";
import { logActivity } from "./activity";
import { getCurrentMonth } from "./utils";
import {
  computeLedger,
  monthsInclusive,
  monthsToDistribute,
  DISTRIBUTION_EPSILON,
  type MonthNetEntry,
} from "./distributions-math";
import type {
  MonthDistribution,
  DistributionLedger,
  DistributionLedgerRow,
} from "./types";

const DISTRIBUTION_START_MONTH = "2025-11";
const COLLECTION = "dashboard_month_distributions";

let indexesEnsured = false;
async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await getDb();
    await db.collection(COLLECTION).createIndex({ month: 1 }, { unique: true, name: "month_unique" });
    indexesEnsured = true;
  } catch {
    indexesEnsured = true;
  }
}

export async function getDistributionLedger(): Promise<DistributionLedger> {
  await ensureIndexes();
  const db = await getDb();
  const months = monthsInclusive(DISTRIBUTION_START_MONTH, getCurrentMonth());
  const [summaries, distributions] = await Promise.all([
    getMultiMonthSummary(months),
    db.collection<MonthDistribution>(COLLECTION).find({}).toArray(),
  ]);
  const distByMonth = new Map(distributions.map((d) => [d.month, d]));
  const entries: MonthNetEntry[] = summaries.map((s) => ({
    month: s.month,
    net: s.net,
    distribution: distByMonth.get(s.month) ?? null,
  }));
  return computeLedger(entries);
}

export async function distributeMonth(
  month: string,
  note: string | null,
  userId: string,
  userName: string
): Promise<DistributionLedgerRow> {
  await ensureIndexes();
  const db = await getDb();

  const summary = await getMonthlySummary(month);
  const net = summary.net;

  const existing = await db.collection<MonthDistribution>(COLLECTION).findOne({ month });
  const priorPaid = existing?.net_paid ?? 0;
  if (net - priorPaid <= DISTRIBUTION_EPSILON) {
    throw new Error("Nothing to distribute for this month");
  }

  const now = new Date().toISOString();
  const share = net / 2;
  const doc: Omit<MonthDistribution, "_id"> = {
    month,
    net_paid: net,
    cedhpt_share: share,
    ca_share: share,
    note: note ?? existing?.note ?? null,
    distributed_at: existing?.distributed_at ?? now,
    updated_at: now,
    distributed_by: userName,
  };

  await db.collection(COLLECTION).updateOne({ month }, { $set: doc }, { upsert: true });

  logActivity(
    existing ? "update" : "create",
    "distribution",
    month,
    { action: existing ? "top-up" : "distribute", net_paid: net, added: net - priorPaid },
    userId,
    userName
  );

  return {
    month,
    net,
    net_paid: net,
    status: "distributed",
    available: 0,
    distributed_at: doc.distributed_at,
    distributed_by: userName,
    note: doc.note,
    cedhpt_share: share,
    ca_share: share,
  };
}

export async function undoDistribution(
  month: string,
  userId: string,
  userName: string
): Promise<void> {
  await ensureIndexes();
  const db = await getDb();
  const existing = await db.collection<MonthDistribution>(COLLECTION).findOne({ month });
  await db.collection(COLLECTION).deleteOne({ month });
  logActivity("delete", "distribution", month, { action: "undo", net_paid: existing?.net_paid ?? 0 }, userId, userName);
}

/**
 * Bulk-distribute every undistributed month at or before `upToMonth` in one action.
 * Snapshots each month's current net into net_paid (creating or topping up), and
 * logs a single "distribute-bulk" activity entry rather than one per month.
 */
export async function distributeThrough(
  upToMonth: string,
  note: string | null,
  userId: string,
  userName: string
): Promise<DistributionLedger> {
  await ensureIndexes();
  const ledger = await getDistributionLedger();
  const { months, total } = monthsToDistribute(ledger, upToMonth);
  if (months.length === 0 || total <= DISTRIBUTION_EPSILON) {
    throw new Error("Nothing to distribute in that range");
  }

  const db = await getDb();
  const now = new Date().toISOString();
  for (const month of months) {
    const row = ledger.months.find((r) => r.month === month)!;
    const net = row.net;
    const share = net / 2;
    await db.collection(COLLECTION).updateOne(
      { month },
      {
        $set: {
          month,
          net_paid: net,
          cedhpt_share: share,
          ca_share: share,
          note: note ?? row.note ?? null,
          distributed_at: row.distributed_at ?? now,
          updated_at: now,
          distributed_by: userName,
        },
      },
      { upsert: true }
    );
  }

  logActivity(
    "create",
    "distribution",
    upToMonth,
    { action: "distribute-bulk", months, count: months.length, total },
    userId,
    userName
  );

  return getDistributionLedger();
}
