import { NextRequest, NextResponse } from "next/server";
import { getPlayerDetail } from "@/lib/players";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    const player = await getPlayerDetail(uid);

    if (!player) {
      return NextResponse.json(
        { error: "Player not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: player });
  } catch (err) {
    console.error("GET /api/players/[uid] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch player detail" },
      { status: 500 }
    );
  }
}
