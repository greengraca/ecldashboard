import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";
import { getGroupSummary } from "@/lib/finance";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthWithRateLimit(request);
    if (error) return error;
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month =
      searchParams.get("month") ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const summary = await getGroupSummary(month);
    return NextResponse.json({ data: summary });
  } catch (err) {
    console.error("GET /api/finance/group-summary error:", err);
    logApiError("finance/group-summary:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch group summary" },
      { status: 500 }
    );
  }
}
