/** Compare OLD (online-gated) vs NEW (total-games) eligible Top 16 per month, against live data.
 *  Gate-only deltas (ignores points/dropped/recency) — purpose is to verify the policy boundary
 *  matches expectations: pre-2026-05 stays frozen on online; 2026-05 gains the previously-blocked
 *  players who had enough total games but not enough online games.
 *  Run: npx tsx scripts/eligibility-parity.ts */
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

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "eclbot");
  const months = await db.collection("online_games").aggregate([
    { $group: { _id: { y: "$year", m: "$month", b: "$bracket_id" } } },
    { $sort: { "_id.y": 1, "_id.m": 1 } },
  ]).toArray();

  console.log("month   bracket(short)        gate-pass: old   new   gained");
  for (const row of months as { _id: { y: number; m: number; b: string } }[]) {
    const { y, m, b } = row._id;
    const per = await db.collection("online_games").aggregate([
      { $match: { year: y, month: m, bracket_id: b } },
      { $unwind: "$topdeck_uids" },
      { $group: { _id: "$topdeck_uids", all: { $sum: 1 }, online: { $sum: { $cond: [{ $eq: ["$online", true] }, 1, 0] } } } },
    ]).toArray();
    let oldElig = 0, newElig = 0, gained = 0;
    for (const p of per as { all: number; online: number }[]) {
      const o = p.online >= 10;
      const n = p.all >= 10;
      if (o) oldElig++;
      if (n) newElig++;
      if (n && !o) gained++;
    }
    console.log(`${y}-${String(m).padStart(2, "0")} ${b.slice(0, 16).padEnd(16)}      old=${String(oldElig).padStart(3)} new=${String(newElig).padStart(3)} gained=${String(gained).padStart(2)}`);
  }
  await client.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
