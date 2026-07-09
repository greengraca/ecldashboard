/**
 * Verification for the pure distribution ledger math in lib/distributions-math.ts.
 * No DB — deterministic assertions over hand-built inputs.
 * Run with: npx tsx scripts/verify-distributions.ts
 */
import { computeLedger, rowStatus, monthsInclusive, undistributedMonths, monthsToDistribute, type MonthNetEntry } from "../lib/distributions-math";
import type { MonthDistribution } from "../lib/types";

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}
const approx = (a: number, b: number) => Math.abs(a - b) < 0.001;

function dist(month: string, net_paid: number): MonthDistribution {
  return {
    month, net_paid, cedhpt_share: net_paid / 2, ca_share: net_paid / 2,
    note: null, distributed_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z", distributed_by: "test",
  };
}

// rowStatus
check("retained when nothing paid", rowStatus(280, 0) === "retained");
check("distributed when paid == net", rowStatus(280, 280) === "distributed");
check("distributed within epsilon", rowStatus(280, 279.995) === "distributed");
check("partial when 0<paid<net", rowStatus(310, 280) === "partial");
check("over when paid>net", rowStatus(280, 310) === "over");
check("retained for loss month", rowStatus(-50, 0) === "retained");

// computeLedger
const entries: MonthNetEntry[] = [
  { month: "2026-04", net: 280, distribution: null },
  { month: "2026-05", net: 310, distribution: dist("2026-05", 310) },
  { month: "2026-06", net: 310, distribution: dist("2026-06", 280) },
  { month: "2026-03", net: -50, distribution: null },
];
const ledger = computeLedger(entries);
check("available_total nets loss & partial (=260)", approx(ledger.available_total, 260));
check("undistributed_count = 2 (Apr + Jun)", ledger.undistributed_count === 2);
check("rows sorted desc by month", ledger.months[0].month === "2026-06" && ledger.months[3].month === "2026-03");
const apr = ledger.months.find((r) => r.month === "2026-04")!;
check("retained row available == net", approx(apr.available, 280) && apr.status === "retained");
const jun = ledger.months.find((r) => r.month === "2026-06")!;
check("partial row available == outstanding (30)", approx(jun.available, 30) && jun.status === "partial");
const mar = ledger.months.find((r) => r.month === "2026-03")!;
check("loss row available floored to 0", approx(mar.available, 0) && mar.status === "retained");
check("no carried_deficit when none over", approx(ledger.carried_deficit, 0));

// over-distribution → carried deficit
const overLedger = computeLedger([
  { month: "2026-02", net: 100, distribution: dist("2026-02", 130) },
  { month: "2026-01", net: 200, distribution: dist("2026-01", 150) }, // partial, not over
]);
check("over month status is over", overLedger.months.find((r) => r.month === "2026-02")!.status === "over");
check("carried_deficit sums only over amount (=30)", approx(overLedger.carried_deficit, 30));
check("over row available floored to 0", approx(overLedger.months.find((r) => r.month === "2026-02")!.available, 0));

// bulk selection
const bulkLedger = computeLedger([
  { month: "2026-04", net: 280, distribution: null },                 // avail 280
  { month: "2026-05", net: 310, distribution: dist("2026-05", 310) }, // distributed, avail 0
  { month: "2026-06", net: 310, distribution: dist("2026-06", 280) }, // partial, avail 30
  { month: "2026-07", net: 420, distribution: null },                 // avail 420
]);
check(
  "undistributedMonths lists only available>0 sorted",
  JSON.stringify(undistributedMonths(bulkLedger)) === JSON.stringify(["2026-04", "2026-06", "2026-07"])
);
const upToJun = monthsToDistribute(bulkLedger, "2026-06");
check("monthsToDistribute up to Jun picks Apr+Jun", JSON.stringify(upToJun.months) === JSON.stringify(["2026-04", "2026-06"]) && upToJun.count === 2);
check("monthsToDistribute up to Jun total = 310", approx(upToJun.total, 310));
check("monthsToDistribute up to Jul total = 730", approx(monthsToDistribute(bulkLedger, "2026-07").total, 730));

// monthsInclusive
check(
  "monthsInclusive spans year boundary",
  JSON.stringify(monthsInclusive("2025-11", "2026-02")) === JSON.stringify(["2025-11", "2025-12", "2026-01", "2026-02"])
);
check("monthsInclusive single month", JSON.stringify(monthsInclusive("2026-04", "2026-04")) === JSON.stringify(["2026-04"]));

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
