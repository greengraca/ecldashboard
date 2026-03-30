import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getRaffleResult } from "@/lib/raffle";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const result = await getRaffleResult(month);
  return NextResponse.json({ data: result });
}, "prizes/raffle:GET");
