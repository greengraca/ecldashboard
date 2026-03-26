import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getManualPayments } from "@/lib/manual-payments";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();

  const payments = await getManualPayments(month);
  return NextResponse.json({ data: payments });
}, "subscribers/manual-payments:GET");
