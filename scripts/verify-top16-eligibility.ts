/** Truth-table check for the Top 16 eligibility predicate. Run: npx tsx scripts/verify-top16-eligibility.ts */
import { isTop16Eligible, recencyRuleApplies, usesTotalGamesRule } from "../lib/top16-eligibility";

let failures = 0;
function check(label: string, got: boolean, want: boolean) {
  if (got !== want) { console.error(`FAIL ${label}: got ${got}, want ${want}`); failures++; }
}

// Boundaries
check("rule 2026-05 is total", usesTotalGamesRule("2026-05"), true);
check("rule 2026-06 is total", usesTotalGamesRule("2026-06"), true);
check("rule 2026-04 is old", usesTotalGamesRule("2026-04"), false);
check("recency 2026-02 off", recencyRuleApplies("2026-02"), false);
check("recency 2026-03 on", recencyRuleApplies("2026-03"), true);
check("recency 2026-09 on", recencyRuleApplies("2026-09"), true);
check("recency 2026-10 off", recencyRuleApplies("2026-10"), false);
check("recency 2027-01 off", recencyRuleApplies("2027-01"), false);

const NEW = "2026-05", OLD = "2026-04", NO_RECENCY = "2026-10", PRE_RECENCY = "2026-02";
// New rule inside the frozen recency window (total games; onlineGames ignored)
check("new dropped", isTop16Eligible({ month: NEW, dropped: true, totalGames: 99, onlineGames: 99, hasRecent: true }), false);
check("new <10", isTop16Eligible({ month: NEW, dropped: false, totalGames: 9, onlineGames: 0, hasRecent: true }), false);
check("new 10 no-recent", isTop16Eligible({ month: NEW, dropped: false, totalGames: 10, onlineGames: 0, hasRecent: false }), false);
check("new 10 recent", isTop16Eligible({ month: NEW, dropped: false, totalGames: 10, onlineGames: 0, hasRecent: true }), true);
check("new 20 no-recent", isTop16Eligible({ month: NEW, dropped: false, totalGames: 20, onlineGames: 0, hasRecent: false }), true);
// New rule after recency was removed (2026-10+)
check("no-recency dropped", isTop16Eligible({ month: NO_RECENCY, dropped: true, totalGames: 99, onlineGames: 0 }), false);
check("no-recency <10", isTop16Eligible({ month: NO_RECENCY, dropped: false, totalGames: 9, onlineGames: 0 }), false);
check("no-recency 10", isTop16Eligible({ month: NO_RECENCY, dropped: false, totalGames: 10, onlineGames: 0 }), true);
check("no-recency 10 no-recent", isTop16Eligible({ month: NO_RECENCY, dropped: false, totalGames: 10, onlineGames: 0, hasRecent: false }), true);
// Old rule (online-gated, frozen)
check("old online<10", isTop16Eligible({ month: OLD, dropped: false, totalGames: 30, onlineGames: 9, hasRecent: true }), false);
check("old online10 no-recent", isTop16Eligible({ month: OLD, dropped: false, totalGames: 30, onlineGames: 10, hasRecent: false }), false);
check("old online10 recent", isTop16Eligible({ month: OLD, dropped: false, totalGames: 30, onlineGames: 10, hasRecent: true }), true);
check("old online20 no-recent", isTop16Eligible({ month: OLD, dropped: false, totalGames: 30, onlineGames: 20, hasRecent: false }), true);
check("pre-recency online10", isTop16Eligible({ month: PRE_RECENCY, dropped: false, totalGames: 30, onlineGames: 10 }), true);
check("pre-recency online<10", isTop16Eligible({ month: PRE_RECENCY, dropped: false, totalGames: 30, onlineGames: 9 }), false);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("top16-eligibility truth-table OK");
