/**
 * Our standings replay must reproduce TopDeck's inactivity decay.
 *
 * From 2026-10 the league has "Inactivity decay" on (10% of points above 1000
 * every 7 idle days). Without it the dashboard was up to ~70 points off for idle
 * players, and a few points off for everyone who played them (decay shrinks the
 * wagers they lost).
 *
 * The check is against TopDeck's own numbers, not a second port: a league doc
 * carries SNAP:D, TopDeck's folded standings through table SNAP:T (points,
 * lastPlayed, decayed per entrant, idle tail NOT applied). Replaying tables
 * 1..SNAP:T through computeStandings() with no idle tail must land on SNAP:D's
 * points for every entrant. Also asserts the decay settings parse.
 *
 * Run: npx tsx scripts/verify-topdeck-decay.ts [YYYY-MM]   (default 2026-10; needs .env.local — reads MongoDB + TopDeck)
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
  const month = process.argv[2] || "2026-10";
  const { computeStandings } = await import("../lib/topdeck");
  const { parseTournamentFields } = await import("../lib/topdeck-live");
  const { decaySettingsFromFields } = await import("../lib/topdeck-decay");
  const { getBracketIdForMonth } = await import("../lib/bracket-ids");

  const bracketId = await getBracketIdForMonth(month);
  const res = await fetch(process.env.FIRESTORE_DOC_URL_TEMPLATE!.replace("{bracket_id}", bracketId));
  if (!res.ok) throw new Error(`Firestore doc ${bracketId} returned ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fields: Record<string, any> = parseTournamentFields(await res.json());

  const decay = decaySettingsFromFields(fields);
  if (!decay) throw new Error(`${month} (${bracketId}) has no inactivity decay — pick a month from 2026-10 on`);

  const snap = fields["SNAP:D"];
  const snapT = Number(fields["SNAP:T"]);
  if (!snap || !Array.isArray(snap.F) || !Array.isArray(snap.E) || !(snapT > 0)) {
    throw new Error(`${bracketId} has no SNAP:D/SNAP:T league snapshot to compare against`);
  }
  const pointsCol = snap.F.indexOf("points");
  if (pointsCol === -1 || !snap.F.includes("lastPlayed")) throw new Error(`SNAP:D fields unexpected: ${snap.F}`);

  // Tables 1..SNAP:T in DumpMatch shape (computeStandings applies its own validity filter)
  const matches = [];
  for (let t = 1; t <= snapT; t++) {
    const raw = fields[`S1:T${t}`];
    if (!raw) continue;
    matches.push({
      season: 1,
      table: t,
      start: typeof raw.Start === "number" ? raw.Start : null,
      end: typeof raw.End === "number" ? raw.End : null,
      es: Array.isArray(raw.Es) ? raw.Es : [],
      winner: raw.Winner ?? null,
      raw,
    });
  }

  const entrantIds: number[] = [];
  for (let e = 1; fields[`E${e}:P1`] !== undefined; e++) entrantIds.push(e);

  // decay_until_ms null = no idle tail, which is how TopDeck folds a snapshot
  const ours = computeStandings(matches, entrantIds, { decay, decay_until_ms: null });

  let failures = 0;
  let decayed = 0;
  for (const eid of entrantIds) {
    const row = snap.E[eid - 1];
    if (typeof row !== "string") continue;
    const nums = row.split("~")[0].split("|").map(Number);
    const expected = nums[pointsCol];
    if (nums[snap.F.indexOf("decayed")] > 0) decayed++;
    const got = ours.get(eid)?.points ?? 1000;
    // computeStandings rounds to 2dp
    if (Math.abs(got - expected) > 0.006) {
      failures++;
      console.error(`FAIL E${eid}: TopDeck ${expected.toFixed(4)} vs ours ${got}`);
    }
  }

  console.log(`${month} (${bracketId}): decay ${JSON.stringify(decay)}, snapshot through table ${snapT}, ` +
    `${entrantIds.length} entrants, ${decayed} already decayed`);
  if (failures) {
    console.error(`\n${failures} entrant(s) off`);
    process.exit(1);
  }
  console.log("standings replay matches TopDeck's decayed snapshot - OK");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
