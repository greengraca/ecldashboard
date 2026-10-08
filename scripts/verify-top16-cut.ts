/**
 * Every past-month Top 16 surface must show the real cut.
 *
 * The League page used to build its Top 16 Cut / Top 16 Pods / Top 4 Pods as
 * "top 16 players with >= 10 games", and getStandings() (media results templates)
 * as plain "top 16 by points". Neither knows about drops or recency: in Aug 2026
 * the #1 by points had dropped, so the dashboard seeded him into Pod 1 and every
 * other pod came out different from what TopDeck actually played (May and July
 * 2026 were off by one player too).
 *
 * Checks, for every dumped month: getStandings() returns exactly getEligibleTop16(),
 * in the same order, with no dropped player and nobody under the games minimum.
 *
 * Run: npx tsx scripts/verify-top16-cut.ts   (needs .env.local — reads MongoDB + TopDeck)
 */
import * as fs from "fs";
import * as path from "path";

const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  process.env[key] = val;
}

async function main() {
  // Imported after the env is loaded — lib/constants reads it at module load
  const { getStandings, getEligibleTop16, getDroppedUidsForMonth } = await import("../lib/players");
  const { getHistoricalMonths } = await import("../lib/topdeck");
  const { TOP16_MIN_TOTAL_GAMES } = await import("../lib/constants");

  let failures = 0;
  const fail = (msg: string) => { console.error(`FAIL ${msg}`); failures++; };

  const months = [...new Set((await getHistoricalMonths()).map((m) => m.month))];
  for (const month of months) {
    const { standings, resolvedMonth } = await getStandings(month);
    if (resolvedMonth !== month) { fail(`${month}: getStandings resolved to ${resolvedMonth}`); continue; }
    const eligible = await getEligibleTop16(month);
    const dropped = await getDroppedUidsForMonth(month);

    const got = standings.map((s) => s.uid).join(",");
    const want = eligible.map((e) => e.uid).join(",");
    if (got !== want) fail(`${month}: getStandings cut differs from getEligibleTop16`);
    for (const s of standings) {
      if (dropped.has(s.uid)) fail(`${month}: dropped player ${s.name} is in the cut`);
      if (s.games < TOP16_MIN_TOTAL_GAMES) fail(`${month}: ${s.name} has ${s.games} games`);
    }
    console.log(`${month}: ${standings.length} in cut`);
  }

  if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
  console.log("Top 16 cut is the eligible cut for every month - OK");
  process.exit(0);
}

main();
