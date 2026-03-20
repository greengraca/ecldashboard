import { NextRequest, NextResponse } from "next/server";
import { fetchGuildMembers } from "@/lib/discord";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthWithRateLimit(request);
    if (error) return error;
    const members = await fetchGuildMembers();
    return NextResponse.json({ data: members });
  } catch (err) {
    console.error("GET /api/discord/members error:", err);
    logApiError("discord/members:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch Discord members" },
      { status: 500 }
    );
  }
}
