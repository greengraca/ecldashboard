import { NextRequest, NextResponse } from "next/server";
import { withAuthReadParams } from "@/lib/api-helpers";
import { getPlayerDetail } from "@/lib/players";

export const GET = withAuthReadParams<{ uid: string }>(async (_request, { uid }) => {
  const player = await getPlayerDetail(uid);

  if (!player) {
    return NextResponse.json(
      { error: "Player not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: player });
}, "players/[uid]:GET");
