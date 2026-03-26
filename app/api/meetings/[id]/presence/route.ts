import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { setPresence } from "@/lib/meetings";

export const POST = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const userId = session.user!.id!;
  const { present } = await request.json();

  const meeting = await setPresence(id, userId, !!present);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  return NextResponse.json({ data: meeting });
}, "meetings/[id]/presence:POST");
