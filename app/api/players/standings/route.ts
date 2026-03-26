import { NextRequest, NextResponse } from "next/server";
import { withAuthRead } from "@/lib/api-helpers";
import { getStandings } from "@/lib/players";

export const GET = withAuthRead(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || undefined;

  const { standings, resolvedMonth, totalPlayers } = await getStandings(month);

  return NextResponse.json({ data: { standings, month: resolvedMonth, totalPlayers } });
}, "players/standings:GET");
