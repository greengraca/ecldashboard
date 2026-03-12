import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { TOPDECK_BRACKET_ID } from "@/lib/constants";
import {
  clearAllTopDeckCaches,
  fetchPublicPData,
  canManualRefresh,
  recordManualRefresh,
  getTopDeckCacheStatus,
} from "@/lib/topdeck-cache";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManualRefresh()) {
    const status = getTopDeckCacheStatus();
    return NextResponse.json(
      { error: "Refresh on cooldown", retry_after_ms: status.cooldown_remaining_ms },
      { status: 429 }
    );
  }

  clearAllTopDeckCaches();
  recordManualRefresh();

  // Re-warm PublicPData cache
  if (TOPDECK_BRACKET_ID) {
    try {
      await fetchPublicPData(TOPDECK_BRACKET_ID);
    } catch {
      // warm-up is best-effort
    }
  }

  const refreshedAt = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  await logActivity(
    "sync",
    "topdeck_cache",
    "all",
    { refreshed_at: refreshedAt },
    user.discordId || user.id || "unknown",
    user.username || user.name || "unknown"
  );

  return NextResponse.json({ data: { refreshed_at: refreshedAt } });
}
