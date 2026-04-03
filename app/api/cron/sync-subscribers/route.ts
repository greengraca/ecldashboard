import { NextRequest, NextResponse } from "next/server";
import { syncPatreonForMonth } from "@/lib/patreon";
import { detectSubscriberChanges } from "@/lib/subscribers";
import { getCurrentMonth } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = getCurrentMonth();

  const syncResult = await syncPatreonForMonth(month, "cron", "Daily Sync");
  const changes = await detectSubscriberChanges(month, "cron", "Daily Sync");

  return NextResponse.json({
    data: {
      month,
      sync: { synced: syncResult.synced, skipped: syncResult.skipped, removed: syncResult.removed },
      changes: { joined: changes.joined.length, left: changes.left.length },
    },
  });
}
