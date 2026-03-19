import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getMonthlySummary, getMultiMonthSummary } from "@/lib/finance";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuth();
    if (error) return error;
    const { searchParams } = new URL(request.url);
    const months = searchParams.get("months");
    const month = searchParams.get("month");

    if (months) {
      const monthList = months.split(",").map((m) => m.trim());
      const summaries = await getMultiMonthSummary(monthList);
      return NextResponse.json({ data: summaries });
    }

    const now = new Date();
    const targetMonth =
      month ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const summary = await getMonthlySummary(targetMonth);
    return NextResponse.json({ data: summary });
  } catch (err) {
    console.error("GET /api/finance/summary error:", err);
    return NextResponse.json(
      { error: "Failed to fetch summary" },
      { status: 500 }
    );
  }
}
