import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithRateLimit } from "@/lib/api-auth";
import { logApiError } from "@/lib/error-log";
import { getSubscriptionIncomeBreakdown } from "@/lib/subscription-income";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthWithRateLimit(request);
    if (error) return error;
    const month = request.nextUrl.searchParams.get("month");
    if (!month) {
      return NextResponse.json(
        { error: "Missing month parameter" },
        { status: 400 }
      );
    }

    const breakdown = await getSubscriptionIncomeBreakdown(month);
    return NextResponse.json({ data: breakdown });
  } catch (err) {
    console.error("GET /api/finance/subscription-income/breakdown error:", err);
    logApiError("finance/subscription-income/breakdown:GET", err);
    return NextResponse.json(
      { error: "Failed to fetch subscription income breakdown" },
      { status: 500 }
    );
  }
}
