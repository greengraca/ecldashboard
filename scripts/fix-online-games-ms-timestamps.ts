/**
 * One-off repair: normalize millisecond `start_ts` values in `online_games` to seconds.
 *
 * eclBot's timer path (cogs/timer/topdeck.py) used to persist the raw TopDeck
 * `start` value, which is milliseconds on the live endpoint, while the sync path
 * normalized to seconds. A ms value (~1.78e12) compares greater than any
 * seconds-based cutoff (~1.78e9), so the Top 16 "game after day N" recency check
 * passed every player in an affected pod regardless of when they actually played.
 *
 * Dry run:  npx tsx scripts/fix-online-games-ms-timestamps.ts
 * Apply:    npx tsx scripts/fix-online-games-ms-timestamps.ts --apply
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
const APPLY = process.argv.includes("--apply");

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const og = client.db(process.env.MONGODB_DB_NAME || "eclbot").collection("online_games");

  const bad = await og.find({ start_ts: { $gt: MS_THRESHOLD } }).toArray();
  console.log(`${APPLY ? "APPLY" : "DRY RUN"} — rows with millisecond start_ts: ${bad.length}\n`);

  for (const r of bad as Record<string, any>[]) {
    const fixed = r.start_ts / 1000;
    const month = `${r.year}-${String(r.month).padStart(2, "0")}`;
    const cutoff = Date.UTC(r.year, r.month - 1, 20) / 1000;
    const wrongly = r.start_ts >= cutoff && fixed < cutoff;
    console.log(
      `  ${month} ${r.bracket_id} S${r.season}:T${r.tid}  ${r.start_ts} -> ${fixed}` +
      `  (${new Date(fixed * 1000).toISOString().slice(0, 16)})` +
      (wrongly ? `  [was wrongly passing day-20 recency for ${(r.topdeck_uids || []).length} players]` : "")
    );
  }

  if (!bad.length) {
    console.log("Nothing to repair.");
  } else if (APPLY) {
    let n = 0;
    for (const r of bad as Record<string, any>[]) {
      await og.updateOne({ _id: r._id }, { $set: { start_ts: r.start_ts / 1000 } });
      n++;
    }
    console.log(`\nRepaired ${n} row(s).`);
    const left = await og.countDocuments({ start_ts: { $gt: MS_THRESHOLD } });
    console.log(`Remaining ms-valued rows: ${left}`);
  } else {
    console.log("\nRe-run with --apply to write these changes.");
  }

  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
