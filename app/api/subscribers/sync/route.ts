import { NextRequest, NextResponse } from "next/server";
import { clearMemberCache, fetchGuildMembers } from "@/lib/discord";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";

export async function POST(request: NextRequest) {
  try {
    const { error } = await requireAuthWithRateLimit(request);
    if (error) return error;
    clearMemberCache();
    const members = await fetchGuildMembers();

    return NextResponse.json({
      data: {
        message: "Discord member cache refreshed",
        member_count: members.length,
      },
    });
  } catch (err) {
    console.error("POST /api/subscribers/sync error:", err);
    logApiError("subscribers/sync:POST", err);
    return NextResponse.json(
      { error: "Failed to sync Discord members" },
      { status: 500 }
    );
  }
}
