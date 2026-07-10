import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getDistributionLedger } from "@/lib/distributions";

export const GET = withAuthRead(async () => {
  const ledger = await getDistributionLedger();
  return NextResponse.json({ data: ledger });
}, "finance/distributions:GET");
