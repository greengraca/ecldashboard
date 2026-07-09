import type { MonthDistribution, DistributionLedger, DistributionLedgerRow } from "./types";

export const DISTRIBUTION_EPSILON = 0.01;

export type MonthNetEntry = {
  month: string;
  net: number;
  distribution: MonthDistribution | null;
};

export function rowStatus(net: number, netPaid: number): DistributionLedgerRow["status"] {
  if (netPaid <= 0) return "retained";
  if (netPaid > net + DISTRIBUTION_EPSILON) return "over";
  if (netPaid >= net - DISTRIBUTION_EPSILON) return "distributed";
  return "partial";
}

export function buildLedgerRow(entry: MonthNetEntry): DistributionLedgerRow {
  const netPaid = entry.distribution?.net_paid ?? 0;
  return {
    month: entry.month,
    net: entry.net,
    net_paid: netPaid,
    status: rowStatus(entry.net, netPaid),
    available: Math.max(0, entry.net - netPaid),
    distributed_at: entry.distribution?.distributed_at ?? null,
    distributed_by: entry.distribution?.distributed_by ?? null,
    note: entry.distribution?.note ?? null,
    cedhpt_share: entry.distribution?.cedhpt_share ?? 0,
    ca_share: entry.distribution?.ca_share ?? 0,
  };
}

export function computeLedger(entries: MonthNetEntry[]): DistributionLedger {
  const rows = entries
    .map(buildLedgerRow)
    .sort((a, b) => b.month.localeCompare(a.month));
  const availableTotal = entries.reduce(
    (sum, e) => sum + (e.net - (e.distribution?.net_paid ?? 0)),
    0
  );
  const undistributedCount = rows.filter((r) => r.available > DISTRIBUTION_EPSILON).length;
  // Only genuine over-distributions (status "over") carry a deficit — loss months
  // with no payout are just losses, already reflected in available_total.
  const carriedDeficit = rows
    .filter((r) => r.status === "over")
    .reduce((sum, r) => sum + (r.net_paid - r.net), 0);
  return {
    available_total: availableTotal,
    undistributed_count: undistributedCount,
    carried_deficit: carriedDeficit,
    months: rows,
  };
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
