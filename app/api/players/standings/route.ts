import { NextRequest, NextResponse } from "next/server";
import { getStandings } from "@/lib/players";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") || undefined;

    const standings = await getStandings(month);

    return NextResponse.json({ data: { standings, month: month || null } });
  } catch (err) {
    console.error("GET /api/players/standings error:", err);
    return NextResponse.json(
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}
