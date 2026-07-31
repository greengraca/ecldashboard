/**
 * Regression test for the Top 16 recency reader.
 *
 * A millisecond `start_ts` (~1.78e12) is greater than any seconds cutoff (~1.78e9),
 * so before the unit fix an affected row passed the "game after day N" check for
 * every player in that pod, whenever they actually played. This runs the real
 * aggregation against a scratch collection and asserts the ms row no longer leaks.
 *
 * Run: npx tsx scripts/verify-recency-normalization.ts
 */
import * as fs from "fs";
import * as path from "path";
import { MongoClient } from "mongodb";

const envPath = path.join(__dirname, "..", ".env.local");
for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[k] = v;
}

const MS_THRESHOLD = 1e10;
const YEAR = 2026, MONTH = 7, BRACKET = "__verify__";
const CUTOFF = Date.UTC(YEAR, MONTH - 1, 20) / 1000;      // day-20 cutoff, seconds
const JUL_12_S = Date.UTC(YEAR, 6, 12, 19, 28) / 1000;    // before cutoff (seconds)
const JUL_25_S = Date.UTC(YEAR, 6, 25, 12, 0) / 1000;     // after cutoff (seconds)

let failures = 0;
function check(label: string, got: boolean, want: boolean) {
  if (got !== want) { console.error(`FAIL ${label}: got ${got}, want ${want}`); failures++; }
  else console.log(`  ok  ${label}`);
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "eclbot");
  const col = db.collection("__verify_online_games__");
  await col.deleteMany({});

  await col.insertMany([
    // pre-cutoff game stored in seconds — must NOT count as recent
    { bracket_id: BRACKET, year: YEAR, month: MONTH, season: 1, tid: 1, online: true,
      start_ts: JUL_12_S, topdeck_uids: ["uid_seconds_old"] },
    // same pre-cutoff game stored in raw MILLISECONDS — must NOT count as recent
    { bracket_id: BRACKET, year: YEAR, month: MONTH, season: 1, tid: 2, online: true,
      start_ts: JUL_12_S * 1000, topdeck_uids: ["uid_ms_old"] },
    // genuine post-cutoff game — must count as recent
    { bracket_id: BRACKET, year: YEAR, month: MONTH, season: 1, tid: 3, online: true,
      start_ts: JUL_25_S, topdeck_uids: ["uid_seconds_recent"] },
    // genuine post-cutoff game stored in ms — must still count as recent
    { bracket_id: BRACKET, year: YEAR, month: MONTH, season: 1, tid: 4, online: true,
      start_ts: JUL_25_S * 1000, topdeck_uids: ["uid_ms_recent"] },
    // no timestamp at all — must NOT count
    { bracket_id: BRACKET, year: YEAR, month: MONTH, season: 1, tid: 5, online: true,
      start_ts: null, topdeck_uids: ["uid_no_ts"] },
  ]);

  // The exact pipeline shipped in lib/players.ts:getRecentGameUidsForMonth
  const rows = await col.aggregate([
    { $match: { bracket_id: BRACKET, year: YEAR, month: MONTH, online: true } },
    { $addFields: { _tsNorm: { $cond: [
      { $gt: ["$start_ts", MS_THRESHOLD] }, { $divide: ["$start_ts", 1000] }, "$start_ts",
    ] } } },
    { $match: { _tsNorm: { $gte: CUTOFF } } },
    { $unwind: "$topdeck_uids" },
    { $group: { _id: "$topdeck_uids" } },
  ]).toArray();
  const recent = new Set(rows.map((r) => String(r._id)));

  console.log("recent uids:", [...recent].sort().join(", ") || "(none)");
  check("seconds row before cutoff -> not recent", recent.has("uid_seconds_old"), false);
  check("MILLISECOND row before cutoff -> not recent", recent.has("uid_ms_old"), false);
  check("seconds row after cutoff -> recent", recent.has("uid_seconds_recent"), true);
  check("millisecond row after cutoff -> recent", recent.has("uid_ms_recent"), true);
  check("null start_ts -> not recent", recent.has("uid_no_ts"), false);

  await col.drop();
  await client.close();

  if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
  console.log("\nrecency normalization OK");
}

main().catch((e) => { console.error(e); process.exit(1); });
