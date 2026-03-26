import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getActiveMeeting, getMeetings, startMeeting } from "@/lib/meetings";

export const GET = withAuthRead(async () => {
  const [active, history] = await Promise.all([
    getActiveMeeting(),
    getMeetings(),
  ]);
  return NextResponse.json({ data: { active, history } });
}, "meetings:GET");

export const POST = withAuth(async (session) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);

  try {
    const meeting = await startMeeting(userId, userName);
    return NextResponse.json({ data: meeting }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already active")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}, "meetings:POST");
