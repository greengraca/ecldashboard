import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getSubscribers, getSubscriberSummary, detectSubscriberChanges } from "@/lib/subscribers";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const [subscribers, summary] = await Promise.all([
    getSubscribers(month),
    getSubscriberSummary(month),
  ]);

  // Auto-detect paid member changes (dedup ensures each member is only logged once)
  detectSubscriberChanges(month, "system", "System").catch(() => {});

  return NextResponse.json({ data: { subscribers, summary, month } });
}, "subscribers:GET");
