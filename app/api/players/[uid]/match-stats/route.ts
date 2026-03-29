import { NextResponse } from "next/server";
import { withAuthReadParams } from "@/lib/api-helpers";
import { getPlayerMatchStats } from "@/lib/player-match-stats";

export const GET = withAuthReadParams<{ uid: string }>(
  async (_request, { uid }) => {
    const stats = await getPlayerMatchStats(uid);

    if (!stats) {
      return NextResponse.json(
        { error: "Player not found in current bracket" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: stats });
  },
  "players/[uid]/match-stats:GET"
);
