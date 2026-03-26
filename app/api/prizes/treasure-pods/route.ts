import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getTreasurePodData } from "@/lib/treasure-pods";

export const GET = withAuthRead(async (request) => {
  const month = request.nextUrl.searchParams.get("month");
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const data = await getTreasurePodData(month);
  return NextResponse.json({ data });
}, "prizes/treasure-pods:GET");
