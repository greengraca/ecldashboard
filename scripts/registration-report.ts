/**
 * Report: Gold/Diamond Patreon subscribers excluded by bracket registration filter.
 * Run with: npx tsx scripts/registration-report.ts
 */
import * as fs from "fs";
import * as path from "path";
import { MongoClient } from "mongodb";

// Load .env.local manually
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  let val = trimmed.slice(eqIdx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  process.env[key] = val;
}

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB_NAME || "eclbot";
const FIRESTORE_DOC_URL_TEMPLATE = process.env.FIRESTORE_DOC_URL_TEMPLATE || "";

async function getRegisteredUsernames(db: any, month: string): Promise<Set<string> | null> {
  const usernames = new Set<string>();

  // 1. Try dump data
  const runs = await db
    .collection("topdeck_month_dump_runs")
    .aggregate([
      { $group: { _id: { bracket_id: "$bracket_id", month: "$month" } } },
    ])
    .toArray();

  const monthInfos = runs
    .map((r: any) => ({ bracket_id: r._id.bracket_id, month: r._id.month }))
    .filter((m: any) => m.month === month);

  if (monthInfos.length > 0) {
    const allUids = new Set<string>();
    const bracketIds = new Set<string>();

    for (const mi of monthInfos) {
      bracketIds.add(mi.bracket_id);
      const latestRun = await db
        .collection("topdeck_month_dump_runs")
        .findOne(
          { bracket_id: mi.bracket_id, month: mi.month },
          { sort: { created_at: -1 } }
        );
      if (!latestRun) continue;

      const chunks = await db
        .collection("topdeck_month_dump_chunks")
        .find({ bracket_id: mi.bracket_id, month: mi.month, run_id: latestRun.run_id })
        .sort({ chunk_index: 1 })
        .toArray();

      if (chunks.length === 0) continue;
      const jsonString = chunks.map((c: any) => c.data).join("");
      const raw = JSON.parse(jsonString);

      let entrantToUid = raw.entrant_to_uid;

      // Schema v1 fallback: fetch entrant_to_uid from Firestore
      if (!entrantToUid && FIRESTORE_DOC_URL_TEMPLATE) {
        try {
          const docUrl = FIRESTORE_DOC_URL_TEMPLATE.replace("{bracket_id}", mi.bracket_id);
          const res = await fetch(docUrl);
          if (res.ok) {
            const doc = await res.json();
            entrantToUid = {};
            const fields = doc?.fields || {};
            for (const [k, v] of Object.entries(fields)) {
              const match = k.match(/^E(\d+):P1$/);
              if (match && (v as any)?.stringValue) {
                entrantToUid[match[1]] = (v as any).stringValue;
              }
            }
          }
        } catch {
          // Firestore unavailable
        }
      }

      if (entrantToUid) {
        for (const uid of Object.values(entrantToUid)) {
          allUids.add(uid as string);
        }
      }
    }

    // Map UIDs to discord usernames via PublicPData
    if (allUids.size > 0) {
      for (const bid of bracketIds) {
        try {
          const res = await fetch(`https://topdeck.gg/PublicPData/${bid}`);
          if (res.ok) {
            const pdata = await res.json();
            for (const [uid, info] of Object.entries(pdata as Record<string, any>)) {
              if (allUids.has(uid) && info.discord) {
                usernames.add((info.discord as string).toLowerCase().trim());
              }
            }
          }
        } catch {
          // skip
        }
      }
    }
  }

  // 2. Fallback: live standings (current month with no dump yet)
  if (usernames.size === 0) {
    const bracketId = process.env.TOPDECK_BRACKET_ID;
    if (bracketId && FIRESTORE_DOC_URL_TEMPLATE) {
      try {
        const docUrl = FIRESTORE_DOC_URL_TEMPLATE.replace("{bracket_id}", bracketId);
        const [pdataRes, docRes] = await Promise.all([
          fetch(`https://topdeck.gg/PublicPData/${bracketId}`),
          fetch(docUrl),
        ]);
        if (pdataRes.ok && docRes.ok) {
          const pdata = await pdataRes.json();
          const doc = await docRes.json();
          const fields = doc?.fields || {};
          const liveUids = new Set<string>();
          for (const [k, v] of Object.entries(fields)) {
            const m = k.match(/^E(\d+):P1$/);
            if (m && (v as any)?.stringValue) {
              liveUids.add((v as any).stringValue);
            }
          }
          for (const [uid, info] of Object.entries(pdata as Record<string, any>)) {
            if (liveUids.has(uid) && info.discord) {
              usernames.add((info.discord as string).toLowerCase().trim());
            }
          }
        }
      } catch {
        // live fetch failed
      }
    }
  }

  return usernames.size > 0 ? usernames : null;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const months = await db
    .collection("dashboard_patreon_snapshots")
    .distinct("month");
  months.sort();

  console.log("=== Gold/Diamond Registration Filter Report ===\n");

  for (const month of months) {
    const registered = await getRegisteredUsernames(db, month);

    const snapshots = await db
      .collection("dashboard_patreon_snapshots")
      .find({
        month,
        tier: { $in: ["Gold", "Gold ", "Diamond", "Diamond "] },
      })
      .toArray();

    if (snapshots.length === 0) {
      console.log(`## ${month}: No Gold/Diamond subscribers\n`);
      continue;
    }

    const excluded: { name: string; tier: string; discord_id: string }[] = [];
    const included: { name: string; tier: string }[] = [];

    for (const s of snapshots) {
      const tier = ((s.tier as string) || "").trim();
      const patreonName = (s.patreon_name as string) || "Unknown";
      const rawDiscord = s.discord_id ? s.discord_id.toString().trim() : "";

      if (registered === null) {
        included.push({ name: patreonName, tier });
        continue;
      }

      const isRegistered =
        (rawDiscord && registered.has(rawDiscord)) ||
        (rawDiscord && registered.has(rawDiscord.toLowerCase()));

      if (isRegistered) {
        included.push({ name: patreonName, tier });
      } else {
        excluded.push({ name: patreonName, tier, discord_id: rawDiscord || "N/A" });
      }
    }

    console.log(`## ${month}`);
    console.log(`  Gold/Diamond total: ${snapshots.length} | Registered: ${included.length} | Excluded: ${excluded.length}`);

    if (registered === null) {
      console.log(`  (No bracket data — all included)`);
    }

    if (excluded.length > 0) {
      console.log(`  Excluded:`);
      for (const e of excluded) {
        console.log(`    - ${e.name} (${e.tier}) [discord: ${e.discord_id}]`);
      }
    }
    console.log();
  }

  await client.close();
}

main().catch(console.error);
