/**
 * Truth-table check for the TopDeck-sourced Top 16 recency helper.
 *
 * Recency used to be answered from the `online_games` mirror, which only holds pods
 * eclBot managed to sync. When that sync stalled (August 2026) the collection went
 * ~45% short and players with a genuine post-cutoff game were silently ruled out.
 * The helper below reads TopDeck's own match list instead — the same data the
 * standings are computed from — so a sync outage can no longer decide the cut.
 *
 * Run: npx tsx scripts/verify-top16-recency-source.ts
 */
import { recentUidsFromGames } from "../lib/top16-eligibility";

let failures = 0;
function check(label: string, got: boolean, want: boolean) {
  if (got !== want) { console.error(`FAIL ${label}: got ${got}, want ${want}`); failures++; }
}

const YEAR = 2026, MONTH = 8;                       // cutoff: 2026-08-20T00:00:00Z
const BEFORE_S = Date.UTC(2026, 7, 19, 16, 37) / 1000;  // Aug 19 — before cutoff
const AFTER_S = Date.UTC(2026, 7, 20, 10, 29) / 1000;   // Aug 20 — after cutoff

const recent = recentUidsFromGames([
  { uids: ["sec_before"], start: BEFORE_S },
  { uids: ["ms_before"], start: BEFORE_S * 1000 },
  { uids: ["sec_after"], start: AFTER_S },
  { uids: ["ms_after"], start: AFTER_S * 1000 },
  { uids: ["no_ts"], start: null },
  { uids: ["pod_a", "pod_b", "pod_c", "pod_d"], start: AFTER_S },
], YEAR, MONTH);

check("seconds before cutoff -> not recent", recent.has("sec_before"), false);
check("MILLISECOND before cutoff -> not recent", recent.has("ms_before"), false);
check("seconds after cutoff -> recent", recent.has("sec_after"), true);
check("millisecond after cutoff -> recent", recent.has("ms_after"), true);
check("null timestamp -> not recent", recent.has("no_ts"), false);
check("every player in a pod counts", ["pod_a", "pod_b", "pod_c", "pod_d"].every((u) => recent.has(u)), true);

// Exact boundary: a game at 00:00:00 on the cutoff day counts.
const edge = recentUidsFromGames([{ uids: ["edge"], start: Date.UTC(2026, 7, 20) / 1000 }], YEAR, MONTH);
check("game exactly at cutoff -> recent", edge.has("edge"), true);

// after_day beyond the month length clamps to the last day (mirrors eclBot).
const feb = recentUidsFromGames(
  [{ uids: ["feb28"], start: Date.UTC(2026, 1, 28, 12) / 1000 }], 2026, 2, 31,
);
check("after_day clamped to month length", feb.has("feb28"), true);

// Empty input is a valid empty answer, not a crash.
check("no games -> empty set", recentUidsFromGames([], YEAR, MONTH).size === 0, true);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("top16 recency-source truth-table OK");
