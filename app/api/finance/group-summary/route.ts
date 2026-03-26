import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getGroupSummary } from "@/lib/finance";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const summary = await getGroupSummary(month);
  return NextResponse.json({ data: summary });
}, "finance/group-summary:GET");
