import { getDb } from "./mongodb";
import { getMultiMonthSummary } from "./finance";
import { logActivity } from "./activity";
import { getCurrentMonth, getPreviousMonth } from "./utils";
import {
  computeLedger,
  monthsInclusive,
  monthsToDistribute,
  DISTRIBUTION_EPSILON,
  type MonthNetEntry,
} from "./distributions-math";
import type { MonthDistribution, DistributionLedger } from "./types";

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

/**
 * The distributable pool is COMPLETED months only (Nov 2025 .. last month). The
 * current in-progress month is surfaced separately as `current_month` and is NOT part
 * of the balance, count, or any distribute action.
 */
export async function getDistributionLedger(): Promise<DistributionLedger> {
  await ensureIndexes();
  const db = await getDb();
  const current = getCurrentMonth();
  const lastCompleted = getPreviousMonth(current);
  const completedMonths = monthsInclusive(DISTRIBUTION_START_MONTH, lastCompleted);
  const allMonths = [...completedMonths, current];

  const [summaries, distributions] = await Promise.all([
    getMultiMonthSummary(allMonths),
    db.collection<MonthDistribution>(COLLECTION).find({}).toArray(),
  ]);
  const netByMonth = new Map(summaries.map((s) => [s.month, s.net]));
  const distByMonth = new Map(distributions.map((d) => [d.month, d]));

  const entries: MonthNetEntry[] = completedMonths.map((m) => ({
    month: m,
    net: netByMonth.get(m) ?? 0,
    distribution: distByMonth.get(m) ?? null,
  }));

  const ledger = computeLedger(entries);
  ledger.current_month = { month: current, net: netByMonth.get(current) ?? 0 };
  return ledger;
}

/**
 * Distribute the true NET of every not-yet-settled COMPLETED month up to `upToMonth`,
 * in one cumulative action — profits and losses net together. Settles each month
 * (net_paid = net) so the settled range stays a contiguous prefix and losses can never
 * strand.
 */
export async function distributeThrough(
  upToMonth: string,
  note: string | null,
  userId: string,
  userName: string
): Promise<DistributionLedger> {
  await ensureIndexes();
  if (upToMonth >= getCurrentMonth()) {
    throw new Error("The current month is still in progress — distribute completed months only");
  }

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
    { action: "distribute-through", months, count: months.length, total },
    userId,
    userName
  );

  return getDistributionLedger();
}

/**
 * Roll the distribution watermark back to before `month`: un-settle `month` and every
 * later month, keeping the settled range a contiguous prefix.
 */
export async function undoFrom(
  month: string,
  userId: string,
  userName: string
): Promise<DistributionLedger> {
  await ensureIndexes();
  const db = await getDb();
  const removed = await db
    .collection<MonthDistribution>(COLLECTION)
    .find({ month: { $gte: month } })
    .toArray();
  await db.collection(COLLECTION).deleteMany({ month: { $gte: month } });
  logActivity(
    "delete",
    "distribution",
    month,
    { action: "undo-from", months: removed.map((r) => r.month), count: removed.length },
    userId,
    userName
  );
  return getDistributionLedger();
}
