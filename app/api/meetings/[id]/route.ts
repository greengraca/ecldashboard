import { NextResponse } from "next/server";
import { withAuthParams, withAuthReadParams } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getMeetingById, endMeeting, updateMeeting } from "@/lib/meetings";

export const GET = withAuthReadParams<{ id: string }>(async (_req, { id }) => {
  const meeting = await getMeetingById(id);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  return NextResponse.json({ data: meeting });
}, "meetings/[id]:GET");

export const PATCH = withAuthParams<{ id: string }>(async (session, request, { id }) => {
  const userId = session.user!.id!;
  const userName = getUserName(session);
  const body = await request.json();

  if (body.status === "ended") {
    const meeting = await endMeeting(id, userId, userName);
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }
    return NextResponse.json({ data: meeting });
  }

  // Title update
  const updateData: { title?: string } = {};
  if (typeof body.title === "string" && body.title.trim()) {
    updateData.title = body.title.trim();
  }

  const meeting = await updateMeeting(id, updateData, userId, userName);
  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }
  return NextResponse.json({ data: meeting });
}, "meetings/[id]:PATCH");
