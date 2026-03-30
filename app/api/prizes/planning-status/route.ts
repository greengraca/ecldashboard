import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getPlanningStatus } from "@/lib/planning-status";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const status = await getPlanningStatus(month);
  return NextResponse.json({ data: status });
}, "prizes/planning-status:GET");
