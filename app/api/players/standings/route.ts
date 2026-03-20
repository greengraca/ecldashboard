import { NextRequest, NextResponse } from "next/server";
import { logApiError } from "@/lib/error-log";
import { getStandings } from "@/lib/players";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;

    const { standings, resolvedMonth, totalPlayers } = await getStandings(month);

    return NextResponse.json({ data: { standings, month: resolvedMonth, totalPlayers } });
  } catch (err) {
    console.error("GET /api/players/standings error:", err);
    logApiError("players/standings:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}
