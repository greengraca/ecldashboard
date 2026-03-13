import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionIncomeBreakdown } from "@/lib/subscription-income";

export async function GET(request: NextRequest) {
  try {
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
    return NextResponse.json(
      { error: "Failed to fetch subscription income breakdown" },
      { status: 500 }
    );
  }
}
