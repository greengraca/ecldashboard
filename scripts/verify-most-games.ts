/** Truth-table check for the Most Games raffle selection (Top 5 by games, 800+ points from 2026-10).
 *  Mirrors eclBot/verify_most_games.py; keep the two in step.
 *  Run: npx tsx scripts/verify-most-games.ts */
import {
  MOST_GAMES_MIN_POINTS,
  selectMostGamesTop5,
  usesMostGamesPointsRule,
} from "../lib/most-games";

let failures = 0;
function check(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { console.error(`FAIL ${label}: got ${g}, want ${w}`); failures++; }
}

const p = (uid: string, games: number, points: number) => ({ uid, games, points });
const uids = (rows: { uid: string }[]) => rows.map((r) => r.uid);

// Rule boundary — frozen games-only before 2026-10
check("threshold is 800", MOST_GAMES_MIN_POINTS, 800);
check("rule 2026-10 on", usesMostGamesPointsRule("2026-10"), true);
check("rule 2026-11 on", usesMostGamesPointsRule("2026-11"), true);
check("rule 2027-01 on", usesMostGamesPointsRule("2027-01"), true);
check("rule 2026-09 off", usesMostGamesPointsRule("2026-09"), false);

// Aug-2026 shape: the five biggest grinders are all under 800
const grinders = [
  p("oriol", 91, 114.8), p("merlin", 76, 700.9), p("dinis", 66, 360.5),
  p("jaime", 58, 709.8), p("cesar", 52, 517.4), p("thorsten", 48, 1046.4),
  p("francisco", 41, 854.1), p("jasper", 41, 819.9), p("tiago", 39, 1245.6),
  p("nikolaos", 39, 1003.8), p("x", 30, 1500),
];
check("new rule filters first, then top 5 by games",
  uids(selectMostGamesTop5(grinders, "2026-10")),
  ["thorsten", "francisco", "jasper", "tiago", "nikolaos"]);
check("old month stays games-only",
  uids(selectMostGamesTop5(grinders, "2026-09")),
  ["oriol", "merlin", "dinis", "jaime", "cesar"]);

// Boundary: exactly 800 qualifies, 799.99 does not
check("800 inclusive", uids(selectMostGamesTop5([p("a", 10, 800), p("b", 20, 799.99)], "2026-10")), ["a"]);

// Ties on games break by points (desc), matching the bot's (-games, -pts) sort
check("tie on games -> higher points first",
  uids(selectMostGamesTop5([p("lo", 30, 900), p("hi", 30, 1200), p("top", 31, 850)], "2026-10")),
  ["top", "hi", "lo"]);

// Fewer than 5 qualifiers -> fewer than 5 candidates (no sub-800 backfill)
check("short list is not backfilled",
  uids(selectMostGamesTop5([p("a", 50, 500), p("b", 10, 1000), p("c", 5, 950)], "2026-10")),
  ["b", "c"]);
check("nobody qualifies -> empty", selectMostGamesTop5([p("a", 50, 500)], "2026-10"), []);

// Does not mutate the caller's array
const input = [p("a", 1, 1000), p("b", 2, 1000)];
selectMostGamesTop5(input, "2026-10");
check("input order untouched", uids(input), ["a", "b"]);

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log("most-games selection truth-table OK");
