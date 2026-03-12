import { NextResponse } from "next/server";
import { clearMemberCache, fetchGuildMembers } from "@/lib/discord";

export async function POST() {
  try {
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
    return NextResponse.json(
      { error: "Failed to sync Discord members" },
      { status: 500 }
    );
  }
}
