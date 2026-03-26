import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getMonthlySummary, getMultiMonthSummary } from "@/lib/finance";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const months = searchParams.get("months");
  const month = searchParams.get("month");

  if (months) {
    const monthList = months.split(",").map((m) => m.trim());
    const summaries = await getMultiMonthSummary(monthList);
    return NextResponse.json({ data: summaries });
  }

  const targetMonth = month || getCurrentMonth();

  const summary = await getMonthlySummary(targetMonth);
  return NextResponse.json({ data: summary });
}, "finance/summary:GET");
