import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { setPresence } from "@/lib/meetings";

export const POST = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);
  const { present } = await request.json();

  const meeting = await setPresence(id, userId, userName, !!present);
  if (!meeting) {
    // Meeting was auto-deleted (empty room, no notes) or not found
    return NextResponse.json({ data: null });
  }
  return NextResponse.json({ data: meeting });
}, "meetings/[id]/presence:POST");
