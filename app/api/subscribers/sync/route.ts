import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { clearMemberCache, fetchGuildMembers } from "@/lib/discord";
import { detectSubscriberChanges } from "@/lib/subscribers";

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const POST = withAuth(async (session, request) => {
  clearMemberCache();
  const members = await fetchGuildMembers();

  // Detect subscriber changes (current month vs previous month)
  const url = new URL(request.url);
  const month = url.searchParams.get("month") || getCurrentMonth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (session.user as any)?.discordId || session.user?.id || "unknown";
  const userName = getUserName(session);

  const changes = await detectSubscriberChanges(month, userId, userName);

  return NextResponse.json({
    data: {
      message: "Discord member cache refreshed",
      member_count: members.length,
      changes: changes.alreadyLogged
        ? { already_detected: true }
        : {
            joined: changes.joined.length,
            left: changes.left.length,
            joined_names: changes.joined.map((m) => m.name),
            left_names: changes.left.map((m) => m.name),
          },
    },
  });
}, "subscribers/sync:POST");
