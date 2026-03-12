import { NextRequest, NextResponse } from "next/server";
import { getPlayers } from "@/lib/players";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;

    const { players, bracket_id } = await getPlayers(month);

    return NextResponse.json({ data: { players, month: month || null, bracket_id } });
  } catch (err) {
    console.error("GET /api/players error:", err);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}
