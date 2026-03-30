import { NextResponse } from "next/server";
import { withAuthReadParams } from "@/lib/api-helpers";
import { getPlayerAddress } from "@/lib/player-addresses";

export const GET = withAuthReadParams<{ uid: string }>(async (_request, { uid }) => {
  const address = await getPlayerAddress(uid);
  return NextResponse.json({ data: address });
}, "players/addresses/[uid]:GET");
