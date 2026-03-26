import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getSubscribers, getSubscriberSummary } from "@/lib/subscribers";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const [subscribers, summary] = await Promise.all([
    getSubscribers(month),
    getSubscriberSummary(month),
  ]);

  return NextResponse.json({ data: { subscribers, summary, month } });
}, "subscribers:GET");
