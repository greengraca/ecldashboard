import { NextResponse } from "next/server";
import { fetchGuildMembers } from "@/lib/discord";

export async function GET() {
  try {
    const members = await fetchGuildMembers();
    return NextResponse.json({ data: members });
  } catch (err) {
    console.error("GET /api/discord/members error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Discord members" },
      { status: 500 }
    );
  }
}
