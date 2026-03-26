import { NextRequest, NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { claimTreasurePod, unclaimTreasurePod } from "@/lib/treasure-pods";

export const POST = withAuthParams<{ podId: string }>(async (session, request, { podId }) => {
  const body = await request.json();
  const userId = session.user!.id!;
  const userName = getUserName(session);

  const claim = await claimTreasurePod(podId, body, userId, userName);
  return NextResponse.json({ data: claim });
}, "prizes/treasure-pods/[podId]/claim:POST");

export const DELETE = withAuthParams<{ podId: string }>(async (session, _request, { podId }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  await unclaimTreasurePod(podId, userId, userName);
  return NextResponse.json({ data: { ok: true } });
}, "prizes/treasure-pods/[podId]/claim:DELETE");
