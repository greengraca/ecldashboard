/** Truth-table check for the Top 16 eligibility predicate. Run: npx tsx scripts/verify-top16-eligibility.ts */
import { isTop16Eligible, usesTotalGamesRule } from "../lib/top16-eligibility";

let failures = 0;
function check(label: string, got: boolean, want: boolean) {
  if (got !== want) { console.error(`FAIL ${label}: got ${got}, want ${want}`); failures++; }
}

// Boundary
check("rule 2026-05 is total", usesTotalGamesRule("2026-05"), true);
check("rule 2026-06 is total", usesTotalGamesRule("2026-06"), true);
check("rule 2026-04 is old", usesTotalGamesRule("2026-04"), false);

const NEW = "2026-05", OLD = "2026-04";
// New rule (total games; onlineGames ignored)
check("new dropped", isTop16Eligible({ month: NEW, dropped: true, totalGames: 99, onlineGames: 99, recencyApplies: true, hasRecent: true }), false);
check("new <10", isTop16Eligible({ month: NEW, dropped: false, totalGames: 9, onlineGames: 0, recencyApplies: true, hasRecent: true }), false);
check("new 10 no-recent", isTop16Eligible({ month: NEW, dropped: false, totalGames: 10, onlineGames: 0, recencyApplies: true, hasRecent: false }), false);
check("new 10 recent", isTop16Eligible({ month: NEW, dropped: false, totalGames: 10, onlineGames: 0, recencyApplies: true, hasRecent: true }), true);
check("new 20 no-recent", isTop16Eligible({ month: NEW, dropped: false, totalGames: 20, onlineGames: 0, recencyApplies: true, hasRecent: false }), true);
check("new 10 recency-off", isTop16Eligible({ month: NEW, dropped: false, totalGames: 10, onlineGames: 0, recencyApplies: false, hasRecent: false }), true);
// Old rule (online-gated, frozen)
check("old online<10", isTop16Eligible({ month: OLD, dropped: false, totalGames: 30, onlineGames: 9, recencyApplies: true, hasRecent: true }), false);
check("old online10 no-recent", isTop16Eligible({ month: OLD, dropped: false, totalGames: 30, onlineGames: 10, recencyApplies: true, hasRecent: false }), false);
check("old online10 recent", isTop16Eligible({ month: OLD, dropped: false, totalGames: 30, onlineGames: 10, recencyApplies: true, hasRecent: true }), true);
check("old online20 no-recent", isTop16Eligible({ month: OLD, dropped: false, totalGames: 30, onlineGames: 20, recencyApplies: true, hasRecent: false }), true);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("top16-eligibility truth-table OK");
