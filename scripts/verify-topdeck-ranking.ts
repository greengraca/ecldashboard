/** Truth-table check for TopDeck's league ranking (lib/topdeck-ranking.ts).
 *  Cases are real ties from the 2026-10 standings page (2026-10-30): sorting on raw
 *  points put Markus Schran (1243.11) above Rodrigo Costa e Silva (1242.59), but
 *  TopDeck rounds to 1243 for both and Rodrigo wins on win %.
 *  Mirrors eclBot topdeck_fetch.py rank_key; keep the two in step.
 *  Run: npx tsx scripts/verify-topdeck-ranking.ts */
import {
  DEFAULT_LEAGUE_BREAKERS,
  breakersFromFields,
  compareRankKeys,
  topdeckRankKey,
  type Breaker,
  type RankInputs,
} from "../lib/topdeck-ranking";

let failures = 0;
function check(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.error(`FAIL ${label}: got ${g}, want ${w}`); failures++; }
}

const p = (name: string, points: number, winRate: number, oppWinRate: number, entrantId: number, oppsBeaten = 0, uniqueOpps = 0) =>
  ({ name, points, winRate, oppWinRate, entrantId, oppsBeaten, uniqueOpps });
const order = (rows: (RankInputs & { name: string })[], breakers: readonly Breaker[] = DEFAULT_LEAGUE_BREAKERS) =>
  [...rows].sort((a, b) => compareRankKeys(topdeckRankKey(a, breakers), topdeckRankKey(b, breakers))).map((r) => r.name);

// MPTS rounds: 1243.11 and 1242.59 both show 1243 → win % decides (25% > 21.05%)
check("rounded-point tie goes to win %",
  order([p("markus", 1243.1136, 4 / 19, 0.1726, 66), p("rodrigo", 1242.589, 3 / 12, 0.1413, 2)]),
  ["rodrigo", "markus"]);

// A real point gap still wins over a better win %
check("whole-point gap beats win %",
  order([p("lowwin", 1243.6, 0.1, 0.1, 1), p("highwin", 1243.4, 0.9, 0.9, 2)]),
  ["lowwin", "highwin"]);

// 1163 tie: _kimaira 30% over glitchingchaos 16.67%
check("1163 tie by win %",
  order([p("glitchingchaos", 1163.4, 3 / 18, 0.1716, 14), p("_kimaira", 1162.6, 3 / 10, 0.1572, 58)]),
  ["_kimaira", "glitchingchaos"]);

// 1001 tie, both 0% → opponents' win %: ejdreean 21.03% over floggytre 11.89%
check("equal win % falls to OW%",
  order([p("floggytre", 1001.4, 0, 0.1189, 30), p("ejdreean", 1000.6, 0, 0.2103, 50)]),
  ["ejdreean", "floggytre"]);

// Percentages compare at 2 decimals: 0.21051 and 0.21049 both show 21.05% → next breaker
check("win % compared at 2dp",
  order([p("a", 1100, 0.21049, 0.1, 1), p("b", 1100, 0.21051, 0.2, 2)]),
  ["b", "a"]);

// Then opponents beaten, unique opponents, entrant number
check("OBEAT then UOPP",
  order([p("few", 1000, 0, 0, 1, 1, 9), p("more", 1000, 0, 0, 2, 2, 3), p("wider", 1000, 0, 0, 3, 1, 10)]),
  ["more", "wider", "few"]);
check("all equal → first registered",
  order([p("late", 1000, 0, 0, 40), p("early", 1000, 0, 0, 29)]),
  ["early", "late"]);

// Math.round semantics (halves up), not banker's rounding
check("1242.5 rounds up to 1243", topdeckRankKey(p("x", 1242.5, 0, 0, 1))[0], -1243);

// Event tie settings
check("no C:Breakers → league default", breakersFromFields({}), [...DEFAULT_LEAGUE_BREAKERS]);
check("C:Breakers as JSON string", breakersFromFields({ "C:Breakers": '["MPTS","OSR","SR"]' }), ["MPTS", "OSR", "SR"]);
check("custom order is applied",
  order([p("rodrigo", 1242.589, 3 / 12, 0.1413, 2), p("markus", 1243.1136, 4 / 19, 0.1726, 66)], ["MPTS", "OSR", "SR"]),
  ["markus", "rodrigo"]);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("TopDeck ranking truth-table OK");
