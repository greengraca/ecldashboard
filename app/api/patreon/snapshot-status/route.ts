import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getDb } from "@/lib/mongodb";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const db = await getDb();

  // Find the most recent snapshot for this month
  const latest = await db
    .collection("dashboard_patreon_snapshots")
    .find({ month })
    .sort({ synced_at: -1 })
    .limit(1)
    .toArray();

  const lastSyncedAt = latest.length > 0 ? latest[0].synced_at : null;

  // A snapshot is stale if it was never synced after the month ended.
  // i.e., synced_at < 1st of month M+1
  const [y, m] = month.split("-").map(Number);
  const firstOfNextMonth = new Date(
    m === 12 ? y + 1 : y,
    m === 12 ? 0 : m,
    1
  );

  const isStale =
    !lastSyncedAt || new Date(lastSyncedAt) < firstOfNextMonth;

  return NextResponse.json({
    data: {
      month,
      last_synced_at: lastSyncedAt ? new Date(lastSyncedAt).toISOString() : null,
      is_stale: isStale,
    },
  });
}, "patreon/snapshot-status:GET");
