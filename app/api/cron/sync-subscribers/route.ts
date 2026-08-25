import { NextRequest, NextResponse } from "next/server";
import { syncPatreonForMonth } from "@/lib/patreon";
import { detectSubscriberChanges, syncKofiSnapshot } from "@/lib/subscribers";
import { getCurrentMonth } from "@/lib/utils";

export async function GET(request: NextRequest) {
  // Fail closed: an unset CRON_SECRET would otherwise interpolate to the
  // literal "Bearer undefined" and authenticate anyone who sends it. This
  // route is on proxy.ts's public list, so it is reachable unauthenticated.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] Refusing to run: CRON_SECRET is not configured.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = getCurrentMonth();

  const [patreonSync, kofiSync] = await Promise.all([
    syncPatreonForMonth(month, "cron", "Daily Sync"),
    syncKofiSnapshot(month, "cron", "Daily Sync"),
  ]);
  const changes = await detectSubscriberChanges(month, "cron", "Daily Sync");

  return NextResponse.json({
    data: {
      month,
      patreon: { synced: patreonSync.synced, skipped: patreonSync.skipped, removed: patreonSync.removed },
      kofi: { synced: kofiSync.synced, removed: kofiSync.removed },
      changes: { joined: changes.joined.length, left: changes.left.length },
    },
  });
}
