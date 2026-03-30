import { NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getRaffleCandidates } from "@/lib/raffle";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const excludeFinalists = searchParams.get("exclude_finalists") !== "false";
  const candidates = await getRaffleCandidates(month, excludeFinalists);
  return NextResponse.json({ data: candidates });
}, "prizes/raffle/candidates:GET");
