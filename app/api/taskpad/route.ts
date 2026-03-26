import { NextResponse } from "next/server";
import { withAuth, withAuthRead } from "@/lib/api-helpers";
import { getUserName } from "@/lib/auth";
import { getTeamTasks, createTask } from "@/lib/taskpad";

export const GET = withAuthRead(async () => {
  const tasks = await getTeamTasks();
  return NextResponse.json({ data: tasks });
}, "taskpad:GET");

export const POST = withAuth(async (session, request) => {
  const body = await request.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json(
      { error: "Task text is required" },
      { status: 400 }
    );
  }

  const userId = session.user!.id!;
  const userName = getUserName(session);

  const meetingInfo =
    body.meeting_id && body.meeting_number
      ? {
          meeting_id: String(body.meeting_id),
          meeting_number: Number(body.meeting_number),
        }
      : undefined;

  const task = await createTask({ text }, userId, userName, meetingInfo);
  return NextResponse.json({ data: task }, { status: 201 });
}, "taskpad:POST");
