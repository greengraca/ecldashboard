/**
 * Verification: report Patreon/Ko-fi snapshots marked cancelled (cancelled_at)
 * and quantify how many a cancellation-blind read would over-count per month.
 *
 * Subscriber + income reads MUST exclude cancelled_at (see lib/subscription-income.ts
 * getSubscriptionIncome/Breakdown and lib/subscribers.ts getSubscribers/getSubscriberSummary).
 * This script is the audit aid for that invariant: the "cancelled-but-eligible"
 * column is exactly the phantom income/subscribers the old cancellation-blind
 * reads were counting. It should equal what the dashboard now EXCLUDES.
 *
 * Run with: npx tsx scripts/verify-subscription-cancelled.ts
 */
import * as fs from "fs";
import * as path from "path";
import { MongoClient } from "mongodb";

// Load .env.local manually (same pattern as registration-report.ts)
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

const MONGODB_URI = process.env.MONGODB_URI!;
const DB_NAME = process.env.MONGODB_DB_NAME || "eclbot";

// Mirror lib/constants.ts PATREON_TIER_NET + Bronze/Silver Jan-only eligibility.
const PATREON_TIER_NET: Record<string, number> = {
  Bronze: 2.67, Silver: 4.45, "ECL Grinder": 5.79, Gold: 5.79, Diamond: 5.79,
};
const BRONZE_SILVER = new Set(["Bronze", "Silver"]);

function incomeEligible(tier: string, month: string): boolean {
  const t = (tier || "").trim();
  if (BRONZE_SILVER.has(t) && month !== "2026-01") return false;
  return PATREON_TIER_NET[t] !== undefined;
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patreon = await db.collection("dashboard_patreon_snapshots").find({}).toArray() as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kofi = await db.collection("dashboard_kofi_snapshots").find({}).toArray() as any[];

  const months = [...new Set([...patreon, ...kofi].map((s) => s.month as string))].sort();

  let totalPhantomEur = 0;
  console.log("month   | patreon active/total | cancelled-but-eligible | kofi active/total");
  console.log("--------|----------------------|------------------------|------------------");
  for (const month of months) {
    const pAll = patreon.filter((s) => s.month === month);
    const pActive = pAll.filter((s) => s.cancelled_at == null);
    const pPhantom = pAll.filter((s) => s.cancelled_at != null && incomeEligible(s.tier, month));
    const eur = pPhantom.reduce((sum, s) => sum + (PATREON_TIER_NET[(s.tier || "").trim()] ?? 0), 0);
    totalPhantomEur += eur;
    const kAll = kofi.filter((s) => s.month === month);
    const kActive = kAll.filter((s) => s.cancelled_at == null);
    console.log(
      `${month} |     ${String(pActive.length).padStart(3)} / ${String(pAll.length).padStart(3)}        |   ${String(pPhantom.length).padStart(2)}  (€${eur.toFixed(2)})         |    ${String(kActive.length).padStart(2)} / ${String(kAll.length).padStart(2)}`
    );
    for (const s of pPhantom) {
      console.log(`         - [${(s.tier || "").trim()}] ${s.patreon_name} (cancelled_at=${s.cancelled_at})`);
    }
  }
  console.log(`\nPatreon income removed by excluding cancelled_at (all months): €${totalPhantomEur.toFixed(2)}`);
  console.log("(Gold/Diamond among these also require bracket registration to have counted.)");

  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
