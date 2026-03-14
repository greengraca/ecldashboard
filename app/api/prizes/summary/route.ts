import { NextRequest, NextResponse } from "next/server";
import { getPrizeSummary } from "@/lib/prizes";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const summary = await getPrizeSummary(month);
    return NextResponse.json({ data: summary });
  } catch (err) {
    console.error("GET /api/prizes/summary error:", err);
    return NextResponse.json(
      { error: "Failed to fetch prize summary" },
      { status: 500 }
    );
  }
}
