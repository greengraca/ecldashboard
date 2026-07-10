import type { MonthDistribution, DistributionLedger, DistributionLedgerRow, DistributionEvent } from "./types";

export const DISTRIBUTION_EPSILON = 0.01;

export type MonthNetEntry = {
  month: string;
  net: number;
  distribution: MonthDistribution | null;
};

export function rowStatus(
  net: number,
  netPaid: number,
  hasRecord: boolean
): DistributionLedgerRow["status"] {
  if (!hasRecord) return "retained";
  if (netPaid > net + DISTRIBUTION_EPSILON) return "over";
  // Fully accounted: a positive month is "distributed", a loss settled at its
  // (negative) net is "settled".
  if (Math.abs(netPaid - net) <= DISTRIBUTION_EPSILON) return net > 0 ? "distributed" : "settled";
  return "partial";
}

export function buildLedgerRow(entry: MonthNetEntry): DistributionLedgerRow {
  const netPaid = entry.distribution?.net_paid ?? 0;
  return {
    month: entry.month,
    net: entry.net,
    net_paid: netPaid,
    status: rowStatus(entry.net, netPaid, entry.distribution != null),
    available: Math.max(0, entry.net - netPaid),
    distributed_at: entry.distribution?.distributed_at ?? null,
    distributed_by: entry.distribution?.distributed_by ?? null,
    note: entry.distribution?.note ?? null,
    cedhpt_share: entry.distribution?.cedhpt_share ?? 0,
    ca_share: entry.distribution?.ca_share ?? 0,
  };
}

/**
 * The distribution watermark: the latest month such that every completed month up
 * to and including it is settled (distributed or a settled loss). Stops at the first
 * gap, so it's robust even if records aren't a clean prefix.
 */
export function distributedThrough(rows: DistributionLedgerRow[]): string | null {
  const asc = [...rows].sort((a, b) => a.month.localeCompare(b.month));
  let through: string | null = null;
  for (const r of asc) {
    if (r.status === "distributed" || r.status === "settled") through = r.month;
    else break;
  }
  return through;
}

/** Build the ledger from COMPLETED months only. current_month is filled in by the caller. */
export function computeLedger(entries: MonthNetEntry[]): DistributionLedger {
  const rows = entries
    .map(buildLedgerRow)
    .sort((a, b) => b.month.localeCompare(a.month));
  const availableTotal = entries.reduce(
    (sum, e) => sum + (e.net - (e.distribution?.net_paid ?? 0)),
    0
  );
  // Pending (not-yet-settled) months — any residual net, profit OR loss.
  const undistributedCount = rows.filter(
    (r) => Math.abs(r.net - r.net_paid) > DISTRIBUTION_EPSILON
  ).length;
  // Only genuine over-distributions (status "over") carry a deficit — loss months
  // with no payout are just losses, already reflected in available_total.
  const carriedDeficit = rows
    .filter((r) => r.status === "over")
    .reduce((sum, r) => sum + (r.net_paid - r.net), 0);
  return {
    available_total: availableTotal,
    undistributed_count: undistributedCount,
    carried_deficit: carriedDeficit,
    distributed_through: distributedThrough(rows),
    current_month: null,
    months: rows,
  };
}

/** Not-yet-settled months (any residual net, profit OR loss), ascending. */
export function undistributedMonths(ledger: DistributionLedger): string[] {
  return ledger.months
    .filter((r) => Math.abs(r.net - r.net_paid) > DISTRIBUTION_EPSILON)
    .map((r) => r.month)
    .sort();
}

/**
 * Selection for a bulk "distribute up to <upToMonth>" action: every not-yet-settled
 * month at or before the cutoff — profits AND losses — and their combined **net**
 * total (losses net against profits). Matches `available_total` for the same range,
 * so the headline and the bulk button always agree.
 */
export function monthsToDistribute(
  ledger: DistributionLedger,
  upToMonth: string
): { months: string[]; total: number; count: number } {
  const rows = ledger.months.filter(
    (r) => Math.abs(r.net - r.net_paid) > DISTRIBUTION_EPSILON && r.month <= upToMonth
  );
  const months = rows.map((r) => r.month).sort();
  const total = rows.reduce((sum, r) => sum + (r.net - r.net_paid), 0);
  return { months, total, count: months.length };
}

/**
 * Group settled months into payout EVENTS by their shared `distributed_at`, so a single
 * "distribute up to [month]" action shows as ONE payout (its net total), not one per month.
 * Each event reports the total paid and the latest month it covered.
 */
export function distributionEvents(rows: DistributionLedgerRow[]): DistributionEvent[] {
  const byTime = new Map<string, { months: string[]; total: number }>();
  for (const r of rows) {
    const settled = r.status === "distributed" || r.status === "settled" || r.status === "over";
    if (!settled || !r.distributed_at) continue;
    const g = byTime.get(r.distributed_at) ?? { months: [], total: 0 };
    g.months.push(r.month);
    g.total += r.net_paid;
    byTime.set(r.distributed_at, g);
  }
  const events: DistributionEvent[] = [];
  for (const [paid_at, g] of byTime) {
    const sorted = [...g.months].sort();
    events.push({ paid_at, through: sorted[sorted.length - 1], from: sorted[0], total: g.total, months: sorted });
  }
  return events.sort((a, b) => a.through.localeCompare(b.through));
}

/** Inclusive list of "YYYY-MM" from start to end. */
export function monthsInclusive(start: string, end: string): string[] {
  const idx = (m: string) => {
    const [y, mo] = m.split("-").map(Number);
    return y * 12 + (mo - 1);
  };
  const out: string[] = [];
  for (let i = idx(start); i <= idx(end); i++) {
    out.push(`${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`);
  }
  return out;
}
