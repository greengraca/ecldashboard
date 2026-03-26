import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getSubscriptionIncomeBreakdown } from "@/lib/subscription-income";

export const GET = withAuthRead(async (request) => {
  const month = request.nextUrl.searchParams.get("month");
  if (!month) {
    return NextResponse.json(
      { error: "Missing month parameter" },
      { status: 400 }
    );
  }

  const breakdown = await getSubscriptionIncomeBreakdown(month);
  return NextResponse.json({ data: breakdown });
}, "finance/subscription-income/breakdown:GET");
