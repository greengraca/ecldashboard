import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { clearMemberCache, fetchGuildMembers } from "@/lib/discord";

export const POST = withAuth(async (_session, _request) => {
  clearMemberCache();
  const members = await fetchGuildMembers();

  return NextResponse.json({
    data: {
      message: "Discord member cache refreshed",
      member_count: members.length,
    },
  });
}, "subscribers/sync:POST");
