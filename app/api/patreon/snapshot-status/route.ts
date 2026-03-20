import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { getDb } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAuthWithRateLimit(request);
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

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
  } catch (err) {
    console.error("GET /api/patreon/snapshot-status error:", err);
    logApiError("patreon/snapshot-status:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch snapshot status" },
      { status: 500 }
    );
  }
}
