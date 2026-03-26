import { NextResponse } from "next/server";
import { withAuthParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { joinMeeting } from "@/lib/meetings";

export const POST = withAuthParams<{ id: string }>(async (session, _request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  const meeting = await joinMeeting(id, userId, userName);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  return NextResponse.json({ data: meeting });
}, "meetings/[id]/join:POST");
