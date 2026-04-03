import { NextResponse } from "next/server";
import { getUserName } from "@/lib/auth";
import { withAuth } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";
import { TOPDECK_BRACKET_ID } from "@/lib/constants";
import {
  clearAllTopDeckCaches,
  fetchPublicPData,
  canManualRefresh,
  recordManualRefresh,
  getTopDeckCacheStatus,
} from "@/lib/topdeck-cache";
import type { Session } from "next-auth";

export const POST = withAuth(async (session: Session) => {
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
  logActivity(
    "sync",
    "topdeck_cache",
    "all",
    { refreshed_at: refreshedAt },
    user.discordId || user.id || "unknown",
    getUserName(session)
  );

  return NextResponse.json({ data: { refreshed_at: refreshedAt } });
}, "topdeck/refresh:POST");
