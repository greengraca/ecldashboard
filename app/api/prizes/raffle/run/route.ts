import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { saveRaffleResult } from "@/lib/raffle";
import { getCurrentMonth } from "@/lib/utils";

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const { month: bodyMonth, candidates, exclude_finalists, winner_uid, winner_name, prize_id } = body;
  const month = bodyMonth || getCurrentMonth();

  if (!candidates || !winner_uid || !winner_name) {
    return NextResponse.json({ error: "candidates, winner_uid, and winner_name are required" }, { status: 400 });
  }

  const userId = session!.user!.id!;
  const userName = getUserName(session!);
  const result = await saveRaffleResult(month, {
    candidates,
    exclude_finalists: exclude_finalists !== false,
    winner_uid,
    winner_name,
    prize_id: prize_id || null,
  }, userId, userName);

  return NextResponse.json({ data: result });
}, "prizes/raffle/run:POST");
