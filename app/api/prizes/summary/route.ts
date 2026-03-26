import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getPrizeSummary } from "@/lib/prizes";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const summary = await getPrizeSummary(month);
  return NextResponse.json({ data: summary });
}, "prizes/summary:GET");
