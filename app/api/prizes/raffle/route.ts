import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getRaffleResults, deleteRaffleResult } from "@/lib/raffle";
import { getCurrentMonth } from "@/lib/utils";

export const GET = withAuthRead(async (request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || getCurrentMonth();
  const results = await getRaffleResults(month);
  return NextResponse.json({ data: results });
}, "prizes/raffle:GET");

export const DELETE = withAuth(async (session, request) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }
  const prizeId = searchParams.get("prize_id") || undefined;

  const userId = session!.user!.id!;
  const userName = getUserName(session!);
  await deleteRaffleResult(month, userId, userName, prizeId);
  return NextResponse.json({ data: { deleted: true } });
}, "prizes/raffle:DELETE");
