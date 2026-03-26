import { getDb } from "./mongodb";
import { logActivity } from "./activity";
import { ECL_ELIGIBLE_PATREON_TIERS } from "./constants";
import { getCurrentMonth } from "./utils";
import { readFileSync } from "fs";

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  const parseRow = (line: string): string[] => {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}

function getMonthsBetween(start: string, end: string): string[] {
  const months: string[] = [];
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  let y = sy,
    m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

// Hardcoded paths — one-time local operation, never deployed
const PATREON_CSV =
  "C:\\Users\\jopeg\\Downloads\\20260312-members-7890401-Cedhpt.csv";
const KOFI_CSVS = [
  "C:\\Users\\jopeg\\Downloads\\Transaction_December 2025.csv",
  "C:\\Users\\jopeg\\Downloads\\Transaction_January 2026.csv",
  "C:\\Users\\jopeg\\Downloads\\Transaction_February 2026.csv",
  "C:\\Users\\jopeg\\Downloads\\Transaction_March 2026.csv",
];

export async function backfillPatreon(
  userId: string,
  userName: string
): Promise<{ inserted: number; skipped: number }> {
  const content = readFileSync(PATREON_CSV, "utf-8");
  const rows = parseCSV(content);
  const db = await getDb();
  const collection = db.collection("dashboard_patreon_snapshots");
  const syncTimestamp = new Date().toISOString();

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const tier = (row["Tier"] || "").trim();
    if (!ECL_ELIGIBLE_PATREON_TIERS.includes(tier)) {
      skipped++;
      continue;
    }

    const status = row["Patron Status"] || "";
    const pledgeAmount = parseFloat(row["Pledge Amount"] || "0");
    const patronageSince = row["Patronage Since Date"] || "";
    const lastChargeDate = row["Last Charge Date"] || "";
    const lastChargeStatus = row["Last Charge Status"] || "";
    const patreonUserId = row["User ID"] || "";
    const patreonName = row["Name"] || "";
    const discord = row["Discord"] || null;

    if (!patronageSince) {
      skipped++;
      continue;
    }

    const startMonth = patronageSince.substring(0, 7);

    let endMonth: string;
    if (status === "Active patron" && lastChargeStatus === "Paid") {
      endMonth = getCurrentMonth();
    } else if (lastChargeDate) {
      endMonth = lastChargeDate.substring(0, 7);
    } else {
      skipped++;
      continue;
    }

    // Only backfill from 2025-12 onward (ECL league start)
    const effectiveStart = startMonth < "2025-12" ? "2025-12" : startMonth;
    if (effectiveStart > endMonth) {
      skipped++;
      continue;
    }

    const months = getMonthsBetween(effectiveStart, endMonth);

    for (const month of months) {
      await collection.updateOne(
        { month, patreon_user_id: patreonUserId },
        {
          $set: {
            month,
            discord_id: discord, // CSV has Discord username, not ID — best we have for backfill
            patreon_name: patreonName,
            tier: tier.trim(),
            pledge_amount: pledgeAmount,
            patreon_user_id: patreonUserId,
            synced_at: syncTimestamp,
          },
        },
        { upsert: true }
      );
      inserted++;
    }
  }

  await logActivity(
    "create",
    "backfill",
    "patreon_csv",
    { inserted, skipped },
    userId,
    userName
  );

  return { inserted, skipped };
}

export async function backfillKofi(
  userId: string,
  userName: string
): Promise<{ inserted: number; skipped: number }> {
  const db = await getDb();
  const kofiEvents = db.collection("subs_kofi_events");
  const backfillCollection = db.collection("dashboard_kofi_backfill");
  const syncTimestamp = new Date().toISOString();

  let inserted = 0;
  let skipped = 0;

  for (const csvPath of KOFI_CSVS) {
    const content = readFileSync(csvPath, "utf-8");
    const rows = parseCSV(content);

    for (const row of rows) {
      const dateStr = row["DateTime (UTC)"] || "";
      const discordRaw = row["DiscordUsername"] || "";
      const transactionId = row["TransactionId"] || "";
      const amount = parseFloat(row["Received"] || "0");

      if (!dateStr || !transactionId) {
        skipped++;
        continue;
      }

      // Parse month from "MM/DD/YYYY HH:MM"
      const parts = dateStr.split(" ")[0].split("/");
      if (parts.length !== 3) {
        skipped++;
        continue;
      }
      const month = `${parts[2]}-${parts[0].padStart(2, "0")}`;

      // Strip "#0" suffix from Discord username
      const discord = discordRaw.replace(/#0$/, "").toLowerCase().trim();

      if (!discord || discord === "not connected") {
        skipped++;
        continue;
      }

      // Check if subs_kofi_events already has this transaction
      const existing = await kofiEvents.findOne({ txn_id: transactionId });
      if (existing) {
        skipped++;
        continue;
      }

      await backfillCollection.updateOne(
        { month, discord_username: discord, transaction_id: transactionId },
        {
          $set: {
            month,
            discord_username: discord,
            transaction_id: transactionId,
            amount,
            backfilled_at: syncTimestamp,
          },
        },
        { upsert: true }
      );
      inserted++;
    }
  }

  await logActivity(
    "create",
    "backfill",
    "kofi_csv",
    { inserted, skipped, csv_count: KOFI_CSVS.length },
    userId,
    userName
  );

  return { inserted, skipped };
}
